export function lanternHtml(_variant: string): string {
  return `
    <main class="chamber lantern">
      <p class="chamber-eyebrow">a chamber · the lantern</p>
      <h1>The Lantern</h1>
      <p class="chamber-lede">Pass the ember close. Things half-buried show themselves.</p>

      <div class="lantern-room" id="lantern-room">
        <!-- glyphs are placed by JS at random positions, hidden until illuminated -->
      </div>

      <div class="lantern-fragments" id="lantern-fragments" aria-live="polite"></div>

      <p class="chamber-foot">
        <span class="muted" id="lantern-count">0 / 8 revealed</span>
        <a href="/">return</a>
      </p>
    </main>
    <script src="/apps/lantern.js" defer></script>
  `;
}
