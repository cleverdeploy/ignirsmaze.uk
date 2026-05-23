import { Hono } from "hono";
import { env } from "./env.js";

export function hostRouter(publicApp: Hono, adminApp: Hono) {
  return async (req: Request): Promise<Response> => {
    const host = (req.headers.get("host") ?? "").toLowerCase();
    const isAdmin = host === env.ADMIN_HOST || host.startsWith("admin.");
    return (isAdmin ? adminApp : publicApp).fetch(req);
  };
}
