import { Hono } from "hono";
import { basicAuth } from "./auth.js";
import { dashboardRouter } from "./dashboard.js";
import { appDetailRouter } from "./app-detail.js";
import { experimentsRouter } from "./experiments.js";
import { apiSummaryRouter } from "./api-summary.js";

export function adminApp(): Hono {
  const app = new Hono();
  app.use("*", basicAuth);
  app.route("/", dashboardRouter());
  app.route("/", appDetailRouter());
  app.route("/", experimentsRouter());
  app.route("/", apiSummaryRouter());
  return app;
}
