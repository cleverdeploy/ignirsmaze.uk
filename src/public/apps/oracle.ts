export function oracleHtml(_variant: string): string {
  return `
    <main class="chamber oracle">
      <p class="chamber-eyebrow">a chamber · the ash oracle</p>
      <h1>The Ash Oracle</h1>
      <p id="oracle-prompt" class="chamber-lede">Three embers. Choose one to feed.</p>

      <div class="oracle-choices" id="oracle-choices"></div>
      <div class="oracle-passages" id="oracle-passages" aria-live="polite"></div>

      <p class="chamber-foot"><a href="/">return</a></p>
    </main>
    <script src="/apps/oracle.js" defer></script>
  `;
}
