import { serve } from "@hono/node-server";
import { env } from "./env.js";
import { migrate } from "./db.js";
import { publicApp } from "./public/index.js";
import { adminApp } from "./admin/index.js";
import { hostRouter } from "./host-router.js";

async function main() {
  console.log(`[boot] starting ignirsmaze, port=${env.PORT}`);
  await migrate();
  console.log(`[boot] migrations ok`);

  const handler = hostRouter(publicApp(), adminApp());

  serve(
    {
      port: env.PORT,
      fetch: handler,
    },
    (info) => {
      console.log(`[boot] listening on http://0.0.0.0:${info.port}`);
    }
  );
}

main().catch((e) => {
  console.error("[boot] fatal:", e);
  process.exit(1);
});
