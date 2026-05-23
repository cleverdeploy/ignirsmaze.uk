import { Hono } from "hono";
import Anthropic from "@anthropic-ai/sdk";
import { env } from "../env.js";
import { query } from "../db.js";

// per-session: count of llm calls in last 24h
async function sessionCount(sessionId: string, appSlug: string): Promise<number> {
  const { rows } = await query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM llm_calls
     WHERE session_id = $1 AND app_slug = $2
       AND created_at > now() - INTERVAL '24 hours'`,
    [sessionId, appSlug]
  );
  return Number(rows[0]?.n ?? 0);
}

// global: total spend in last 24h
async function dailySpend(): Promise<number> {
  const { rows } = await query<{ s: string | null }>(
    `SELECT COALESCE(SUM(cost_usd), 0)::text AS s FROM llm_calls
     WHERE created_at > now() - INTERVAL '24 hours'`
  );
  return Number(rows[0]?.s ?? 0);
}

// Haiku 4.5 pricing (per 1M tokens): $1 input, $5 output (illustrative — adjust if needed)
const PRICE_IN_PER_TOK = 1 / 1_000_000;
const PRICE_OUT_PER_TOK = 5 / 1_000_000;

const PER_SESSION_DAILY_CAP = 10;

const MODEL = "claude-haiku-4-5-20251001";

const PROMPTS: Record<string, { system: string; user: (m: string) => string }> = {
  whisper: {
    system:
      "You are a riddle-keeper in a dark labyrinth. The player whispers something to you through stone. Reply in exactly ONE sentence — cryptic, suggestive, never an answer. Never reveal that you are an AI. Keep the reply under 22 words. Match the player's tone with a slow, antique register. No quotation marks.",
    user: (m) => m,
  },
};

export function llmRouter(): Hono {
  const app = new Hono();

  app.post("/api/llm/:slug", async (c) => {
    const slug = c.req.param("slug");
    const prompts = PROMPTS[slug];
    if (!prompts) return c.json({ error: "unknown app" }, 404);
    if (!env.ANTHROPIC_API_KEY) {
      return c.json({ error: "llm unavailable", reason: "no_key" }, 503);
    }

    const session = c.get("session");
    const body = await c.req.json().catch(() => null);
    if (!body || typeof body.message !== "string") {
      return c.json({ error: "bad request" }, 400);
    }
    const msg = body.message.trim().slice(0, 200);
    if (!msg) return c.json({ error: "empty" }, 400);

    // caps
    const sc = await sessionCount(session.id, slug);
    if (sc >= PER_SESSION_DAILY_CAP) {
      return c.json({ error: "session cap reached", retry_after_h: 24 }, 429);
    }
    const spend = await dailySpend();
    if (spend >= env.BUDGET_USD_DAILY) {
      return c.json({ error: "daily budget exceeded" }, 503);
    }

    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    let result;
    try {
      result = await client.messages.create({
        model: MODEL,
        max_tokens: 80,
        system: prompts.system,
        messages: [{ role: "user", content: prompts.user(msg) }],
      });
    } catch (e: any) {
      console.error("[llm] error:", e?.message);
      return c.json({ error: "llm_failed" }, 502);
    }

    const text =
      result.content
        ?.filter((b: any) => b.type === "text")
        .map((b: any) => b.text)
        .join("\n")
        .trim() ?? "";

    const inTok = result.usage?.input_tokens ?? 0;
    const outTok = result.usage?.output_tokens ?? 0;
    const cost = inTok * PRICE_IN_PER_TOK + outTok * PRICE_OUT_PER_TOK;

    await query(
      `INSERT INTO llm_calls (session_id, app_slug, input_tokens, output_tokens, cost_usd)
       VALUES ($1, $2, $3, $4, $5)`,
      [session.id, slug, inTok, outTok, cost]
    );

    return c.json({ reply: text });
  });

  return app;
}
