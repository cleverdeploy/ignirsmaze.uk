import type { Context } from "hono";
import { layout } from "../render.js";

// SVG glyphs for each hole — small, recognisable icons in the same ember palette.
const GLYPHS: Record<string, string> = {
  whisper:
    // a pair of opposing curves — parted lips / curtain
    '<g fill="none" stroke="#f4a261" stroke-width="1.5" stroke-linecap="round"><path d="M-8 -2 Q0 -6 8 -2"/><path d="M-8 2 Q0 6 8 2"/></g>',
  cartographer:
    // a compass rose
    '<g fill="#f4a261"><polygon points="0,-10 2,0 0,1 -2,0" /><polygon points="10,0 0,2 -1,0 0,-2" transform="rotate(0)"/><polygon points="0,10 -2,0 0,-1 2,0"/><polygon points="-10,0 0,-2 1,0 0,2"/></g><circle cx="0" cy="0" r="1.6" fill="#f4a261"/>',
  lantern:
    // a small hanging lantern
    '<g fill="none" stroke="#f4a261" stroke-width="1.4" stroke-linecap="round"><line x1="0" y1="-12" x2="0" y2="-8"/><rect x="-5" y="-8" width="10" height="3" rx="1"/><path d="M-5 -5 L-6 7 L6 7 L5 -5 Z"/><circle cx="0" cy="2" r="2.5" fill="#f4a261" stroke="none"/></g>',
  names:
    // a padlock
    '<g fill="none" stroke="#f4a261" stroke-width="1.4" stroke-linecap="round"><path d="M-4 -3 V-6 a4 4 0 0 1 8 0 V-3"/><rect x="-6" y="-3" width="12" height="11" rx="1.5"/><circle cx="0" cy="2" r="1.2" fill="#f4a261" stroke="none"/></g>',
  oracle:
    // three small embers in a triangle
    '<g fill="#f4a261"><circle cx="0" cy="-6" r="2"/><circle cx="-5.5" cy="3.5" r="2"/><circle cx="5.5" cy="3.5" r="2"/></g>',
  mirror:
    // a silvered oval with shimmer line
    '<g><ellipse cx="0" cy="0" rx="6" ry="9" fill="none" stroke="#f4a261" stroke-width="1.4"/><line x1="-3" y1="-5" x2="-4" y2="3" stroke="#f4a261" stroke-width="1" opacity="0.65"/></g>',
  stone:
    // a flat round stone with a runic stroke
    '<g><circle cx="0" cy="0" r="9" fill="none" stroke="#f4a261" stroke-width="1.4"/><path d="M-3 -3 L3 3 M3 -3 L-3 3" stroke="#f4a261" stroke-width="1.4" stroke-linecap="round" fill="none"/></g>',
};

// Position around the edges, viewport-relative. Each hole has slug + (x%, y%).
// Avoid the central column where the sigil + title live (roughly 35–65% x).
type HolePos = { slug: string; x: number; y: number };
const HOLES: HolePos[] = [
  { slug: "whisper",      x: 12, y: 14 },   // top-left
  { slug: "lantern",      x: 50, y: 7 },    // top-center (above title)
  { slug: "mirror",       x: 88, y: 14 },   // top-right
  { slug: "oracle",       x: 8,  y: 52 },   // mid-left
  { slug: "cartographer", x: 92, y: 52 },   // mid-right
  { slug: "names",        x: 22, y: 70 },   // lower-left (away from ball at base)
  { slug: "stone",        x: 78, y: 70 },   // lower-right
];

function holeSvg(slug: string): string {
  const glyph = GLYPHS[slug] ?? "";
  return `<svg class="hole-svg" viewBox="-20 -20 40 40" aria-hidden="true">
    <!-- recess: dark inner with subtle ring -->
    <circle cx="0" cy="0" r="16" fill="rgba(0,0,0,0.6)" stroke="#3a2f25" stroke-width="1.2"/>
    <circle cx="0" cy="0" r="14" fill="none" stroke="rgba(244,162,97,0.12)" stroke-width="0.8"/>
    ${glyph}
  </svg>`;
}

const HOME_BODY = `
<div class="play-field" id="play-field" aria-hidden="false">
  ${HOLES.map(
    (h) => `<div class="hole" data-slug="${h.slug}" style="left:${h.x}%;top:${h.y}%" aria-label="hole ${h.slug}">${holeSvg(h.slug)}</div>`
  ).join("")}
  <div class="ball" id="ball" role="button" tabindex="0" aria-label="flick the ember"></div>
  <svg class="aim-line" id="aim-line" aria-hidden="true"><line x1="0" y1="0" x2="0" y2="0"/></svg>
</div>

<main>
  <svg id="sigil" class="sigil" viewBox="0 0 200 200" aria-hidden="true">
    <defs>
      <radialGradient id="g" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#ffb46b" stop-opacity="0.9"/>
        <stop offset="55%" stop-color="#c2410c" stop-opacity="0.25"/>
        <stop offset="100%" stop-color="#000" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <circle cx="100" cy="100" r="90" fill="url(#g)"/>
    <g fill="none" stroke="#f4a261" stroke-width="1.4" stroke-linecap="square" opacity="0.85">
      <path d="M100 30 L100 60 L70 60 L70 90 L40 90 L40 130 L70 130 L70 110 L90 110 L90 150 L130 150 L130 110 L150 110 L150 80 L130 80 L130 50 L160 50"/>
      <path d="M100 100 L110 100 L110 90 L100 90 Z" fill="#f4a261" stroke="none"/>
    </g>
  </svg>

  <h1>Ignir's Maze</h1>
  <p class="lede">The way in is not the way out.</p>

  <p class="meta">
    <span class="dot"></span>
    <span id="cycle">tending the embers</span>
  </p>
</main>

<footer>
  <span>MMXXVI</span>
  <span class="sep">·</span>
  <span>by invitation</span>
</footer>
`;

export function homeHandler(c: Context) {
  return c.html(
    layout("Ignir's Maze", HOME_BODY, {
      bodyClass: "home",
      clientBase: true,
      extraHead: '<script src="/home.js" defer></script>',
    })
  );
}
