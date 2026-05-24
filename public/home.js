// Home page — cycling phrase + tap-a-glyph to open a chamber.
(function () {
  "use strict";

  // ── Cycling phrase (decorative) ────────────────────────────────────────
  const phrases = [
    "tending the embers",
    "drawing the walls",
    "listening for footsteps",
    "the lamp is lit",
    "an opening, perhaps",
  ];
  const cycleEl = document.getElementById("cycle");
  let phraseIdx = 0;
  if (cycleEl) {
    setInterval(() => {
      phraseIdx = (phraseIdx + 1) % phrases.length;
      cycleEl.style.opacity = 0;
      setTimeout(() => {
        cycleEl.textContent = phrases[phraseIdx];
        cycleEl.style.opacity = 1;
      }, 600);
    }, 4200);
  }

  // ── Tap a glyph to open its chamber ────────────────────────────────────
  const holes = document.querySelectorAll(".hole[data-slug]");
  holes.forEach((h) => {
    h.addEventListener("click", (e) => {
      e.preventDefault();
      const slug = h.dataset.slug;
      if (!slug) return;
      h.classList.add("sunk");
      if (window.IM) {
        IM.event("hole-tap", { slug });
        IM.discovery(slug, "tap");
        IM.pulse(() => { location.href = "/m/" + slug; });
      } else {
        setTimeout(() => { location.href = "/m/" + slug; }, 200);
      }
    });
  });
})();
