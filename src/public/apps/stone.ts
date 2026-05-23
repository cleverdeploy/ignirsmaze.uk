export function stoneHtml(variant: string): string {
  return `
    <main class="chamber stone">
      <p class="chamber-eyebrow">a chamber · the patient stone</p>
      <h1>The Patient Stone</h1>
      <p class="chamber-lede">Wait.</p>

      <div class="stone-counter" id="stone-counter">0</div>
      <button type="button" class="stone-button" id="stone-button" data-variant="${variant === "B" ? "B" : "A"}">wait</button>

      <div class="stone-events" id="stone-events" aria-live="polite"></div>

      <p class="chamber-foot"><a href="/">return</a></p>
    </main>
    <script src="/apps/stone.js" defer></script>
  `;
}
