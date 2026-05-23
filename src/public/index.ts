import { Hono } from "hono";
import { serveStatic } from "@hono/node-server/serve-static";
import { readFileSync } from "node:fs";
import { sessionMiddleware } from "../session.js";
import { eventsRouter } from "./events.js";

export function publicApp(): Hono {
  const app = new Hono();

  app.use("*", sessionMiddleware);

  // Existing static homepage with client-base.js injected
  app.get("/", (c) => {
    let body = readFileSync("./website/index.html", "utf8");
    if (!body.includes("client-base.js")) {
      body = body.replace(
        "</body>",
        '<script src="/client-base.js"></script></body>'
      );
    }
    return c.html(body);
  });

  // Analytics + discovery endpoints
  app.route("/", eventsRouter());

  // Static assets
  app.use("/styles.css", serveStatic({ path: "./website/styles.css" }));
  app.use("/favicon.svg", serveStatic({ path: "./website/favicon.svg" }));
  app.use("/client-base.js", serveStatic({ path: "./public/client-base.js" }));
  app.use("/home.js", serveStatic({ path: "./public/home.js" }));
  app.use("/apps/*", serveStatic({ root: "./public" }));

  return app;
}
