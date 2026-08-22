/* crosswayapp.com's third secret: type the magic name anywhere on the
   page and the desktop becomes a phosphor terminal. Progressive
   enhancement only; with JavaScript off the mode simply never exists.
   The listener never prevents default behavior, so typing can't break
   anything.

   The terminal is an OVERRIDE, not a third value of the night setting.
   .hacker on <html> beats whatever the system prefers and whatever a
   forced .night or .day says (style.css's terminal section, which has
   to stay below the night rules — the two selectors have identical
   specificity and nothing but source order separates them), so leaving
   the mode drops the visitor back into exactly the appearance they
   already had. That is also why this file leaves "crossway-night"
   alone: the underlying light/dark choice is still in there, waiting.
   localStorage "crossway-hacker" holds "1" while the terminal is on
   and the key is removed when it is off. */
(function () {
  "use strict";

  var WORD = "liran";
  var KEY = "crossway-hacker";
  var buffer = "";
  var busy = false;

  function media(query) {
    return window.matchMedia ? window.matchMedia(query) : null;
  }
  var reduced = media("(prefers-reduced-motion: reduce)");

  function isOn() {
    return document.documentElement.classList.contains("hacker");
  }

  function setOn(on) {
    var root = document.documentElement.classList;
    if (on) {
      root.add("hacker");
    } else {
      root.remove("hacker");
    }
  }

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

  /* The flourish: drop an opaque cover, change the appearance BEHIND it,
     then bloom a phosphor beam open (or collapse it shut, on the way
     out) as the cover clears. The cover is what makes this read as a
     hard switch rather than a cross-fade — the page has already changed
     by the time anyone can see it again.

     Transform and opacity only, same discipline as the dissolve, so it
     stays on the compositor and never reflows the page. Removal is on a
     timeout rather than transitionend, which is how the dissolve does it
     too: a transitionend that never fires would strand the overlay on
     screen forever. */
  var FLOURISH_MS = 620; /* must outlast the CSS; longest chain is 540ms */

  function flourish(on) {
    busy = true;
    var overlay = document.createElement("div");
    overlay.className = on ? "crt" : "crt crt-off";
    overlay.setAttribute("aria-hidden", "true");
    var beam = document.createElement("div");
    beam.className = "beam";
    overlay.appendChild(beam);
    document.body.appendChild(overlay);

    setOn(on); /* the page changes while the cover hides it */
    persist(on);

    /* double rAF: let the cover paint before anything starts moving */
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        overlay.classList.add("go");
      });
    });

    setTimeout(function () {
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
      busy = false;
    }, FLOURISH_MS);
  }

  function trigger() {
    if (busy) {
      return; /* mid-switch: let it finish rather than stacking covers */
    }
    var on = !isOn();
    if (reduced && reduced.matches) {
      setOn(on); /* an instant cut is also the period-correct transition */
      persist(on);
      return;
    }
    flourish(on);
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

  /* Sync the class to storage. The inline head snippet already did this
     before first paint on a fresh load; this covers a stripped snippet
     and, via pageshow, bfcache restores whose frozen class predates a
     toggle made on another page. */
  function applyStored() {
    var stored;
    try {
      stored = localStorage.getItem(KEY);
    } catch (e) {
      return; /* storage unavailable: the session-only class stands */
    }
    setOn(stored === "1");
  }

  applyStored();
  window.addEventListener("pageshow", function (e) {
    if (e.persisted) { applyStored(); }
  });
})();
