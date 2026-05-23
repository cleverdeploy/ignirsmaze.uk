export function namesHtml(_variant: string): string {
  return `
    <main class="chamber names">
      <p class="chamber-eyebrow">a chamber · the lock of many names</p>
      <h1>The Lock of Many Names</h1>
      <p class="chamber-lede">Some doors only open to the right word.</p>

      <form id="names-form" autocomplete="off">
        <input
          id="names-input"
          type="text"
          maxlength="60"
          placeholder="speak its name"
          spellcheck="false"
          aria-label="name"
        />
        <button type="submit">try</button>
      </form>

      <div id="names-result" aria-live="polite"></div>

      <p class="chamber-foot"><a href="/">return</a></p>
    </main>
    <script src="/apps/names.js" defer></script>
  `;
}
