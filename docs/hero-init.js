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

  /* The mounted hero, published on window so page scripts can drive it
     (a held modifier is released through keys.clear(), since the
     modifier caps are art and take no click). */
  window.CrosswayHero = CrosswayStage.mountHero({
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
    /* Automatic demo: the box over the keys. */
    demo: document.getElementById("cw-demo"),
  });

  /* The hint line's marquee: one thing to try at a time, read from the
     list the markup carries for a screen reader, written into the text
     span after the "Hint:" label (the label is markup, so the marquee
     must never write over it). */
  var ideasList = document.querySelector(".cw-hero-ideas");
  var ideaLine = document.querySelector(".cw-hero-idea-text");
  if (ideasList && ideaLine && CrosswayStage.createIdeas) {
    var items = Array.prototype.map.call(ideasList.children, function (li) { return li.textContent.trim(); });
    CrosswayStage.createIdeas({
      items: items,
      line: ideaLine,
      reduced: !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches),
    }).start();
  }
})();
