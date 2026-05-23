import { Hono } from "hono";
import { query } from "../db.js";
import { html, raw, layout } from "../render.js";
import { sparkline, bars } from "./charts.js";
import { ADMIN_NAV, ADMIN_STYLES, escAdmin } from "./common.js";

const APP_SLUGS = ["whisper", "cartographer", "lantern", "names", "oracle", "mirror", "stone"] as const;
const APP_NAMES: Record<string, string> = {
  whisper: "The Whisper Gallery",
  cartographer: "The Cartographer's Hand",
  lantern: "The Lantern",
  names: "The Lock of Many Names",
  oracle: "The Ash Oracle",
  mirror: "The Mirror Door",
  stone: "The Patient Stone",
};

// Two-proportion z-test for "fraction of sessions with interactions >= k"
// Very rough confidence label: |z| >= 1.96 ≈ p<0.05.
function zHint(aSuc: number, aN: number, bSuc: number, bN: number): { z: number; hint: string } {
  if (aN === 0 || bN === 0) return { z: 0, hint: "more data needed" };
  const p1 = aSuc / aN;
  const p2 = bSuc / bN;
  const p = (aSuc + bSuc) / (aN + bN);
  const denom = Math.sqrt(p * (1 - p) * (1 / aN + 1 / bN));
  if (denom === 0) return { z: 0, hint: "no variance" };
  const z = (p1 - p2) / denom;
  const abs = Math.abs(z);
  if (abs >= 2.58) return { z, hint: `confident (|z|=${abs.toFixed(2)})` };
  if (abs >= 1.96) return { z, hint: `tentative (|z|=${abs.toFixed(2)})` };
  return { z, hint: `inconclusive (|z|=${abs.toFixed(2)})` };
}

