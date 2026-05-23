import { Hono } from "hono";
import { basicAuth } from "./auth.js";
import { dashboardRouter } from "./dashboard.js";

export function adminApp(): Hono {
  const app = new Hono();
  app.use("*", basicAuth);
  app.route("/", dashboardRouter());
  return app;
}
