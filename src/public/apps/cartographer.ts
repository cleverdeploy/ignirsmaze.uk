export function cartographerHtml(_variant: string): string {
  return `
    <main class="chamber cartographer">
      <p class="chamber-eyebrow">a chamber · the cartographer's hand</p>
      <h1>The Cartographer's Hand</h1>
      <p class="chamber-lede">Draw a chamber. The maze will name it.</p>

      <div class="canvas-wrap">
        <canvas id="cart-canvas" width="500" height="320" aria-label="drawing"></canvas>
        <div class="cart-toolbar">
          <button type="button" id="cart-clear">erase</button>
          <button type="button" id="cart-name">name it</button>
        </div>
        <p class="cart-result" id="cart-result"></p>
      </div>

      <h2 class="cart-mapheading">your map</h2>
      <ul class="cart-map" id="cart-map" aria-live="polite"></ul>

      <p class="chamber-foot"><a href="/">return</a></p>
    </main>
    <script src="/apps/cartographer.js" defer></script>
  `;
}
