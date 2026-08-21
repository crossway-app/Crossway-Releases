/* crosswayapp.com's hero demos: the "Switch apps" and "Switch windows"
   figures respond to the visitor's pointer. Progressive enhancement
   only; without this file the figures are exactly their static selves.
   This script only flips data attributes — every visible motion lives
   in style.css as compositor-friendly transform/opacity transitions
   and keyframes. No animation loops run here.

   State is sticky on purpose: there is no pointerleave handler, so
   whatever the visitor last selected simply stays when the pointer
   moves on. That is also the whole touch story — a tap selects and
   everything remains. */
(function () {
  "use strict";

  /* Hovering (or tapping) a hit band moves the figure's selection
     ring: data-sel on the SVG picks one of the CSS transform rules,
     and the ring's transition retargets mid-flight, so a fast sweep
     across the row reads as one smooth trailing glide. */
  function wireSelection(svg, indexAttr, onSelect) {
    if (!svg) { return; }
    var hits = svg.querySelectorAll(".demo-hit");
    function select(e) {
      var idx = e.currentTarget.getAttribute(indexAttr);
      svg.setAttribute("data-sel", idx);
      if (onSelect) { onSelect(idx); }
    }
    for (var i = 0; i < hits.length; i++) {
      hits[i].addEventListener("pointerenter", select);
      hits[i].addEventListener("click", select);
    }
  }

  /* The left figure: the ring follows the pointer at once, but the
     strip beneath waits for the selection to SETTLE — the figure's
     own previewDelay. Every selection change restarts one 220 ms
     timer; while the pointer keeps moving, the last settled strip
     stays untouched (no open/close churn), and only a rested
     selection swaps it. The demo-live class arms the bloom animation
     from the first swap on, so the initial page paint stays exactly
     the static figure. */
  var apps = document.getElementById("demo-apps");
  var settleTimer = null;
  wireSelection(apps, "data-app", function (idx) {
    /* demo-live arms the CSS crossfade rules. Added at the first
       SELECTION — visually inert until a swap — rather than at the
       swap itself: @starting-style resolves against the class list
       in place before the swap's style update, so arming in the
       same update as the first swap skips that swap's fade-in
       (observed in Chrome). First paint stays the static figure. */
    apps.classList.add("demo-live");
    if (settleTimer !== null) { clearTimeout(settleTimer); }
    settleTimer = setTimeout(function () {
      settleTimer = null;
      if (apps.getAttribute("data-strip") !== idx) {
        apps.setAttribute("data-strip", idx);
      }
    }, 220);
  });

  /* The right figure: only the ring moves — six windows, two axes,
     no settle gate (there is nothing further to reveal). */
  wireSelection(document.getElementById("demo-windows"), "data-win");

  /* Efficiency: the movies stand still whenever the hero figures
     leave the viewport, so a reader far down the page pays nothing
     for them (parked tabs the browser throttles on its own).
     Browsers without IntersectionObserver just let the movies run —
     an acceptable floor. */
  var duo = document.querySelector(".window-duo");
  if (duo && "IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      duo.classList.toggle("offstage", !entries[0].isIntersecting);
    }).observe(duo);
  }
})();
