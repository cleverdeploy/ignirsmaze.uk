import { Hono } from "hono";
import { layout, html, raw } from "../render.js";

export const APP_SLUGS = [
  "whisper",
  "cartographer",
  "lantern",
  "names",
  "oracle",
  "mirror",
  "stone",
] as const;
export type AppSlug = (typeof APP_SLUGS)[number];

const APP_NAMES: Record<AppSlug, string> = {
  whisper: "The Whisper Gallery",
  cartographer: "The Cartographer's Hand",
  lantern: "The Lantern Game",
  names: "The Lock of Many Names",
  oracle: "The Ash Oracle",
  mirror: "The Mirror Door",
  stone: "The Patient Stone",
};

export function appShellRouter(): Hono {
  const app = new Hono();

  app.get("/m/:slug", (c) => {
    const slug = c.req.param("slug");
    if (!(APP_SLUGS as readonly string[]).includes(slug)) {
      return c.notFound();
    }
    const name = APP_NAMES[slug as AppSlug];
    const variant = "A"; // P5 will resolve via experiments

    const body = html`
      <main class="chamber">
        <p class="chamber-eyebrow">a chamber</p>
        <h1>${name}</h1>
        <p class="chamber-lede">under construction</p>
        <p class="chamber-foot">
          <a href="/">return</a>
        </p>
      </main>
    `;

    const extraHead = `<script>
      document.body && document.body.setAttribute && document.body.setAttribute('data-app','${slug}');
      document.body && document.body.setAttribute && document.body.setAttribute('data-variant','${variant}');
    </script>`;

    const layoutOpts = {
      bodyClass: `chamber chamber-${slug}`,
      clientBase: true,
      extraHead,
    };

    // We need data-app set on <body> BEFORE client-base.js runs so it triggers startView.
    // Easiest: inject as body attribute through a small wrapper.
    const htmlDoc = layout(name, body, layoutOpts).replace(
      `<body class="chamber chamber-${slug}">`,
      `<body class="chamber chamber-${slug}" data-app="${slug}" data-variant="${variant}">`
    );

    return c.html(htmlDoc);
  });

  return app;
}
