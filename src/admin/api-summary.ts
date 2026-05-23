import { Hono } from "hono";
import { query } from "../db.js";

const APP_SLUGS = ["whisper", "cartographer", "lantern", "names", "oracle", "mirror", "stone"] as const;

function zHint(aSuc: number, aN: number, bSuc: number, bN: number): { z: number; confidence: string } {
  if (aN === 0 || bN === 0) return { z: 0, confidence: "insufficient" };
  const p1 = aSuc / aN;
  const p2 = bSuc / bN;
  const p = (aSuc + bSuc) / (aN + bN);
  const denom = Math.sqrt(p * (1 - p) * (1 / aN + 1 / bN));
  if (denom === 0) return { z: 0, confidence: "no_variance" };
  const z = (p1 - p2) / denom;
  const abs = Math.abs(z);
  if (abs >= 2.58) return { z, confidence: "high" };
  if (abs >= 1.96) return { z, confidence: "moderate" };
  return { z, confidence: "low" };
}

export function apiSummaryRouter(): Hono {
  const app = new Hono();

  app.get("/api/summary.json", async (c) => {
    const days = Number(c.req.query("days") ?? "7");
    const windowDays = Math.max(1, Math.min(days, 90));

    const [totals, perApp, perMethod, perVariant, experiments, llmSpend, llmDaily] = await Promise.all([
      query<{ sessions: string; views: string; discoveries: string; events: string }>(
        `SELECT
           (SELECT COUNT(*)::text FROM sessions WHERE created_at > now() - ($1::int || ' days')::interval) AS sessions,
           (SELECT COUNT(*)::text FROM app_views WHERE started_at > now() - ($1::int || ' days')::interval) AS views,
           (SELECT COUNT(*)::text FROM discoveries WHERE created_at > now() - ($1::int || ' days')::interval) AS discoveries,
           (SELECT COUNT(*)::text FROM events WHERE created_at > now() - ($1::int || ' days')::interval) AS events`,
        [windowDays]
      ),
      query<{
        app_slug: string;
        visits: string;
        uniques: string;
        avg_ms: string | null;
        avg_interactions: string | null;
      }>(
        `SELECT app_slug, COUNT(*)::text AS visits, COUNT(DISTINCT session_id)::text AS uniques,
                AVG(duration_ms) FILTER (WHERE duration_ms IS NOT NULL)::text AS avg_ms,
                AVG(interactions)::text AS avg_interactions
         FROM app_views
         WHERE started_at > now() - ($1::int || ' days')::interval
         GROUP BY 1`,
        [windowDays]
      ),
      query<{ app_slug: string; method: string; finds: string; unique_finders: string }>(
        `SELECT app_slug, method, COUNT(*)::text AS finds,
                COUNT(DISTINCT session_id)::text AS unique_finders
         FROM discoveries
         WHERE created_at > now() - ($1::int || ' days')::interval
         GROUP BY 1, 2`,
        [windowDays]
      ),
      query<{
        app_slug: string;
        variant: string;
        visits: string;
        uniques: string;
        avg_ms: string | null;
        avg_interactions: string | null;
        engaged: string;
      }>(
        `SELECT app_slug, variant,
                COUNT(*)::text AS visits,
                COUNT(DISTINCT session_id)::text AS uniques,
                AVG(duration_ms) FILTER (WHERE duration_ms IS NOT NULL)::text AS avg_ms,
                AVG(interactions)::text AS avg_interactions,
                SUM(CASE WHEN interactions >= 3 THEN 1 ELSE 0 END)::text AS engaged
         FROM app_views
         WHERE started_at > now() - ($1::int || ' days')::interval
         GROUP BY 1, 2`,
        [windowDays]
      ),
      query<{ slug: string; app_slug: string; variants: any; active: boolean; created_at: string; notes: string | null }>(
        `SELECT slug, app_slug, variants, active,
                to_char(created_at,'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at, notes
         FROM experiments`
      ),
      query<{ s: string }>(
        `SELECT COALESCE(SUM(cost_usd), 0)::text AS s FROM llm_calls
         WHERE created_at > now() - INTERVAL '24 hours'`
      ),
      query<{ d: string; n: string; cost: string }>(
        `SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS d,
                COUNT(*)::text AS n,
                COALESCE(SUM(cost_usd),0)::text AS cost
         FROM llm_calls
         WHERE created_at > now() - ($1::int || ' days')::interval
         GROUP BY 1 ORDER BY 1`,
        [windowDays]
      ),
    ]);

    // Index methods + variants by app
    const methodsByApp = new Map<string, { method: string; finds: number; unique_finders: number }[]>();
    for (const m of perMethod.rows) {
      const arr = methodsByApp.get(m.app_slug) ?? [];
      arr.push({ method: m.method, finds: Number(m.finds), unique_finders: Number(m.unique_finders) });
      methodsByApp.set(m.app_slug, arr);
    }
    const variantsByApp = new Map<string, any[]>();
    for (const v of perVariant.rows) {
      const arr = variantsByApp.get(v.app_slug) ?? [];
      arr.push({
        name: v.variant,
        visits: Number(v.visits),
        uniques: Number(v.uniques),
        avg_ms: v.avg_ms ? Math.round(Number(v.avg_ms)) : null,
        avg_interactions: Number(v.avg_interactions ?? 0),
        engaged: Number(v.engaged),
      });
      variantsByApp.set(v.app_slug, arr);
    }

    const apps = APP_SLUGS.map((slug) => {
      const row = perApp.rows.find((r) => r.app_slug === slug);
      const variants = variantsByApp.get(slug) ?? [];
      return {
        slug,
        visits: row ? Number(row.visits) : 0,
        uniques: row ? Number(row.uniques) : 0,
        avg_ms: row?.avg_ms ? Math.round(Number(row.avg_ms)) : null,
        avg_interactions: row ? Number(row.avg_interactions ?? 0) : 0,
        discovery_methods: methodsByApp.get(slug) ?? [],
        variants,
      };
    });

    // Per-experiment summary with best_variant + confidence_hint
    const expSummaries = experiments.rows.map((e) => {
      const variants = variantsByApp.get(e.app_slug) ?? [];
      let best_variant: string | null = null;
      let best_avg_ms = -Infinity;
      for (const v of variants) {
        if (v.avg_ms != null && v.avg_ms > best_avg_ms) {
          best_avg_ms = v.avg_ms;
          best_variant = v.name;
        }
      }
      let confidence: string = "insufficient";
      if (variants.length >= 2) {
        const A = variants.find((v) => v.name === "A");
        const B = variants.find((v) => v.name === "B");
        if (A && B) {
          confidence = zHint(A.engaged, A.visits, B.engaged, B.visits).confidence;
        }
      }
      return {
        slug: e.slug,
        app: e.app_slug,
        active: e.active,
        created_at: e.created_at,
        notes: e.notes,
        variants_config: e.variants,
        best_variant,
        best_metric: best_variant ? "avg_ms" : null,
        confidence_hint: confidence,
      };
    });

    const t = totals.rows[0] ?? { sessions: "0", views: "0", discoveries: "0", events: "0" };

    const summary = {
      generated_at: new Date().toISOString(),
      window_days: windowDays,
      totals: {
        sessions: Number(t.sessions),
        app_views: Number(t.views),
        discoveries: Number(t.discoveries),
        events: Number(t.events),
      },
      apps,
      experiments: expSummaries,
      llm: {
        spend_24h_usd: Number(llmSpend.rows[0]?.s ?? 0),
        daily_breakdown: llmDaily.rows.map((r) => ({
          date: r.d,
          calls: Number(r.n),
          cost_usd: Number(r.cost),
        })),
      },
    };

    return c.json(summary);
  });

  return app;
}
