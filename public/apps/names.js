(function () {
  "use strict";
  const form = document.getElementById("names-form");
  const input = document.getElementById("names-input");
  const result = document.getElementById("names-result");

  form && form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const guess = (input.value || "").trim();
    if (!guess) return;
    input.value = "";
    if (window.IM) IM.event("names-submit", { length: guess.length });
    const r = await fetch("/api/names/guess", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guess }),
    });
    if (!r.ok) {
      result.innerHTML = '<p class="names-hint">silence.</p>';
      return;
    }
    const data = await r.json();
    if (data.correct) {
      result.innerHTML = `<div class="names-scene">${data.scene.replace(/[<>"']/g, "")}</div>`;
      form.style.display = "none";
      if (window.IM) IM.event("names-solved");
    } else {
      const attempts = data.attempts || 1;
      result.innerHTML = `<p class="names-hint">${data.hint.replace(/[<>"']/g, "")}</p><p class="names-attempts">attempt ${attempts}</p>`;
    }
  });

  input && input.focus();
})();
