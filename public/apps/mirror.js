(function () {
  "use strict";
  const stage = document.getElementById("mirror-stage");
  const status = document.getElementById("mirror-status");
  const cursorMine = document.getElementById("mirror-cursor-mine");
  const cursorOther = document.getElementById("mirror-cursor-other");
  const targetA = document.getElementById("mirror-target-a");
  const targetB = document.getElementById("mirror-target-b");

  if (!("BroadcastChannel" in window)) {
    status.textContent = "your browser does not support the mirror.";
    return;
  }

  const myRole = Math.random() < 0.5 ? "left" : "right";
  const myTarget = myRole === "left" ? "A" : "B";
  const otherTarget = myRole === "left" ? "B" : "A";
  const ch = new BroadcastChannel("ignir-mirror");

  let alive = false;
  let lastPing = 0;
  let other = { x: 0, y: 0, alive: false };

  function send(type, data) { ch.postMessage({ type, ...data, role: myRole, t: Date.now() }); }

  let mine = { x: 0, y: 0 };
  stage.addEventListener("mousemove", (e) => {
    const r = stage.getBoundingClientRect();
    mine.x = e.clientX - r.left;
    mine.y = e.clientY - r.top;
    cursorMine.style.transform = `translate(${mine.x}px, ${mine.y}px)`;
    send("move", { x: mine.x, y: mine.y });
  });

  ch.onmessage = (e) => {
    const d = e.data || {};
    if (d.role === myRole) return; // ignore my own
    if (d.type === "move") {
      other.x = d.x; other.y = d.y; other.alive = true;
      cursorOther.style.transform = `translate(${d.x}px, ${d.y}px)`;
      cursorOther.classList.add("active");
    } else if (d.type === "hello") {
      // respond so the other window knows we exist
      send("hello-ack", {});
    }
    if (!alive) {
      alive = true;
      status.textContent = "another window is here. find both glyphs together.";
      if (window.IM) IM.event("mirror-paired");
    }
    lastPing = Date.now();
  };

  send("hello", {});

  function distance(elem, x, y) {
    const r = elem.getBoundingClientRect();
    const sr = stage.getBoundingClientRect();
    const cx = (r.left + r.right) / 2 - sr.left;
    const cy = (r.top + r.bottom) / 2 - sr.top;
    return Math.hypot(cx - x, cy - y);
  }

  let won = false;
  setInterval(() => {
    if (won || !alive) return;
    if (Date.now() - lastPing > 4000) {
      alive = false;
      status.textContent = "the other window has gone quiet.";
      cursorOther.classList.remove("active");
      return;
    }
    const meOnMine = distance(myRole === "left" ? targetA : targetB, mine.x, mine.y) < 30;
    const otherOnTheirs = distance(myRole === "left" ? targetB : targetA, other.x, other.y) < 30;
    if (meOnMine && otherOnTheirs) {
      won = true;
      status.textContent = "the door, briefly, opens.";
      targetA.classList.add("lit");
      targetB.classList.add("lit");
      if (window.IM) IM.event("mirror-solved");
    }
  }, 120);
})();
