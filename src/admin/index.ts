import { Hono } from "hono";
import { basicAuth } from "./auth.js";
import { layout, html, raw } from "../render.js";

export function adminApp(): Hono {
  const app = new Hono();
  app.use("*", basicAuth);

  app.get("/", (c) => {
    return c.html(
      layout(
        "Ignir admin",
        html`
          <main class="admin">
            <h1>Ignir admin</h1>
            <p>Dashboard will live here. P0 backbone is up.</p>
          </main>
        `
      )
    );
  });

  return app;
}
