import { createHash } from "node:crypto";
import { query } from "./db.js";

type Variant = { name: string; weight: number };

type ExperimentRow = {
  slug: string;
  app_slug: string;
  variants: Variant[];
  active: boolean;
};

async function activeExperimentForApp(appSlug: string): Promise<ExperimentRow | null> {
  const { rows } = await query<ExperimentRow>(
    `SELECT slug, app_slug, variants, active
     FROM experiments
     WHERE app_slug = $1 AND active = true
     ORDER BY created_at DESC
     LIMIT 1`,
    [appSlug]
  );
  return rows[0] ?? null;
}

function pickVariant(sessionId: string, expSlug: string, variants: Variant[]): string {
  const total = variants.reduce((s, v) => s + Math.max(0, v.weight), 0);
  if (total <= 0) return variants[0]?.name ?? "A";
  // Deterministic per (session, experiment) using sha256
  const h = createHash("sha256").update(sessionId + "|" + expSlug).digest();
  const n = h.readUInt32BE(0) / 0xffffffff;
  let acc = 0;
  const r = n * total;
  for (const v of variants) {
    acc += Math.max(0, v.weight);
    if (r < acc) return v.name;
  }
  return variants[variants.length - 1].name;
}

/** Resolve the variant for this session and app, writing a sticky assignment. */
export async function assignVariant(
  sessionId: string,
  appSlug: string
): Promise<string> {
  // existing assignment?
  const { rows: existing } = await query<{ variant: string }>(
    `SELECT variant FROM assignments WHERE session_id = $1 AND app_slug = $2`,
    [sessionId, appSlug]
  );
  if (existing.length > 0) return existing[0].variant;

  const exp = await activeExperimentForApp(appSlug);
  if (!exp) {
    // No active experiment: default variant 'A'. Don't write an assignment row
    // (so future experiments can pick fresh).
    return "A";
  }

  const variant = pickVariant(sessionId, exp.slug, exp.variants);
  await query(
    `INSERT INTO assignments (session_id, app_slug, experiment_slug, variant)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (session_id, app_slug) DO NOTHING`,
    [sessionId, appSlug, exp.slug, variant]
  );
  return variant;
}
