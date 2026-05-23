(function () {
  "use strict";
  const counterEl = document.getElementById("stone-counter");
  const button = document.getElementById("stone-button");
  const eventsEl = document.getElementById("stone-events");

  // Variant B doubles the tick interval — half-speed.
  const variant = button.dataset.variant || "A";
  const TICK_MS = variant === "B" ? 2000 : 1000;

  let count = 0;
  let waiting = false;
  let timer = null;
  let eventTimer = null;

  const RARE_EVENTS = [
    "a flicker.",
    "a footstep, somewhere above.",
    "the lamp gutters, then steadies.",
    "you hear someone exhale.",
    "the temperature drops, briefly.",
    "an ember falls from nothing.",
    "a draft. then nothing.",
    "you almost remember why you came in.",
    "the stone, you realise, has been warm this whole time.",
    "a small bell, three corridors away. then silence.",
  ];

  function showEvent(text) {
    const p = document.createElement("p");
    p.className = "stone-event";
    p.textContent = text;
    eventsEl.prepend(p);
    requestAnimationFrame(() => p.classList.add("show"));
    if (window.IM) IM.event("stone-rare-event", { text });
  }

  function scheduleEvent() {
    // 60-1800s; uniform random
    const delay = 60_000 + Math.random() * 1740_000;
    clearTimeout(eventTimer);
    eventTimer = setTimeout(() => {
      if (waiting) {
        const t = RARE_EVENTS[Math.floor(Math.random() * RARE_EVENTS.length)];
        showEvent(t);
        scheduleEvent();
      }
    }, delay);
  }

  function tick() {
    count++;
    counterEl.textContent = String(count);
    if (count === 30 && window.IM) IM.event("stone-30s");
    if (count === 60 && window.IM) IM.event("stone-1min");
    if (count === 300 && window.IM) IM.event("stone-5min");
    if (count === 600 && window.IM) IM.event("stone-10min");
  }

  function start() {
    if (waiting) return;
    waiting = true;
    button.textContent = "stop waiting";
    button.classList.add("active");
    timer = setInterval(tick, TICK_MS);
    if (window.IM) IM.event("stone-start", { variant });
    scheduleEvent();
  }

  function stop() {
    if (!waiting) return;
    waiting = false;
    clearInterval(timer);
    clearTimeout(eventTimer);
    button.textContent = "wait";
    button.classList.remove("active");
    if (window.IM) IM.event("stone-stop", { count });
  }

  button.addEventListener("click", () => {
    if (waiting) stop(); else start();
  });

  window.addEventListener("pagehide", stop);
})();
