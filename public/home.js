// Home page — cycling phrase + flick-an-ember-into-a-hole game.
(function () {
  "use strict";

  // ── 1. Cycling phrase (decorative only — no longer a trigger) ───────────
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

  // ── 2. Ball-and-holes game ──────────────────────────────────────────────
  const field = document.getElementById("play-field");
  const ball = document.getElementById("ball");
  const aim = document.getElementById("aim-line");
  if (!field || !ball) return;

  const FRICTION = 0.985;          // velocity multiplier per ~16ms frame
  const BOUNCE_DAMP = 0.78;        // velocity multiplier after edge bounce
  const STOP_SPEED = 0.05;         // pixels/ms — below this we consider stopped
  const RESPAWN_DELAY = 700;       // ms after stop/off-screen before respawn
  const HOLE_RADIUS = 22;          // hit-zone radius (pixels)
  const VEL_SCALE = 1.0;           // release velocity scale
  const MAX_SPEED = 3.5;           // px/ms cap (very fast)
  const VEL_SAMPLE_MS = 90;        // moving window for drag velocity

  let state = "idle";              // idle | dragging | flying | sunk | respawning
  let pos = { x: 0, y: 0 };        // ball center, in field-local pixels
  let vel = { x: 0, y: 0 };        // pixels per millisecond
  let dragStart = null;            // { x, y, t }
  let dragSamples = [];            // [{x,y,t}, ...] within VEL_SAMPLE_MS window
  let lastFrame = 0;

  function fieldRect() { return field.getBoundingClientRect(); }
  function ballRadius() {
    return ball.offsetWidth / 2;
  }

  function placeBall(x, y) {
    pos.x = x;
    pos.y = y;
    ball.style.transform = `translate(${x - ballRadius()}px, ${y - ballRadius()}px)`;
  }

  function spawn() {
    const r = fieldRect();
    placeBall(r.width / 2, r.height - 80);
    vel.x = 0; vel.y = 0;
    state = "idle";
    ball.classList.remove("flying", "dragging");
    aim.style.display = "none";
    if (window.IM) IM.event("ball-spawn");
  }

  function clientToField(clientX, clientY) {
    const r = fieldRect();
    return { x: clientX - r.left, y: clientY - r.top };
  }

  // ── pointer handling ────────────────────────────────────────────────────
  function onPointerDown(e) {
    if (state !== "idle") return;
    e.preventDefault();
    const t = e.touches ? e.touches[0] : e;
    const p = clientToField(t.clientX, t.clientY);
    dragStart = { x: p.x, y: p.y, t: performance.now() };
    dragSamples = [{ x: p.x, y: p.y, t: dragStart.t }];
    state = "dragging";
    ball.classList.add("dragging");
    aim.style.display = "block";
    try { ball.setPointerCapture && e.pointerId && ball.setPointerCapture(e.pointerId); } catch {}
  }

  function onPointerMove(e) {
    if (state !== "dragging") return;
    e.preventDefault();
    const t = e.touches ? e.touches[0] : e;
    const now = performance.now();
    const p = clientToField(t.clientX, t.clientY);

    // Move the ball to follow finger/cursor; aim line shows velocity direction.
    placeBall(p.x, p.y);

    dragSamples.push({ x: p.x, y: p.y, t: now });
    // Trim to window
    while (dragSamples.length > 1 && now - dragSamples[0].t > VEL_SAMPLE_MS) {
      dragSamples.shift();
    }

    // aim line: from start to current
    const lineEl = aim.querySelector("line");
    if (lineEl) {
      lineEl.setAttribute("x1", dragStart.x);
      lineEl.setAttribute("y1", dragStart.y);
      lineEl.setAttribute("x2", p.x);
      lineEl.setAttribute("y2", p.y);
    }
  }

  function onPointerUp(e) {
    if (state !== "dragging") return;
    e.preventDefault();
    const now = performance.now();
    // Compute release velocity from the sample window
    let v = { x: 0, y: 0 };
    if (dragSamples.length >= 2) {
      const first = dragSamples[0];
      const last = dragSamples[dragSamples.length - 1];
      const dt = Math.max(1, last.t - first.t);
      v.x = ((last.x - first.x) / dt) * VEL_SCALE;
      v.y = ((last.y - first.y) / dt) * VEL_SCALE;
    }
    // Cap speed
    const sp = Math.hypot(v.x, v.y);
    if (sp > MAX_SPEED) {
      v.x = (v.x / sp) * MAX_SPEED;
      v.y = (v.y / sp) * MAX_SPEED;
    }
    if (sp < 0.05) {
      // basically no velocity — just snap back
      state = "respawning";
      ball.classList.remove("dragging");
      aim.style.display = "none";
      setTimeout(spawn, 200);
      return;
    }
    vel = v;
    state = "flying";
    ball.classList.remove("dragging");
    ball.classList.add("flying");
    aim.style.display = "none";
    if (window.IM) IM.event("ball-flick", { vx: +v.x.toFixed(3), vy: +v.y.toFixed(3) });
  }

  function onPointerCancel() {
    if (state === "dragging") {
      ball.classList.remove("dragging");
      aim.style.display = "none";
      spawn();
    }
  }

  // ── physics loop ────────────────────────────────────────────────────────
  let lastStopAt = 0;
  function frame(now) {
    if (!lastFrame) lastFrame = now;
    const dt = Math.min(64, now - lastFrame); // ms
    lastFrame = now;

    if (state === "flying") {
      // integrate
      pos.x += vel.x * dt;
      pos.y += vel.y * dt;

      // friction
      const fric = Math.pow(FRICTION, dt / 16);
      vel.x *= fric;
      vel.y *= fric;

      // edge bounce
      const r = fieldRect();
      const rad = ballRadius();
      if (pos.x < rad) { pos.x = rad; vel.x = -vel.x * BOUNCE_DAMP; bounceFx(); }
      if (pos.x > r.width - rad) { pos.x = r.width - rad; vel.x = -vel.x * BOUNCE_DAMP; bounceFx(); }
      if (pos.y < rad) { pos.y = rad; vel.y = -vel.y * BOUNCE_DAMP; bounceFx(); }
      if (pos.y > r.height - rad) { pos.y = r.height - rad; vel.y = -vel.y * BOUNCE_DAMP; bounceFx(); }

      // hole collision: any hole whose center is within HOLE_RADIUS of ball center
      const holes = field.querySelectorAll(".hole");
      for (const h of holes) {
        const hr = h.getBoundingClientRect();
        const hx = hr.left - r.left + hr.width / 2;
        const hy = hr.top - r.top + hr.height / 2;
        const d = Math.hypot(hx - pos.x, hy - pos.y);
        if (d < HOLE_RADIUS) {
          sink(h);
          break;
        }
      }

      ball.style.transform = `translate(${pos.x - rad}px, ${pos.y - rad}px)`;

      // stopped?
      if (Math.hypot(vel.x, vel.y) < STOP_SPEED) {
        if (!lastStopAt) lastStopAt = now;
        if (now - lastStopAt > RESPAWN_DELAY) {
          lastStopAt = 0;
          state = "respawning";
          if (window.IM) IM.event("ball-miss");
          setTimeout(spawn, 200);
        }
      } else {
        lastStopAt = 0;
      }
    }

    requestAnimationFrame(frame);
  }

  function bounceFx() {
    ball.classList.add("bounced");
    setTimeout(() => ball.classList.remove("bounced"), 120);
    if (window.IM) IM.event("ball-bounce");
  }

  function sink(holeEl) {
    if (state === "sunk") return;
    state = "sunk";
    const slug = holeEl.dataset.slug;
    holeEl.classList.add("sunk");
    ball.classList.add("sunk");
    if (window.IM) IM.event("ball-hole-hit", { slug });
    if (window.IM) IM.discovery(slug, "ball-flick");
    if (window.IM) {
      IM.pulse(() => { location.href = "/m/" + slug; });
    } else {
      setTimeout(() => { location.href = "/m/" + slug; }, 250);
    }
  }

  // Bind events
  ball.addEventListener("mousedown", onPointerDown);
  ball.addEventListener("touchstart", onPointerDown, { passive: false });
  window.addEventListener("mousemove", onPointerMove);
  window.addEventListener("touchmove", onPointerMove, { passive: false });
  window.addEventListener("mouseup", onPointerUp);
  window.addEventListener("touchend", onPointerUp);
  window.addEventListener("touchcancel", onPointerCancel);

  // Reposition on resize
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (state === "idle") spawn();
    }, 200);
  });

  // Boot
  spawn();
  requestAnimationFrame(frame);
})();
