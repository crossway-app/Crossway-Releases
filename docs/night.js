/* crosswayapp.com's secret: type the magic word anywhere on the page to
   toggle the night appearance. Progressive enhancement only; with
   JavaScript off the site simply follows the system appearance. The
   listener never prevents default behavior, so typing can't break
   anything.

   Three states, shared with style.css and the pages' inline head
   snippets: no class on <html> follows the system, .night forces dark,
   .day forces light. localStorage "crossway-night" holds "1" (night) or
   "0" (day) only while an override is in force; a toggle that lands
   back on the system's own side clears it, so the page tracks live
   system flips again. */
(function () {
  "use strict";

  var WORD = "adam";
  var KEY = "crossway-night";
  var buffer = "";
  var busy = false;

  function media(query) {
    return window.matchMedia ? window.matchMedia(query) : null;
  }
  var reduced = media("(prefers-reduced-motion: reduce)");
  var systemNight = media("(prefers-color-scheme: dark)");

  function persist(value) {
    try {
      if (value === null) {
        localStorage.removeItem(KEY);
      } else {
        localStorage.setItem(KEY, value);
      }
    } catch (e) {
      /* storage unavailable: session-only is fine */
    }
  }

  /* The appearance showing right now: a forced class wins, otherwise
     it's whatever the system prefers. */
  function isNight() {
    var root = document.documentElement.classList;
    if (root.contains("night")) { return true; }
    if (root.contains("day")) { return false; }
    return !!(systemNight && systemNight.matches);
  }

  function toggle() {
    var toNight = !isNight();
    var root = document.documentElement.classList;
    root.remove("night");
    root.remove("day");
    if (systemNight && systemNight.matches === toNight) {
      persist(null); /* back on the system's side: follow it again */
    } else {
      root.add(toNight ? "night" : "day");
      persist(toNight ? "1" : "0");
    }
    reflect();
  }

  /* The lamp in the menubar (2026-09-03): the same toggle as the word,
     for the visitor who never types it, and WITHOUT the dissolve. The
     tiles falling away are the word's reward; the lamp is a lamp, and a
     lamp goes off with a click. Its drawing follows the appearance in
     CSS, so all the script keeps true is what a screen reader is told:
     checked while the lights are on. */
  function lamps() {
    return document.querySelectorAll ? document.querySelectorAll(".lamp") : [];
  }
  function reflect() {
    var on = !isNight();
    var all = lamps();
    for (var i = 0; i < all.length; i++) {
      all[i].setAttribute("aria-checked", on ? "true" : "false");
    }
  }
  function lampClicked(e) {
    var t = e.target;
    var lamp = t && t.closest ? t.closest(".lamp") : null;
    if (!lamp) { return; }
    /* Inert in the terminal for the reason trigger() is: the flip would
       change nothing the visitor can see. And not under a dissolve. */
    if (document.documentElement.classList.contains("hacker")) { return; }
    if (busy) { return; }
    toggle();
  }

  /* The flourish: cover the view in square tiles wearing the OUTGOING
     desktop pattern, flip the mode beneath, then let the tiles fall
     away. Transform/opacity only, so it stays on the compositor. */
  function dissolve() {
    busy = true;
    var wasNight = isNight();
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
    /* The terminal owns the appearance while it is on: its tokens beat
       every light and dark value here, so flipping the state would play
       the whole dissolve and change nothing the visitor can see. Stay
       inert and let the terminal's own word be the way out. The state
       itself is untouched, so it is still there to come back to. */
    if (document.documentElement.classList.contains("hacker")) {
      return;
    }
    if (busy) {
      return;
    }
    if (reduced && reduced.matches) {
      toggle(); /* instant cut — also the period-correct transition */
      return;
    }
    dissolve();
  }

  document.addEventListener("click", lampClicked);
  if (systemNight && systemNight.addEventListener) {
    systemNight.addEventListener("change", reflect); /* a system flip moves the lamp too */
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

  /* Sync the classes to storage — the full re-derive, removals
     included. The inline head snippet already did the add before first
     paint on a fresh load; this covers a stripped snippet and, via
     pageshow, bfcache restores whose frozen classes predate a toggle
     made on another page. Removals are BY NAME on purpose: other
     classes live on this element too — the terminal's appearance, and
     the retro hero's pre-paint flag — and clearing the class list
     wholesale here would strip them. */
  function applyStored() {
    var stored;
    try {
      stored = localStorage.getItem(KEY);
    } catch (e) {
      return; /* storage unavailable: session-only classes stand */
    }
    var root = document.documentElement.classList;
    root.remove("night");
    root.remove("day");
    if (stored === "1") {
      root.add("night");
    } else if (stored === "0") {
      root.add("day");
    }
    reflect();
  }

  applyStored();
  window.addEventListener("pageshow", function (e) {
    if (e.persisted) { applyStored(); }
  });
})();
