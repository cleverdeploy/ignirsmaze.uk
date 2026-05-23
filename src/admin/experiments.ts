import { Hono } from "hono";
import { query } from "../db.js";
import { html, raw, layout } from "../render.js";
import { ADMIN_NAV, ADMIN_STYLES, escAdmin } from "./common.js";

type ExpRow = {
  slug: string;
  app_slug: string;
  variants: { name: string; weight: number }[];
  active: boolean;
  created_at: string;
  notes: string | null;
};

async function variantStats(appSlug: string, days = 7) {
  const { rows } = await query<{
    variant: string;
    visits: string;
    uniques: string;
    avg_ms: string | null;
    avg_interactions: string | null;
  }>(
    `SELECT variant, COUNT(*)::text AS visits, COUNT(DISTINCT session_id)::text AS uniques,
            AVG(duration_ms) FILTER (WHERE duration_ms IS NOT NULL)::text AS avg_ms,
            AVG(interactions)::text AS avg_interactions
     FROM app_views
     WHERE app_slug = $1 AND started_at > now() - ($2::int || ' days')::interval
     GROUP BY variant ORDER BY variant`,
    [appSlug, days]
  );
  return rows;
}

export function experimentsRouter(): Hono {
  const app = new Hono();

  app.get("/experiments", async (c) => {
    const { rows: exps } = await query<ExpRow>(
      `SELECT slug, app_slug, variants, active,
              to_char(created_at,'YYYY-MM-DD HH24:MI') AS created_at, notes
       FROM experiments ORDER BY active DESC, created_at DESC`
    );

    const statsByApp = new Map<string, any[]>();
    for (const e of exps) {
      if (!statsByApp.has(e.app_slug)) {
        statsByApp.set(e.app_slug, await variantStats(e.app_slug));
      }
    }

    const body = html`
      ${raw(ADMIN_NAV("experiments"))}
      <h1>Experiments</h1>
      <p class="muted">A/B variant assignments are sticky per session.</p>

      <h2>Active &amp; recent</h2>
      ${exps.length === 0
        ? raw('<p class="muted">no experiments yet — they\'re seeded via migration</p>')
        : raw(
            exps
              .map((e) => {
                const stats = statsByApp.get(e.app_slug) ?? [];
                const variants = (Array.isArray(e.variants) ? e.variants : []) as {
                  name: string;
                  weight: number;
                }[];
                const lines = variants
                  .map((v) => {
                    const s = stats.find((x) => x.variant === v.name);
                    const visits = s ? Number(s.visits) : 0;
                    const avg_ms = s && s.avg_ms ? Math.round(Number(s.avg_ms)) : null;
                    const avg_int = s ? Number(s.avg_interactions ?? 0) : 0;
                    return `<tr>
                      <td><strong>${escAdmin(v.name)}</strong></td>
                      <td>${v.weight}</td>
                      <td>${visits.toLocaleString()}</td>
                      <td>${avg_ms == null ? "—" : (avg_ms / 1000).toFixed(1) + " s"}</td>
                      <td>${avg_int.toFixed(1)}</td>
                    </tr>`;
                  })
                  .join("");
                return `<div class="card exp">
                  <div class="exp-head">
                    <div>
                      <h3>${escAdmin(e.slug)}</h3>
                      <p class="muted">${escAdmin(e.app_slug)} · ${e.active ? "active" : "stopped"} · since ${escAdmin(e.created_at)}</p>
                    </div>
                    <form method="post" action="/experiments/${escAdmin(e.slug)}/toggle">
                      <button type="submit" class="btn-small">${e.active ? "stop" : "resume"}</button>
                    </form>
                  </div>
                  ${e.notes ? `<p class="exp-notes">${escAdmin(e.notes)}</p>` : ""}
                  <table class="exp-variants">
                    <thead><tr><th>variant</th><th>weight</th><th>visits</th><th>avg duration</th><th>avg interactions</th></tr></thead>
                    <tbody>${lines}</tbody>
                  </table>
                </div>`;
              })
              .join("")
          )}

      <h2>New experiment</h2>
      <form method="post" action="/experiments" class="exp-create card">
        <label>slug
          <input name="slug" required pattern="[a-z0-9-]+" maxlength="60" placeholder="e.g. lantern-radius-test"/>
        </label>
        <label>app
          <select name="app_slug" required>
            <option>whisper</option><option>cartographer</option><option>lantern</option>
            <option>names</option><option>oracle</option><option>mirror</option><option>stone</option>
          </select>
        </label>
        <label>variants (JSON)
          <input name="variants" required value='[{"name":"A","weight":50},{"name":"B","weight":50}]'/>
        </label>
        <label>notes
          <input name="notes" maxlength="160"/>
        </label>
        <button type="submit">create</button>
      </form>
    `;

    return c.html(
      layout("Experiments · Ignir admin", body, {
        bodyClass: "admin",
        extraHead: ADMIN_STYLES,
      })
    );
  });

  app.post("/experiments", async (c) => {
    const form = await c.req.parseBody();
    const slug = String(form.slug ?? "").trim();
    const appSlug = String(form.app_slug ?? "").trim();
    const variantsRaw = String(form.variants ?? "").trim();
    const notes = String(form.notes ?? "").trim() || null;

    let variants;
    try {
      variants = JSON.parse(variantsRaw);
      if (!Array.isArray(variants)) throw new Error();
    } catch {
      return c.text("Invalid variants JSON", 400);
    }

    await query(
      `INSERT INTO experiments (slug, app_slug, variants, notes)
       VALUES ($1, $2, $3::jsonb, $4)`,
      [slug, appSlug, JSON.stringify(variants), notes]
    );
    return c.redirect("/experiments");
  });

  app.post("/experiments/:slug/toggle", async (c) => {
    const slug = c.req.param("slug");
    await query(
      `UPDATE experiments SET active = NOT active WHERE slug = $1`,
      [slug]
    );
    return c.redirect("/experiments");
  });

  return app;
}
