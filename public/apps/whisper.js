(function () {
  "use strict";
  const form = document.getElementById("whisper-form");
  const input = document.getElementById("whisper-input");
  const btn = document.getElementById("whisper-submit");
  const thread = document.getElementById("whisper-thread");

  function appendEntry(role, text) {
    const wrap = document.createElement("div");
    wrap.className = "whisper-entry " + role;
    const inner = document.createElement("p");
    inner.textContent = text;
    wrap.appendChild(inner);
    thread.prepend(wrap);
  }

  // Variant B uses local templates (no LLM cost). A uses Anthropic via /api/llm.
  const variant = document.body.dataset.variant || "A";

  const TEMPLATE_REPLIES = [
    "Even the lamp remembers a darker question.",
    "Speak again; the walls are slow listeners.",
    "What you carry is heavier than what you ask.",
    "The door you seek is two corridors closer than you think.",
    "Listen for the breath between your own words.",
    "The maze knows your name, but will not say it back.",
    "An ember replies in three soft sparks; count them.",
    "Step left, then forget you stepped at all.",
  ];

  async function reply(msg) {
    if (variant === "B") {
      return TEMPLATE_REPLIES[Math.floor(Math.random() * TEMPLATE_REPLIES.length)];
    }
    const r = await fetch("/api/llm/whisper", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: msg }),
    });
    if (!r.ok) {
      const e = await r.json().catch(() => ({}));
      if (e.error === "session cap reached") return "The wall is full of your voice. Return tomorrow.";
      if (e.error === "daily budget exceeded") return "The lamp has gone out for the night.";
      return "Silence answers, this time.";
    }
    const data = await r.json();
    return data.reply || "—";
  }

  form && form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = (input.value || "").trim();
    if (!msg) return;
    input.value = "";
    btn.disabled = true;
    appendEntry("you", msg);
    if (window.IM) IM.event("whisper-submit", { length: msg.length });
    const text = await reply(msg);
    appendEntry("maze", text);
    if (window.IM) IM.event("whisper-reply", { length: text.length });
    btn.disabled = false;
    input.focus();
  });

  input && input.focus();
})();
