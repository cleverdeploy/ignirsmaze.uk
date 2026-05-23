import { Hono } from "hono";
import { serveStatic } from "@hono/node-server/serve-static";
import { readFileSync } from "node:fs";
import { sessionMiddleware } from "../session.js";

export function publicApp(): Hono {
  const app = new Hono();

  app.use("*", sessionMiddleware);

  // Serve the existing static site at /
  app.get("/", (c) => {
    const body = readFileSync("./website/index.html", "utf8");
    return c.html(body);
  });

  // Static assets from website/ (styles.css, favicon.svg) and public/ (future)
  app.use("/styles.css", serveStatic({ path: "./website/styles.css" }));
  app.use("/favicon.svg", serveStatic({ path: "./website/favicon.svg" }));
  app.use("/client-base.js", serveStatic({ path: "./public/client-base.js" }));
  app.use("/home.js", serveStatic({ path: "./public/home.js" }));
  app.use("/apps/*", serveStatic({ root: "./public" }));

  return app;
}
