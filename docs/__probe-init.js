/* throwaway probe wiring — mirrors hero-init.js but keeps the handle */
(function () {
  "use strict";
  if (typeof CrosswayStage === "undefined") { return; }
  var root = document.getElementById("cw-screen");
  if (!root) { return; }
  window.__hero = CrosswayStage.mountHero({
    root: root,
    status: document.getElementById("cw-status"),
    controls: document.querySelector(".cw-controls"),
    settings: document.querySelector(".cw-stage"),
    stage: document.querySelector(".cw-stage"),
    toggle: document.querySelector(".cw-toggle"),
    reels: document.getElementById("retro-hero"),
    demo: null
  });
})();
