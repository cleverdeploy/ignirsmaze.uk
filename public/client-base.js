// client-base.js — analytics + discovery framework for Ignir's Maze
// Available as window.IM on every public page.
(function () {
  "use strict";

  const SS_KEY = "im_view_id";

  function post(path, body) {
    return fetch(path, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body || {}),
      keepalive: true,
    }).catch(() => null);
  }

  const IM = {
    event(name, payload) {
      const appSlug = document.body.dataset.app || null;
      const variant = document.body.dataset.variant || null;
      const viewId = sessionStorage.getItem(SS_KEY);
      return post("/api/events", {
        name,
        app_slug: appSlug,
        variant,
        app_view_id: viewId ? Number(viewId) : null,
        payload: payload || null,
      });
    },

    discovery(app_slug, method) {
      return post("/api/discovery", { app_slug, method });
    },

    async startView() {
      const appSlug = document.body.dataset.app;
      const variant = document.body.dataset.variant || "A";
      if (!appSlug) return;
      const r = await post("/api/view/start", {
        app_slug: appSlug,
        variant,
      });
      try {
        const data = await r.json();
        if (data && data.app_view_id) {
          sessionStorage.setItem(SS_KEY, String(data.app_view_id));
        }
      } catch {}
    },

    endView() {
      const id = sessionStorage.getItem(SS_KEY);
      if (!id) return;
      sessionStorage.removeItem(SS_KEY);
      // Use sendBeacon for reliability on unload
      const blob = new Blob(
        [JSON.stringify({ app_view_id: Number(id) })],
        { type: "application/json" }
      );
      navigator.sendBeacon("/api/view/end", blob);
    },

    // Discovery trigger helpers
    onTripleClick(target, fn) {
      let count = 0;
      let timer = null;
      const handler = () => {
        count++;
        clearTimeout(timer);
        if (count >= 3) {
          count = 0;
          fn();
        } else {
          timer = setTimeout(() => (count = 0), 700);
        }
      };
      target.addEventListener("click", handler);
    },

    onBottomSwipe(fn) {
      let startX = 0, startY = 0, startTime = 0;
      const start = (e) => {
        const t = e.touches ? e.touches[0] : e;
        startX = t.clientX; startY = t.clientY; startTime = Date.now();
      };
      const end = (e) => {
        const t = e.changedTouches ? e.changedTouches[0] : e;
        const dx = t.clientX - startX;
        const dy = Math.abs(t.clientY - startY);
        const dt = Date.now() - startTime;
        const nearBottom = startY > window.innerHeight - 100;
        if (nearBottom && Math.abs(dx) > 180 && dy < 80 && dt < 800) fn();
      };
      window.addEventListener("touchstart", start, { passive: true });
      window.addEventListener("touchend", end, { passive: true });
      window.addEventListener("mousedown", start);
      window.addEventListener("mouseup", end);
    },

    onSustainedHover(target, ms, fn) {
      let timer = null;
      target.addEventListener("mouseenter", () => {
        timer = setTimeout(fn, ms);
      });
      target.addEventListener("mouseleave", () => {
        if (timer) clearTimeout(timer);
        timer = null;
      });
    },

    onKeyword(word, fn) {
      let buf = "";
      window.addEventListener("keydown", (e) => {
        if (document.activeElement && /^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName)) return;
        if (e.key.length === 1 && /^[a-z]$/i.test(e.key)) {
          buf = (buf + e.key.toLowerCase()).slice(-word.length);
          if (buf === word.toLowerCase()) {
            buf = "";
            fn();
          }
        } else if (e.key === "Escape" || e.key === " ") {
          buf = "";
        }
      });
    },

    onKonami(fn) {
      const seq = ["ArrowUp","ArrowUp","ArrowDown","ArrowDown","ArrowLeft","ArrowRight","ArrowLeft","ArrowRight","b","a"];
      let i = 0;
      window.addEventListener("keydown", (e) => {
        const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
        if (k === seq[i]) {
          i++;
          if (i === seq.length) { i = 0; fn(); }
        } else {
          i = (k === seq[0] ? 1 : 0);
        }
      });
    },

    onPathTrace(svgElement, fn) {
      // simple: detect mouse leaving via right edge after entering via left edge
      let entered = false;
      svgElement.addEventListener("mouseenter", (e) => {
        const rect = svgElement.getBoundingClientRect();
        if (e.clientX - rect.left < rect.width * 0.3) entered = true;
      });
      svgElement.addEventListener("mouseleave", (e) => {
        const rect = svgElement.getBoundingClientRect();
        if (entered && e.clientX - rect.left > rect.width * 0.7) fn();
        entered = false;
      });
    },

    pulse(then) {
      const flash = document.createElement("div");
      flash.style.cssText = "position:fixed;inset:0;background:radial-gradient(circle at center, rgba(244,162,97,0.35), transparent 70%);pointer-events:none;z-index:9999;opacity:0;transition:opacity 350ms ease";
      document.body.appendChild(flash);
      requestAnimationFrame(() => (flash.style.opacity = "1"));
      setTimeout(() => {
        flash.style.opacity = "0";
        setTimeout(() => {
          flash.remove();
          if (then) then();
        }, 350);
      }, 300);
    },
  };

  window.IM = IM;

  // Lifecycle for app pages
  if (document.body.dataset.app) {
    IM.startView();
    window.addEventListener("pagehide", () => IM.endView());
  }
})();