export function appDetailRouter(): Hono {
  const app = new Hono();

  // index — list all apps
  app.get("/apps", async (c) => {
    const { rows: counts } = await query<{ app_slug: string; visits: string; uniques: string }>(
      `SELECT app_slug, COUNT(*)::text AS visits, COUNT(DISTINCT session_id)::text AS uniques
       FROM app_views
       WHERE started_at > now() - INTERVAL '7 days'
       GROUP BY 1`
    );
    const byApp = new Map(counts.map((c) => [c.app_slug, c]));

    const body = html`
      ${raw(ADMIN_NAV("apps"))}
      <h1>Apps</h1>
      <p class="muted">Per-app deep dive. Last 7 days.</p>
      <div class="apps-list">
        ${raw(
          APP_SLUGS.map((slug) => {
            const c = byApp.get(slug);
            const visits = c ? Number(c.visits) : 0;
            const uniques = c ? Number(c.uniques) : 0;
            return `<div class="app-card">
              <a href="/apps/${slug}">
                <h3>${escAdmin(APP_NAMES[slug] ?? slug)}</h3>
                <p class="meta">${visits.toLocaleString()} visits · ${uniques.toLocaleString()} uniques</p>
              </a>
            </div>`;
          }).join("")
        )}
      </div>
    `;
    return c.html(layout("Apps · Ignir admin", body, { bodyClass: "admin", extraHead: ADMIN_STYLES }));
  });

  // per-app detail
  app.get("/apps/:slug", async (c) => {
    const slug = c.req.param("slug");
    if (!(APP_SLUGS as readonly string[]).includes(slug)) {
      return c.notFound();
    }

    const days = 7;

    const [visitsByDay, totals, methods, variants, recentEvents] = await Promise.all([
      query<{ d: string; n: string }>(
        `SELECT to_char(date_trunc('day', started_at), 'YYYY-MM-DD') AS d, COUNT(*)::text AS n
         FROM app_views
         WHERE app_slug = $1 AND started_at > now() - ($2::int || ' days')::interval
         GROUP BY 1 ORDER BY 1`,
        [slug, days]
      ),
      query<{ visits: string; uniques: string; avg_ms: string | null; avg_interactions: string | null }>(
        `SELECT COUNT(*)::text AS visits, COUNT(DISTINCT session_id)::text AS uniques,
                AVG(duration_ms) FILTER (WHERE duration_ms IS NOT NULL)::text AS avg_ms,
                AVG(interactions)::text AS avg_interactions
         FROM app_views
         WHERE app_slug = $1 AND started_at > now() - ($2::int || ' days')::interval`,
        [slug, days]
      ),
      query<{ method: string; finds: string }>(
        `SELECT method, COUNT(*)::text AS finds
         FROM discoveries
         WHERE app_slug = $1 AND created_at > now() - ($2::int || ' days')::interval
         GROUP BY 1 ORDER BY COUNT(*) DESC`,
        [slug, days]
      ),
      query<{
        variant: string;
        visits: string;
        uniques: string;
        avg_ms: string | null;
        avg_interactions: string | null;
        engaged: string;
      }>(
        `SELECT variant,
                COUNT(*)::text AS visits,
                COUNT(DISTINCT session_id)::text AS uniques,
                AVG(duration_ms) FILTER (WHERE duration_ms IS NOT NULL)::text AS avg_ms,
                AVG(interactions)::text AS avg_interactions,
                SUM(CASE WHEN interactions >= 3 THEN 1 ELSE 0 END)::text AS engaged
         FROM app_views
         WHERE app_slug = $1 AND started_at > now() - ($2::int || ' days')::interval
         GROUP BY variant ORDER BY variant`,
        [slug, days]
      ),
      query<{ created_at: string; name: string; variant: string | null; session_id: string }>(
        `SELECT to_char(created_at, 'HH24:MI:SS') AS created_at, name, variant, session_id
         FROM events
         WHERE app_slug = $1
         ORDER BY id DESC LIMIT 30`,
        [slug]
      ),
    ]);

    const dayBuckets = new Map<string, number>();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - i);
      dayBuckets.set(d.toISOString().slice(0, 10), 0);
    }
    for (const r of visitsByDay.rows) dayBuckets.set(r.d, Number(r.n));
    const trend = Array.from(dayBuckets.values());

    const t = totals.rows[0] ?? { visits: "0", uniques: "0", avg_ms: null, avg_interactions: null };
    const avgMs = t.avg_ms ? Math.round(Number(t.avg_ms)) : null;

    // z-test for variant A vs B if present
    let abLine = "";
    if (variants.rows.length >= 2) {
      const A = variants.rows.find((v) => v.variant === "A");
      const B = variants.rows.find((v) => v.variant === "B");
      if (A && B) {
        const h = zHint(Number(A.engaged), Number(A.visits), Number(B.engaged), Number(B.visits));
        abLine = `<p class="muted">A/B (engaged ≥ 3 interactions): ${escAdmin(h.hint)}</p>`;
      }
    }

    const variantRows = variants.rows
      .map(
        (v) => `<tr>
          <td><strong>${escAdmin(v.variant)}</strong></td>
          <td>${Number(v.visits).toLocaleString()}</td>
          <td>${Number(v.uniques).toLocaleString()}</td>
          <td>${v.avg_ms ? (Number(v.avg_ms) / 1000).toFixed(1) + " s" : "—"}</td>
          <td>${Number(v.avg_interactions ?? 0).toFixed(2)}</td>
          <td>${Number(v.engaged).toLocaleString()}</td>
        </tr>`
      )
      .join("");

    const body = html`
      ${raw(ADMIN_NAV("apps"))}
      <h1>${APP_NAMES[slug] ?? slug}</h1>
      <p class="muted">${slug} · last ${days} days · <a href="/m/${slug}">visit chamber</a></p>

      <h2>Visits per day</h2>
      <div class="card">${raw(sparkline(trend, { width: 720, height: 80 }))}</div>

      <h2>Totals</h2>
      <div class="grid">
        <div class="card"><div class="stat-num">${Number(t.visits).toLocaleString()}</div><div class="stat-label">visits</div></div>
        <div class="card"><div class="stat-num">${Number(t.uniques).toLocaleString()}</div><div class="stat-label">uniques</div></div>
        <div class="card"><div class="stat-num">${avgMs == null ? "—" : (avgMs / 1000).toFixed(1) + " s"}</div><div class="stat-label">avg duration</div></div>
        <div class="card"><div class="stat-num">${Number(t.avg_interactions ?? 0).toFixed(1)}</div><div class="stat-label">avg interactions</div></div>
      </div>

      <h2>Variant comparison</h2>
      <div class="card">
        ${variants.rows.length === 0
          ? raw('<p class="muted">no variants yet (no experiment active)</p>')
          : raw(`<table>
              <thead><tr><th>variant</th><th>visits</th><th>uniques</th><th>avg duration</th><th>avg interactions</th><th>engaged (≥3)</th></tr></thead>
              <tbody>${variantRows}</tbody>
            </table>`)}
        ${raw(abLine)}
      </div>

      <h2>Discovery methods</h2>
      <div class="card">
        ${raw(
          bars(
            methods.rows.map((r) => ({ label: r.method, value: Number(r.finds) }))
          )
        )}
      </div>

      <h2>Recent events</h2>
      <div class="card">
        ${recentEvents.rows.length === 0
          ? raw('<p class="muted">no events yet</p>')
          : raw(`<table>
              <thead><tr><th>time</th><th>event</th><th>variant</th><th>session</th></tr></thead>
              <tbody>
                ${recentEvents.rows
                  .map(
                    (r) => `<tr>
                      <td class="muted">${r.created_at}</td>
                      <td>${escAdmin(r.name)}</td>
                      <td>${escAdmin(r.variant ?? "—")}</td>
                      <td class="muted">${escAdmin(r.session_id.slice(0, 8))}…</td>
                    </tr>`
                  )
                  .join("")}
              </tbody>
            </table>`)}
      </div>
    `;

    return c.html(
      layout(`${APP_NAMES[slug]} · Ignir admin`, body, {
        bodyClass: "admin",
        extraHead: ADMIN_STYLES,
      })
    );
  });

  return app;
}
