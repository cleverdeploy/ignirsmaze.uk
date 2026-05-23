(function () {
  "use strict";
  const canvas = document.getElementById("cart-canvas");
  const ctx = canvas.getContext("2d");
  const clearBtn = document.getElementById("cart-clear");
  const nameBtn = document.getElementById("cart-name");
  const result = document.getElementById("cart-result");
  const mapList = document.getElementById("cart-map");

  function reset() {
    ctx.fillStyle = "#0a0805";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#f4a261";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }
  reset();

  let drawing = false;
  let lastX = 0, lastY = 0;
  let pointCount = 0;
  let boundsMinX = Infinity, boundsMinY = Infinity, boundsMaxX = -Infinity, boundsMaxY = -Infinity;
  const points = [];

  function pos(e) {
    const r = canvas.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    return { x: (t.clientX - r.left) * (canvas.width / r.width), y: (t.clientY - r.top) * (canvas.height / r.height) };
  }

  function start(e) {
    e.preventDefault();
    drawing = true;
    const p = pos(e);
    lastX = p.x; lastY = p.y;
  }
  function move(e) {
    if (!drawing) return;
    e.preventDefault();
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    lastX = p.x; lastY = p.y;
    points.push([p.x, p.y]);
    pointCount++;
    if (p.x < boundsMinX) boundsMinX = p.x;
    if (p.y < boundsMinY) boundsMinY = p.y;
    if (p.x > boundsMaxX) boundsMaxX = p.x;
    if (p.y > boundsMaxY) boundsMaxY = p.y;
  }
  function end() { drawing = false; }

  canvas.addEventListener("mousedown", start);
  canvas.addEventListener("mousemove", move);
  canvas.addEventListener("mouseup", end);
  canvas.addEventListener("mouseleave", end);
  canvas.addEventListener("touchstart", start, { passive: false });
  canvas.addEventListener("touchmove", move, { passive: false });
  canvas.addEventListener("touchend", end);

  // 32 evocative words from which names are composed.
  const PREFIXES = [
    "Stone", "Ember", "Ash", "Salt", "Hollow", "Iron", "Pale", "Mirror",
    "Quiet", "Shrouded", "Slow", "Crooked", "Long", "Bone", "Moth", "Lantern",
  ];
  const NOUNS = [
    "Atrium", "Gallery", "Hall", "Chamber", "Cell", "Vestry", "Antechamber",
    "Threshold", "Vault", "Garden", "Cloister", "Stair", "Cistern", "Mezzanine",
    "Reliquary", "Loggia",
  ];

  function nameFromHash() {
    // hash points + bounds
    let h = 2166136261;
    for (const [x, y] of points) {
      h = (h ^ Math.round(x)) * 16777619 >>> 0;
      h = (h ^ Math.round(y)) * 16777619 >>> 0;
    }
    h = (h ^ Math.round(boundsMaxX - boundsMinX)) * 16777619 >>> 0;
    h = (h ^ Math.round(boundsMaxY - boundsMinY)) * 16777619 >>> 0;
    const prefix = PREFIXES[h % PREFIXES.length];
    const noun = NOUNS[(h >>> 8) % NOUNS.length];
    return prefix + " " + noun;
  }

  const STORAGE_KEY = "im_cart_map";
  function loadMap() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
  }
  function saveMap(list) { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); }
  function renderMap() {
    const list = loadMap();
    mapList.innerHTML = list.length === 0
      ? '<li class="muted">no chambers yet</li>'
      : list.map((n) => `<li>${n.replace(/[<>"']/g, "")}</li>`).join("");
  }
  renderMap();

  clearBtn.addEventListener("click", () => {
    reset();
    points.length = 0;
    pointCount = 0;
    boundsMinX = Infinity; boundsMinY = Infinity; boundsMaxX = -Infinity; boundsMaxY = -Infinity;
    result.textContent = "";
    if (window.IM) IM.event("cart-erase");
  });

  nameBtn.addEventListener("click", () => {
    if (pointCount < 12) {
      result.textContent = "the line is too short for a name.";
      return;
    }
    const name = nameFromHash();
    result.textContent = "this is " + name + ".";
    const list = loadMap();
    if (!list.includes(name)) {
      list.unshift(name);
      saveMap(list.slice(0, 20));
      renderMap();
    }
    if (window.IM) IM.event("cart-name", { name, points: pointCount });
  });
})();
