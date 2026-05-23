import type { MiddlewareHandler } from "hono";
import { env } from "../env.js";
import { timingSafeEqual } from "node:crypto";

function safeEq(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export const basicAuth: MiddlewareHandler = async (c, next) => {
  const header = c.req.header("authorization") ?? "";
  if (header.startsWith("Basic ")) {
    try {
      const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
      const idx = decoded.indexOf(":");
      if (idx >= 0) {
        const pass = decoded.slice(idx + 1);
        if (safeEq(pass, env.ADMIN_PASSWORD)) {
          return next();
        }
      }
    } catch {}
  }
  return c.body(null, 401, {
    "WWW-Authenticate": 'Basic realm="ignir admin", charset="UTF-8"',
  });
};
