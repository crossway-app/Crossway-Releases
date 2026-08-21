/* crosswayapp.com's secret: type the magic word anywhere on the page to
   toggle the night appearance. Progressive enhancement only; without
   this file the site is exactly its light self. The listener never
   prevents default behavior, so typing can't break anything. */
(function () {
  "use strict";

  var WORD = "adam";
  var KEY = "crossway-night";
  var buffer = "";
  var busy = false;
  var reduced = window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)")
    : null;

  function persist(on) {
    try {
      if (on) {
        localStorage.setItem(KEY, "1");
      } else {
        localStorage.removeItem(KEY);
      }
    } catch (e) {
      /* storage unavailable: session-only is fine */
    }
  }

  function toggle() {
    var on = !document.documentElement.classList.contains("night");
    document.documentElement.classList.toggle("night", on);
    persist(on);
  }

  /* The flourish: cover the view in square tiles wearing the OUTGOING
     desktop pattern, flip the mode beneath, then let the tiles fall
     away. Transform/opacity only, so it stays on the compositor. */
  function dissolve() {
    busy = true;
    var wasNight = document.documentElement.classList.contains("night");
    var overlay = document.createElement("div");
    overlay.className = "dissolve " + (wasNight ? "from-night" : "from-light");
    overlay.setAttribute("aria-hidden", "true");

    var w = window.innerWidth;
    var h = window.innerHeight;
    var size = 90;
    var cols = Math.ceil(w / size);
    var rows = Math.ceil(h / size);
    while (cols * rows > 250) {
      size += 30;
      cols = Math.ceil(w / size);
      rows = Math.ceil(h / size);
    }
    overlay.style.gridTemplateColumns = "repeat(" + cols + ", 1fr)";
    overlay.style.gridTemplateRows = "repeat(" + rows + ", 1fr)";

    var tiles = [];
    for (var i = 0; i < cols * rows; i++) {
      var t = document.createElement("div");
      t.className = "tile";
      tiles.push(t);
      overlay.appendChild(t);
    }
    document.body.appendChild(overlay);
    toggle(); /* the page beneath flips in the same frame */

    /* double rAF: let the tiles paint before they start falling */
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        for (var i = 0; i < tiles.length; i++) {
          var t = tiles[i];
          var dx = (Math.random() - 0.5) * 300;
          var dy = 250 + Math.random() * 450;
          var rot = (Math.random() - 0.5) * 240;
          t.style.transitionDelay = (Math.random() * 0.25).toFixed(3) + "s";
          t.style.transform =
            "translate(" + dx.toFixed(0) + "px," + dy.toFixed(0) + "px) " +
            "rotate(" + rot.toFixed(0) + "deg)";
          t.className = "tile gone";
        }
      });
    });

    /* removal by timeout (max delay 0.25s + duration 0.45s, plus margin)
       — robust even if a transitionend never fires */
    setTimeout(function () {
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
      busy = false;
    }, 900);
  }

  function trigger() {
    if (busy) {
      return;
    }
    if (reduced && reduced.matches) {
      toggle(); /* instant cut — also the period-correct transition */
      return;
    }
    dissolve();
  }

  document.addEventListener("keydown", function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) { return; }
    var t = e.target;
    if (t && (t.isContentEditable || t.tagName === "INPUT" ||
              t.tagName === "TEXTAREA" || t.tagName === "SELECT")) { return; }
    if (!e.key || e.key.length !== 1) { return; } /* letters only */
    buffer = (buffer + e.key.toLowerCase()).slice(-WORD.length);
    if (buffer === WORD) {
      buffer = "";
      trigger();
    }
  });

  /* Safety net: the inline head snippet normally applied the stored
     class before first paint; re-assert in case it was stripped. */
  try {
    if (localStorage.getItem(KEY) === "1") {
      document.documentElement.classList.add("night");
    }
  } catch (e) { /* fine */ }
})();
