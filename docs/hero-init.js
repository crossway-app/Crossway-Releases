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

  var keysWindow = document.querySelector(".cw-controls");
  var stage = document.querySelector(".cw-stage");
  var slot = document.querySelector(".cw-keys-slot");
  var machine = document.querySelector(".cw-machine");
  var bar = document.querySelector(".cw-mode-bar");
  var menubar = document.querySelector(".menubar");

  /* Where the stage stacks, the keys open UNDER the monitor, most often
     past the fold, so a visitor who turned the mode on would see nothing
     come out. So the page rides the opening: on every frame it is
     scrolled by the share of the window that is out, and the window rises
     into view as it is revealed, in one motion on the row's own curve,
     rather than opening out of sight and being fetched afterwards. The
     share is read off the slot's height, so the scroll cannot drift from
     the opening, whatever the curve or a dropped frame, and once the
     row's transition has ended the share is all of it, whatever the last
     frame's rounding left.

     It goes only as far as it takes to show the window's foot with a
     little paper under it, and never so far that the Interactive mode bar
     passes under the menu bar, where a window taller than the screen
     would take it: the bar is the way back out. It asks nothing of the
     page beside the monitor, when the window is already in view, on
     closing, or at load (a state the browser restores is drawn, never
     played), and it lets go the moment anything else moves the page, the
     visitor above all. With less motion asked for, the row opens in one
     frame and the page is simply put in its place. A visitor zoomed in
     with a pinch is panning a magnified view on purpose, and is left
     where they are.

     Nothing is measured in the click: the ride begins in the next frame,
     before it is drawn, which is also where the row starts to open (or,
     with less motion, is already open, so the page is placed in the frame
     the window first shows). Everything but the slot's height is measured
     then, once. The fold is the SMALL viewport (the phone's toolbars
     shown), so a toolbar coming back never covers the window's foot. What
     the sticky menu bar covers is the page's scroll padding for it or the
     bar's real foot, whichever is lower, since a menu bar that has wrapped
     taller than measured would otherwise hide the Interactive mode bar;
     scrollTo does not honour scroll padding, so it is counted here. The
     writes are plain scrollTo calls, which are instant because the page
     never sets `scroll-behavior: smooth` on its root (see the note on
     scroll-padding-top in style.css): a smooth root would turn every
     frame's write into an animation the next one cancels. One ride at a
     time: a new one, or the mode turned off, ends the one under way. */
  var AIR = 16;
  var SCROLL_KEYS = ["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "];
  var ride = null;
  function endRide() {
    if (ride) { ride.abort(); ride = null; }
  }
  function rideOpening() {
    endRide();
    if (!stage || !slot || !machine || !bar || !keysWindow || !stage.classList.contains("is-ready")) { return; }
    var quit = ride = new AbortController();
    requestAnimationFrame(function () {
      if (ride !== quit) { return; }
      if (!stage.classList.contains("is-interactive")) { return endRide(); }
      if (window.visualViewport && window.visualViewport.scale > 1.01) { return endRide(); }
      var s = slot.getBoundingClientRect();
      if (s.top < machine.getBoundingClientRect().bottom) { return endRide(); }
      var full = parseFloat(getComputedStyle(keysWindow).marginTop) + keysWindow.getBoundingClientRect().height;
      var menu = Math.max(parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0,
        menubar ? menubar.getBoundingClientRect().bottom : 0);
      var go = Math.min(s.top + full + AIR - document.documentElement.clientHeight, bar.getBoundingClientRect().top - menu);
      if (!(go > 0)) { return endRide(); }
      /* A row sent back part way and opened again starts part way out:
         the ride maps what is left of the way onto the whole of its
         scroll, so the page does not jump to catch up. */
      var out0 = Math.min(s.height / full, 0.999);
      var from = window.scrollY;
      var at = from;
      /* The visitor's own input ends the ride before its next write, so
         their first small scroll is never written over; the position
         check in each frame catches anything else that moves the page,
         such as a scrollbar dragged. */
      var heard = { passive: true, capture: true, signal: quit.signal };
      window.addEventListener("wheel", endRide, heard);
      window.addEventListener("touchstart", endRide, heard);
      window.addEventListener("resize", endRide, heard);
      window.addEventListener("keydown", function (e) { if (SCROLL_KEYS.indexOf(e.key) >= 0) { endRide(); } }, heard);
      (function frame() {
        if (ride !== quit) { return; }
        if (!stage.classList.contains("is-interactive") || Math.abs(window.scrollY - at) > 2) { return endRide(); }
        var out = slot.getAnimations().length ? Math.min(1, slot.getBoundingClientRect().height / full) : 1;
        var share = Math.max(0, (out - out0) / (1 - out0));
        window.scrollTo(window.scrollX, from + go * share);
        at = window.scrollY;
        if (share < 1) { requestAnimationFrame(frame); } else { endRide(); }
      })();
    });
  }

  /* Stacked, the slot cuts the window at its row's foot while the row
     opens, and gives the foot its shadows back only once the row is all
     the way open (style.css, the stacked block): that is the slot's
     is-out. All the way open is the row's own transition ending, or, with
     nothing to play (less motion asked for, or a state the browser
     restored at load), the first frame after the change; turned off, the
     mark goes at once. The frame is waited for so that nothing is
     measured in the click. A transition cut short (a resize across the
     breakpoint mid-way, or the mode turned back) ends in transitioncancel
     rather than transitionend, and is heard too: markOut then finds the
     row all the way open, or its new transition still running. */
  function markOut() {
    slot.classList.toggle("is-out", stage.classList.contains("is-interactive") && !slot.getAnimations().length);
  }
  if (slot && stage) {
    var settled = function (e) { if (e.target === slot) { markOut(); } };
    slot.addEventListener("transitionend", settled);
    slot.addEventListener("transitioncancel", settled);
  }
  function interactiveChanged(on) {
    if (!slot || !stage) { return; }
    if (on) {
      requestAnimationFrame(markOut);
      rideOpening();
    } else {
      slot.classList.remove("is-out");
      endRide();
    }
  }

  /* The mounted hero, published on window so page scripts can drive it
     (a held modifier is released through keys.clear()). */
  window.CrosswayHero = CrosswayStage.mountHero({
    root: root,
    status: document.getElementById("cw-status"),
    controls: keysWindow,
    /* The settings box is a sibling of the controls, not inside them. */
    settings: stage,
    /* The stage wears the modes: Native, for the display's power light,
       and Interactive, for the layout. */
    stage: stage,
    toggle: document.querySelector(".cw-toggle"),
    /* The film: the retro hero's own flipbooks, read out of its template. */
    reels: document.getElementById("retro-hero"),
    /* Interactive mode: the box under the monitor. Off, the automatic
       demo plays; on, it stops and the keys come out. */
    interactive: document.getElementById("cw-interactive"),
    onInteractive: interactiveChanged,
  });

})();
