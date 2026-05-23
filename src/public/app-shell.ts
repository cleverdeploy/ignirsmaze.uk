import { Hono } from "hono";
import { layout, raw } from "../render.js";
import { whisperHtml } from "./apps/whisper.js";
import { cartographerHtml } from "./apps/cartographer.js";
import { lanternHtml } from "./apps/lantern.js";

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

type Renderer = (variant: string) => string;
const RENDERERS: Partial<Record<AppSlug, Renderer>> = {
  whisper: whisperHtml,
  cartographer: cartographerHtml,
  lantern: lanternHtml,
};

function stubHtml(name: string): string {
  return `
    <main class="chamber">
      <p class="chamber-eyebrow">a chamber</p>
      <h1>${name}</h1>
      <p class="chamber-lede">under construction</p>
      <p class="chamber-foot"><a href="/">return</a></p>
    </main>
  `;
}

export function appShellRouter(): Hono {
  const app = new Hono();

  app.get("/m/:slug", (c) => {
    const slug = c.req.param("slug");
    if (!(APP_SLUGS as readonly string[]).includes(slug)) {
      return c.notFound();
    }
    const typedSlug = slug as AppSlug;
    const name = APP_NAMES[typedSlug];
    const variant = "A"; // P5 will resolve via experiments
    const renderer = RENDERERS[typedSlug];
    const body = renderer ? renderer(variant) : stubHtml(name);

    const layoutHtml = layout(name, body, {
      bodyClass: `chamber chamber-${slug}`,
      clientBase: true,
    });
    // Inject data-app and data-variant on body so client-base.js startView fires.
    const htmlDoc = layoutHtml.replace(
      `<body class="chamber chamber-${slug}">`,
      `<body class="chamber chamber-${slug}" data-app="${slug}" data-variant="${variant}">`
    );
    return c.html(htmlDoc);
  });

  return app;
}
