export function mirrorHtml(_variant: string): string {
  return `
    <main class="chamber mirror">
      <p class="chamber-eyebrow">a chamber · the mirror door</p>
      <h1>The Mirror Door</h1>
      <p class="chamber-lede">Open this page in a second window. Move both at once.</p>

      <div class="mirror-stage" id="mirror-stage">
        <div class="mirror-glyph" id="mirror-target-a" data-id="A">✦</div>
        <div class="mirror-glyph" id="mirror-target-b" data-id="B">✦</div>
        <div class="mirror-cursor mine" id="mirror-cursor-mine"></div>
        <div class="mirror-cursor other" id="mirror-cursor-other"></div>
      </div>

      <p class="mirror-status" id="mirror-status">awaiting a second window&hellip;</p>

      <p class="chamber-foot"><a href="/">return</a></p>
    </main>
    <script src="/apps/mirror.js" defer></script>
  `;
}
