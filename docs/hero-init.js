/* Starts the hero. Kept apart from stage.js so that file stays the engine
   and this stays the wiring: what to build, and out of which elements.

   Everything is looked up rather than assumed — on a page without the
   hero this does nothing at all, which is what lets stage.js be loaded
   anywhere without carrying a dependency on one page's markup. */
(function () {
  "use strict";
  if (typeof CrosswayStage === "undefined") { return; }
  var root = document.getElementById("cw-screen");
  if (!root) { return; }

  CrosswayStage.mountHero({
    root: root,
    status: document.getElementById("cw-status"),
    controls: document.querySelector(".cw-controls"),
    /* The settings box is a sibling of the controls, not inside them. */
    settings: document.querySelector(".cw-stage"),
    /* The stage wears the mode, for the display's power light. */
    stage: document.querySelector(".cw-stage"),
    toggle: document.querySelector(".cw-toggle"),
    /* The film: the retro hero's own flipbooks, read out of its template. */
    reels: document.getElementById("retro-hero"),
    /* Demo mode: the box over the keys. */
    demo: document.getElementById("cw-demo"),
  });
})();
