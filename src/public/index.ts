import { Hono } from "hono";
import { serveStatic } from "@hono/node-server/serve-static";
import { sessionMiddleware } from "../session.js";
import { eventsRouter } from "./events.js";
import { homeHandler } from "./home.js";
import { appShellRouter } from "./app-shell.js";
import { llmRouter } from "./llm.js";
import { namesApi } from "./apps/names-api.js";

export function publicApp(): Hono {
  const app = new Hono();

  app.use("*", sessionMiddleware);

  app.get("/", homeHandler);
  app.route("/", appShellRouter());
  app.route("/", eventsRouter());
  app.route("/", llmRouter());
  app.route("/", namesApi());

  // Static assets
  app.use("/styles.css", serveStatic({ path: "./website/styles.css" }));
  app.use("/favicon.svg", serveStatic({ path: "./website/favicon.svg" }));
  app.use("/client-base.js", serveStatic({ path: "./public/client-base.js" }));
  app.use("/home.js", serveStatic({ path: "./public/home.js" }));
  app.use("/apps/*", serveStatic({ root: "./public" }));

  return app;
}
