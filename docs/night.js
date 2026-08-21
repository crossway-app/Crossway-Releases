/* crosswayapp.com's secret: type the magic word anywhere on the page to
   toggle the night appearance. Progressive enhancement only; without
   this file the site is exactly its light self. The listener never
   prevents default behavior, so typing can't break anything. */
(function () {
  "use strict";

  var WORD = "adam";
  var KEY = "crossway-night";
  var buffer = "";

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

  document.addEventListener("keydown", function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) { return; }
    var t = e.target;
    if (t && (t.isContentEditable || t.tagName === "INPUT" ||
              t.tagName === "TEXTAREA" || t.tagName === "SELECT")) { return; }
    if (!e.key || e.key.length !== 1) { return; } /* letters only */
    buffer = (buffer + e.key.toLowerCase()).slice(-WORD.length);
    if (buffer === WORD) {
      buffer = "";
      toggle();
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
