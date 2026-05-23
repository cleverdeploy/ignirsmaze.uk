export function whisperHtml(_variant: string): string {
  return `
    <main class="chamber whisper">
      <p class="chamber-eyebrow">a chamber · whisper through stone</p>
      <h1>The Whisper Gallery</h1>
      <p class="chamber-lede">Whisper. Listen. It will answer in riddles.</p>

      <form id="whisper-form" autocomplete="off">
        <input
          id="whisper-input"
          type="text"
          maxlength="200"
          placeholder="whisper&hellip;"
          aria-label="whisper"
          spellcheck="false"
        />
        <button type="submit" id="whisper-submit">speak</button>
      </form>

      <div id="whisper-thread" aria-live="polite"></div>

      <p class="chamber-foot"><a href="/">return</a></p>
    </main>
    <script src="/apps/whisper.js" defer></script>
  `;
}
