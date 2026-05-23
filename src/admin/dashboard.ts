import { Hono } from "hono";
import { query } from "../db.js";
import { html, raw, layout } from "../render.js";
import { sparkline, bars } from "./charts.js";

const ADMIN_STYLES = `
<style>
  body.admin {
    background: #0d0a08; color: #e8d8be; font-family: ui-monospace,"SF Mono",Menlo,monospace;
    margin: 0; padding: 2rem; min-height: 100vh; overflow: auto !important; display:block !important;
  }
  body.admin::before, body.admin::after { display:none !important; }
  body.admin h1 { font-family: "Cormorant Garamond","EB Garamond",Georgia,serif; font-weight: 400; font-size: 1.8rem; letter-spacing: 0.02em; margin: 0 0 0.4rem; color: #f3e2c4; }
  body.admin h2 { font-family: ui-monospace,monospace; font-weight:500; font-size: 0.7rem; letter-spacing: 0.32em; text-transform: uppercase; color: #a89074; margin: 1.5rem 0 0.8rem; }
  body.admin .muted { color: #6c5a45; }
  body.admin .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; }
  body.admin .card { background: #15110d; border: 1px solid #2a2118; border-radius: 6px; padding: 1.2rem 1.4rem; }
  body.admin .stat-num { font-family: "Cormorant Garamond",serif; font-size: 2.4rem; font-weight: 400; color: #f3e2c4; line-height: 1; }
  body.admin .stat-label { font-size: 0.68rem; letter-spacing: 0.28em; text-transform: uppercase; color: #6c5a45; margin-top: 0.4rem; }
  body.admin a { color: #f4a261; }
  body.admin table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
  body.admin th { text-align: left; font-weight: 500; color: #a89074; font-size: 0.65rem; letter-spacing: 0.2em; text-transform: uppercase; padding: 0.4rem 0.6rem; border-bottom: 1px solid #2a2118; }
  body.admin td { padding: 0.5rem 0.6rem; border-bottom: 1px solid #1c1610; }
  body.admin .bars { display: flex; flex-direction: column; gap: 0.4rem; }
  body.admin .bar-row { display: grid; grid-template-columns: 9rem 1fr 4rem; gap: 0.7rem; align-items: center; font-size: 0.85rem; }
  body.admin .bar-label { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #d9c9b4; }
  body.admin .bar-track { height: 6px; background: #1c1610; border-radius: 3px; overflow: hidden; }
  body.admin .bar-fill { display: block; height: 100%; }
  body.admin .bar-value { text-align: right; color: #f3e2c4; font-variant-numeric: tabular-nums; }
  body.admin nav { margin-bottom: 1.5rem; display: flex; gap: 1.4rem; font-size: 0.7rem; letter-spacing: 0.28em; text-transform: uppercase; }
  body.admin nav a { text-decoration: none; color: #a89074; }
  body.admin nav a.active { color: #f4a261; }
</style>
`;

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

    const [sessionsByDay, totals, topApps, topMethods, recent] = await Promise.all([
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
         FROM events
         ORDER BY id DESC LIMIT 20`
      ),
    ]);

    // Fill missing days with 0
    const buckets = new Map<string, number>();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - i);
      buckets.set(d.toISOString().slice(0, 10), 0);
    }
    for (const r of sessionsByDay.rows) buckets.set(r.d, Number(r.n));
    const trend = Array.from(buckets.values());

    const t = totals.rows[0] ?? { sessions: "0", views: "0", discoveries: "0", events: "0" };

    const body = html`
      <nav>
        <a href="/" class="active">Overview</a>
        <a href="/apps">Apps</a>
        <a href="/experiments">Experiments</a>
        <a href="/api/summary.json">JSON</a>
      </nav>
      <h1>Ignir admin</h1>
      <p class="muted">Last ${days} days</p>

      <h2>Sessions per day</h2>
      <div class="card">
        ${raw(sparkline(trend, { width: 720, height: 80 }))}
      </div>

      <h2>Totals</h2>
      <div class="grid">
        <div class="card">
          <div class="stat-num">${Number(t.sessions).toLocaleString()}</div>
          <div class="stat-label">sessions</div>
        </div>
        <div class="card">
          <div class="stat-num">${Number(t.views).toLocaleString()}</div>
          <div class="stat-label">app views</div>
        </div>
        <div class="card">
          <div class="stat-num">${Number(t.discoveries).toLocaleString()}</div>
          <div class="stat-label">discoveries</div>
        </div>
        <div class="card">
          <div class="stat-num">${Number(t.events).toLocaleString()}</div>
          <div class="stat-label">events</div>
        </div>
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
                      <td>${escapeHtmlLocal(r.name)}</td>
                      <td>${escapeHtmlLocal(r.app_slug ?? "—")}</td>
                      <td class="muted">${escapeHtmlLocal(r.session_id.slice(0, 8))}…</td>
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

function escapeHtmlLocal(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
