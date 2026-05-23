import type { Context } from "hono";
import { html, raw, layout } from "../render.js";

const HOME_BODY = `
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
    <!-- invisible hit-zone for "apex" (top of maze) hover detection -->
    <circle id="apex" cx="100" cy="35" r="14" fill="transparent" pointer-events="all"/>
  </svg>

  <h1>Ignir's Maze</h1>
  <p class="lede">The way in is not the way out.</p>

  <p class="meta">
    <span class="dot"></span>
    <span id="cycle" tabindex="0" role="button" aria-label="status">tending the embers</span>
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
