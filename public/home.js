// Home page — cycling phrase + 7 hidden discovery triggers.
(function () {
  "use strict";

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

  function go(slug, method) {
    if (window.IM) {
      IM.discovery(slug, method);
      IM.pulse(() => {
        location.href = "/m/" + slug;
      });
    } else {
      location.href = "/m/" + slug;
    }
  }

  if (!window.IM) return;

  const sigil = document.getElementById("sigil");
  const apex = document.getElementById("apex");

  // 1. whisper — triple-click sigil
  if (sigil) IM.onTripleClick(sigil, () => go("whisper", "sigil-triple-click"));

  // 2. cartographer — swipe across bottom
  IM.onBottomSwipe(() => go("cartographer", "swipe-bottom"));

  // 3. lantern — sustained hover (≥ 8s) on apex
  if (apex) IM.onSustainedHover(apex, 8000, () => go("lantern", "apex-hover-8s"));

  // 4. names — type "open" with no focused input
  IM.onKeyword("open", () => go("names", "keyword-open"));

  // 5. oracle — click cycling phrase
  if (cycleEl) cycleEl.addEventListener("click", () => go("oracle", "cycle-click"));

  // 6. mirror — konami
  IM.onKonami(() => go("mirror", "konami"));

  // 7. stone — left-to-right path trace across sigil
  if (sigil) IM.onPathTrace(sigil, () => go("stone", "sigil-path-trace"));
})();
