import type { Context, MiddlewareHandler } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { randomBytes, createHash } from "node:crypto";
import { query } from "./db.js";

const COOKIE_NAME = "im_sid";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

function newSessionId(): string {
  return randomBytes(18).toString("base64url");
}

function fingerprint(c: Context): string {
  const ua = c.req.header("user-agent") ?? "";
  const lang = c.req.header("accept-language") ?? "";
  const ip = c.req.header("cf-connecting-ip")
    ?? c.req.header("x-forwarded-for")?.split(",")[0]?.trim()
    ?? "";
  const ipCoarse = ip.split(".").slice(0, 3).join(".");
  return createHash("sha256").update(`${ua}|${lang}|${ipCoarse}`).digest("hex").slice(0, 32);
}

export type SessionState = {
  id: string;
  isNew: boolean;
};

declare module "hono" {
  interface ContextVariableMap {
    session: SessionState;
  }
}

export const sessionMiddleware: MiddlewareHandler = async (c, next) => {
  let id = getCookie(c, COOKIE_NAME);
  let isNew = false;

  if (!id || id.length < 16 || id.length > 64) {
    id = newSessionId();
    isNew = true;
  }

  const ua = c.req.header("user-agent") ?? null;
  const country = c.req.header("cf-ipcountry") ?? null;
  const referer = c.req.header("referer") ?? null;
  const fp = fingerprint(c);

  if (isNew) {
    await query(
      `INSERT INTO sessions (id, fingerprint, user_agent, country, referer)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO NOTHING`,
      [id, fp, ua, country, referer]
    );
  } else {
    await query(
      `UPDATE sessions SET last_seen_at = now() WHERE id = $1`,
      [id]
    );
  }

  setCookie(c, COOKIE_NAME, id, {
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
    domain: ".ignirsmaze.uk",
  });

  c.set("session", { id, isNew });
  await next();
};
