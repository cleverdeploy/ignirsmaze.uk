import { Hono } from "hono";
import { query } from "../db.js";

// Token bucket per session: 60 events / minute
const buckets = new Map<string, { tokens: number; refilledAt: number }>();
const CAP = 60;
const REFILL_PER_MS = 60 / 60_000;

function allow(sessionId: string): boolean {
  const now = Date.now();
  const b = buckets.get(sessionId);
  if (!b) {
    buckets.set(sessionId, { tokens: CAP - 1, refilledAt: now });
    return true;
  }
  const elapsed = now - b.refilledAt;
  b.tokens = Math.min(CAP, b.tokens + elapsed * REFILL_PER_MS);
  b.refilledAt = now;
  if (b.tokens < 1) return false;
  b.tokens -= 1;
  return true;
}

setInterval(() => {
  const cutoff = Date.now() - 10 * 60_000;
  for (const [k, v] of buckets) {
    if (v.refilledAt < cutoff) buckets.delete(k);
  }
}, 5 * 60_000).unref();

export function eventsRouter(): Hono {
  const app = new Hono();

  app.post("/api/events", async (c) => {
    const session = c.get("session");
    if (!allow(session.id)) return c.body(null, 429);

    const body = await c.req.json().catch(() => null);
    if (!body || typeof body.name !== "string" || body.name.length > 64) {
      return c.json({ error: "bad request" }, 400);
    }
    const appSlug = typeof body.app_slug === "string" ? body.app_slug : null;
    const appViewId = Number.isFinite(body.app_view_id) ? body.app_view_id : null;
    const variant = typeof body.variant === "string" ? body.variant : null;
    const payload = body.payload ?? null;

    await query(
      `INSERT INTO events (session_id, app_view_id, app_slug, variant, name, payload)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [session.id, appViewId, appSlug, variant, body.name, payload]
    );

    if (appViewId) {
      await query(
        `UPDATE app_views SET interactions = interactions + 1 WHERE id = $1 AND session_id = $2`,
        [appViewId, session.id]
      );
    }

    return c.json({ ok: true });
  });

  app.post("/api/view/start", async (c) => {
    const session = c.get("session");
    if (!allow(session.id)) return c.body(null, 429);

    const body = await c.req.json().catch(() => null);
    if (!body || typeof body.app_slug !== "string") {
      return c.json({ error: "bad request" }, 400);
    }
    const variant = typeof body.variant === "string" ? body.variant : "A";

    const { rows } = await query<{ id: string }>(
      `INSERT INTO app_views (session_id, app_slug, variant)
       VALUES ($1, $2, $3) RETURNING id`,
      [session.id, body.app_slug, variant]
    );
    return c.json({ app_view_id: Number(rows[0].id) });
  });

  app.post("/api/view/end", async (c) => {
    const session = c.get("session");
    const body = await c.req.json().catch(() => null);
    if (!body || !Number.isFinite(body.app_view_id)) {
      return c.json({ error: "bad request" }, 400);
    }
    await query(
      `UPDATE app_views
       SET ended_at = now(),
           duration_ms = COALESCE(duration_ms, EXTRACT(EPOCH FROM (now() - started_at))::int * 1000)
       WHERE id = $1 AND session_id = $2 AND ended_at IS NULL`,
      [body.app_view_id, session.id]
    );
    return c.json({ ok: true });
  });

  app.post("/api/discovery", async (c) => {
    const session = c.get("session");
    if (!allow(session.id)) return c.body(null, 429);

    const body = await c.req.json().catch(() => null);
    if (
      !body ||
      typeof body.app_slug !== "string" ||
      typeof body.method !== "string"
    ) {
      return c.json({ error: "bad request" }, 400);
    }
    await query(
      `INSERT INTO discoveries (session_id, app_slug, method)
       VALUES ($1, $2, $3)
       ON CONFLICT (session_id, app_slug) DO NOTHING`,
      [session.id, body.app_slug, body.method]
    );
    return c.json({ ok: true });
  });

  return app;
}
