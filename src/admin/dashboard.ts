import { Hono } from "hono";
import { query } from "../db.js";
import { html, raw, layout } from "../render.js";
import { sparkline, bars } from "./charts.js";
import { ADMIN_NAV, ADMIN_STYLES, escAdmin } from "./common.js";

function fmtMs(ms: number | null): string {
  if (ms == null || ms === 0) return "—";
  if (ms < 1000) return `${ms} ms`;
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  const rs = s % 60;
  return `${m}m ${rs}s`;
}

export function dashboardRouter(): Hono {
  const app = new Hono();

  app.get("/", async (c) => {
    const days = 7;

    const [sessionsByDay, totals, topApps, topMethods, recent, llmTotal] = await Promise.all([
      query<{ d: string; n: string }>(
        `SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS d, COUNT(*)::text AS n
         FROM sessions
         WHERE created_at > now() - ($1::int || ' days')::interval
         GROUP BY 1 ORDER BY 1`,
        [days]
      ),
      query<{ sessions: string; views: string; discoveries: string; events: string }>(
        `SELECT
           (SELECT COUNT(*)::text FROM sessions WHERE created_at > now() - ($1::int || ' days')::interval) AS sessions,
           (SELECT COUNT(*)::text FROM app_views WHERE started_at > now() - ($1::int || ' days')::interval) AS views,
           (SELECT COUNT(*)::text FROM discoveries WHERE created_at > now() - ($1::int || ' days')::interval) AS discoveries,
           (SELECT COUNT(*)::text FROM events WHERE created_at > now() - ($1::int || ' days')::interval) AS events`,
        [days]
      ),
      query<{ app_slug: string; visits: string; avg_ms: string | null; avg_interactions: string | null }>(
        `SELECT app_slug,
                COUNT(*)::text AS visits,
                AVG(duration_ms) FILTER (WHERE duration_ms IS NOT NULL)::text AS avg_ms,
                AVG(interactions)::text AS avg_interactions
         FROM app_views
         WHERE started_at > now() - ($1::int || ' days')::interval
         GROUP BY 1
         ORDER BY COUNT(*) DESC
         LIMIT 10`,
        [days]
      ),
      query<{ app_slug: string; method: string; finds: string }>(
        `SELECT app_slug, method, COUNT(*)::text AS finds
         FROM discoveries
         WHERE created_at > now() - ($1::int || ' days')::interval
         GROUP BY 1, 2
         ORDER BY COUNT(*) DESC
         LIMIT 10`,
        [days]
      ),
      query<{ created_at: string; name: string; app_slug: string | null; session_id: string }>(
        `SELECT to_char(created_at, 'HH24:MI:SS') AS created_at, name, app_slug, session_id
         FROM events ORDER BY id DESC LIMIT 20`
      ),
      query<{ s: string }>(
        `SELECT COALESCE(SUM(cost_usd), 0)::text AS s FROM llm_calls
         WHERE created_at > now() - INTERVAL '24 hours'`
      ),
    ]);

    const buckets = new Map<string, number>();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - i);
      buckets.set(d.toISOString().slice(0, 10), 0);
    }
    for (const r of sessionsByDay.rows) buckets.set(r.d, Number(r.n));
    const trend = Array.from(buckets.values());

    const t = totals.rows[0] ?? { sessions: "0", views: "0", discoveries: "0", events: "0" };
    const spend = Number(llmTotal.rows[0]?.s ?? 0);

    const body = html`
      ${raw(ADMIN_NAV("overview"))}
      <h1>Ignir admin</h1>
      <p class="muted">Last ${days} days</p>

      <h2>Sessions per day</h2>
      <div class="card">${raw(sparkline(trend, { width: 720, height: 80 }))}</div>

      <h2>Totals</h2>
      <div class="grid">
        <div class="card"><div class="stat-num">${Number(t.sessions).toLocaleString()}</div><div class="stat-label">sessions</div></div>
        <div class="card"><div class="stat-num">${Number(t.views).toLocaleString()}</div><div class="stat-label">app views</div></div>
        <div class="card"><div class="stat-num">${Number(t.discoveries).toLocaleString()}</div><div class="stat-label">discoveries</div></div>
        <div class="card"><div class="stat-num">${Number(t.events).toLocaleString()}</div><div class="stat-label">events</div></div>
        <div class="card"><div class="stat-num">$${spend.toFixed(3)}</div><div class="stat-label">llm spend · 24h</div></div>
      </div>

      <h2>Top apps by visits</h2>
      <div class="card">
        ${raw(
          bars(
            topApps.rows.map((r) => ({
              label: `${r.app_slug} · ${fmtMs(r.avg_ms == null ? null : Math.round(Number(r.avg_ms)))} · ${Number(r.avg_interactions ?? 0).toFixed(1)}↻`,
              value: Number(r.visits),
            }))
          )
        )}
      </div>

      <h2>Discovery methods</h2>
      <div class="card">
        ${raw(
          bars(
            topMethods.rows.map((r) => ({
              label: `${r.app_slug} · ${r.method}`,
              value: Number(r.finds),
            }))
          )
        )}
      </div>

      <h2>Recent events</h2>
      <div class="card">
        ${recent.rows.length === 0
          ? raw('<p class="muted">no events yet</p>')
          : raw(`<table>
              <thead><tr><th>time</th><th>name</th><th>app</th><th>session</th></tr></thead>
              <tbody>
                ${recent.rows
                  .map(
                    (r) => `<tr>
                      <td class="muted">${r.created_at}</td>
                      <td>${escAdmin(r.name)}</td>
                      <td>${escAdmin(r.app_slug ?? "—")}</td>
                      <td class="muted">${escAdmin(r.session_id.slice(0, 8))}…</td>
                    </tr>`
                  )
                  .join("")}
              </tbody>
            </table>`)}
      </div>
    `;

    return c.html(layout("Ignir admin", body, { bodyClass: "admin", extraHead: ADMIN_STYLES }));
  });

  return app;
}
