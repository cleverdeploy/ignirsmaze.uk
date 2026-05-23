(function () {
  "use strict";
  const room = document.getElementById("lantern-room");
  const fragsEl = document.getElementById("lantern-fragments");
  const counter = document.getElementById("lantern-count");

  const FRAGMENTS = [
    "I remember the cold from the inside of my hands.",
    "She left her name written in candle-soot.",
    "There is a room at the end with no door.",
    "The maze breathes in eights.",
    "Three lamps have gone out this week.",
    "He counted his footsteps until he forgot why.",
    "The walls are kinder than the corridors.",
    "It will be quiet when you find it.",
  ];

  // 8 glyphs at deterministic-but-scattered positions
  const positions = [
    [12, 22], [28, 64], [45, 18], [62, 48],
    [78, 30], [88, 70], [18, 82], [55, 80],
  ];

  const lamp = document.createElement("div");
  lamp.className = "lantern-lamp";
  room.appendChild(lamp);

  const revealed = new Set();
  function updateCount() {
    counter.textContent = revealed.size + " / 8 revealed";
  }

  positions.forEach((p, i) => {
    const g = document.createElement("div");
    g.className = "lantern-glyph";
    g.style.left = p[0] + "%";
    g.style.top = p[1] + "%";
    g.dataset.index = String(i);
    g.textContent = "✶";
    room.appendChild(g);
  });

  let lastX = 0, lastY = 0;
  function moveLamp(x, y) {
    lamp.style.transform = `translate(${x}px, ${y}px)`;
    // Check glyphs within radius
    const r = room.getBoundingClientRect();
    const cx = x;
    const cy = y;
    const RADIUS = 90;
    const glyphs = room.querySelectorAll(".lantern-glyph");
    glyphs.forEach((g) => {
      const gx = g.offsetLeft + g.offsetWidth / 2;
      const gy = g.offsetTop + g.offsetHeight / 2;
      const dx = gx - cx;
      const dy = gy - cy;
      const d = Math.hypot(dx, dy);
      if (d < RADIUS) {
        const opacity = Math.max(0, 1 - d / RADIUS);
        g.style.opacity = String(opacity);
        if (opacity > 0.65 && !g.classList.contains("revealed")) {
          g.classList.add("revealed");
          const idx = Number(g.dataset.index);
          revealed.add(idx);
          // Reveal fragment
          const p = document.createElement("p");
          p.className = "lantern-fragment";
          p.textContent = FRAGMENTS[idx];
          fragsEl.prepend(p);
          updateCount();
          if (window.IM) IM.event("lantern-reveal", { index: idx });
          if (revealed.size === FRAGMENTS.length) {
            if (window.IM) IM.event("lantern-complete");
          }
        }
      } else if (!g.classList.contains("revealed")) {
        g.style.opacity = "0";
      }
    });
  }

  function onMove(e) {
    const r = room.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    if (!t) return;
    const x = t.clientX - r.left;
    const y = t.clientY - r.top;
    lastX = x; lastY = y;
    moveLamp(x, y);
  }

  room.addEventListener("mousemove", onMove);
  room.addEventListener("touchmove", onMove, { passive: true });

  // initial position
  setTimeout(() => moveLamp(40, 40), 100);
  updateCount();
})();
