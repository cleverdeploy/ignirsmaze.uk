import { Hono } from "hono";
import { query } from "../../db.js";
import { createHash } from "node:crypto";

// The canonical answer. Kept in source rather than DB — it's a single string
// and not worth a migration. Accepts common variants.
const ANSWERS = [
  "ignir",
  "the lamp",
  "lamp",
  "ember",
  "the ember",
];

const HINTS = [
  "It is short.",
  "It is named on the wall.",
  "It belongs to fire.",
  "It is what you came here carrying.",
  "It is older than the maze.",
  "It is the title of a small light.",
  "It is the first word of the place itself.",
  "It is hidden in plain sight at the entrance.",
  "It is one syllable.",
  "It is what the embers were called before they were embers.",
  "Look at the URL of where you came from.",
  "It is in the name of the maze.",
];

function normalize(s: string): string {
  return s.toLowerCase().trim().replace(/^the\s+/, "").replace(/[^a-z]/g, "");
}

function isCorrect(guess: string): boolean {
  const n = normalize(guess);
  return ANSWERS.some((a) => normalize(a) === n);
}

async function countGuesses(sessionId: string): Promise<number> {
  const { rows } = await query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM events
     WHERE session_id = $1 AND app_slug = 'names' AND name = 'names-guess'`,
    [sessionId]
  );
  return Number(rows[0]?.n ?? 0);
}

export function namesApi(): Hono {
  const app = new Hono();

  app.post("/api/names/guess", async (c) => {
    const session = c.get("session");
    const body = await c.req.json().catch(() => null);
    if (!body || typeof body.guess !== "string") {
      return c.json({ error: "bad request" }, 400);
    }
    const guess = body.guess.slice(0, 60);
    const correct = isCorrect(guess);
    const priorGuesses = await countGuesses(session.id);

    // Record guess as an event
    await query(
      `INSERT INTO events (session_id, app_slug, name, payload)
       VALUES ($1, 'names', 'names-guess', $2)`,
      [session.id, JSON.stringify({ guess, correct })]
    );

    if (correct) {
      return c.json({
        correct: true,
        scene:
          "The lock yields, with a sound like sand falling through bone. Inside is a small room, lined in soot. " +
          "Someone has written, in the corner, in the same handwriting as your own: 'I knew you would find this.'",
      });
    }

    // Reveal a hint based on number of prior guesses (0-indexed)
    const hint = HINTS[Math.min(priorGuesses, HINTS.length - 1)];
    return c.json({ correct: false, hint, attempts: priorGuesses + 1 });
  });

  return app;
}
