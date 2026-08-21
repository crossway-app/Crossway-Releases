/* crosswayapp.com's other secret: type the magic name anywhere on the
   page and a certain green super-soldier pays the desktop a visit.
   Three acts, one typing of the name apiece:

     act 1 — he walks in along the back of the stage, notices the
             camera, and sprints right up to it;
     act 2 — his co-op partner arrives at a dead run and delivers the
             one-hit melee from behind (a time-honored co-op courtesy),
             then leaves the scene; the body stays;
     act 3 — he gets up, shakes it off, and runs off over the page to
             the right. The stage is struck and act 1 can play again.

   Progressive enhancement only, same listener discipline as night.js:
   never preventDefault, typing in inputs is ignored, and shortcuts
   pass through untouched. Everything is built on demand and removed
   afterwards; while idle this file costs one keydown listener.

   The sprites are drawn HERE, as pixel grids — one char per pixel on
   a 32x32 canvas, feet on the bottom row. Edit them in place; each
   row of adjacent same-color pixels becomes one SVG rect at runtime.
   Motion is wrapper transforms + CSS cuts in style.css (the .cameo-*
   rules): translate(Xvw, -Yvh) scale(s) on a zero-size stage-floor
   anchor reads as "feet at X/Y, s away from the camera". */
(function () {
  "use strict";

  var WORD = "sam";
  var buffer = "";
  var act = 0;      /* 0 empty stage, 1 chief standing, 2 chief down */
  var busy = false;

  function media(query) {
    return window.matchMedia ? window.matchMedia(query) : null;
  }
  var reduced = media("(prefers-reduced-motion: reduce)");

  /* The palette keeps its exact colors in night mode, like the pixel
     heart: d dark olive, g armor green, l light green, k undersuit,
     v visor, w visor glint, r rifle steel, q rifle dark. */
  var PALETTE = {
    d: "#2b3722",
    g: "#5a7148",
    l: "#8ba06e",
    k: "#171b16",
    v: "#e89b2d",
    w: "#f7d98d",
    r: "#565d64",
    q: "#23272b"
  };

  var FRAMES = {
    idle: [
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "............dddddddd............",
      "...........dggggggggd...........",
      "..........dggllllllggd..........",
      "..........dglwwvvvvvgd..........",
      "..........dgvvvvvvvvgd..........",
      "..........dggkvvvvkggd..........",
      "..........dggggkkggggd..........",
      "...........dggggggggd...........",
      "............dkkkkkkd............",
      "........ddgggkkkkkkggqrq........",
      ".......dgglgggggggqrrqgd........",
      ".......dglgggllrrrrggggld.......",
      ".......dggdgrrrrlllggdggd.......",
      ".......dggdqqgqqgggggdggd.......",
      "........dd.dggggggggd.dd........",
      "...........dggkkkkggd...........",
      "...........dggkkkkggd...........",
      "...........dggd..dggd...........",
      "..........dggd....dggd..........",
      "..........dggd....dggd..........",
      "..........dkkd....dkkd..........",
      "..........dggd....dggd..........",
      "..........dggd....dggd..........",
      "..........dggd....dggd..........",
      ".........dgggd....dgggd.........",
      ".........dgggd....dgggd.........",
      ".........dddd......dddd........."
    ],
    frontA: [
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "............dddddddd............",
      "...........dggggggggd...........",
      "..........dggllllllggd..........",
      "..........dglwwvvvvvgd..........",
      "..........dgvvvvvvvvgd..........",
      "..........dggkvvvvkggd..........",
      "..........dggggkkggggd..........",
      "...........dggggggggd...........",
      "............dkkkkkkd............",
      "........ddgggkkkkkkggqrq........",
      ".......dgglgggggggqrrqgd........",
      ".......dglgggllrrrrgggld........",
      "........dddgrrrrlllgdddd........",
      "..........dqqgqqggggd...........",
      "..........dggkkkkkkggd..........",
      "..........dggkd..dkggd..........",
      "..........dggd....dggd..........",
      ".........dggd....dgggd..........",
      ".........dkkd...dggggd..........",
      ".........dggd...dkkdd...........",
      ".........dggd..dggd.............",
      "........dgggd..dggd.............",
      "........dgggd...dd..............",
      "........dddd...................."
    ],
    frontB: [
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "............dddddddd............",
      "...........dggggggggd...........",
      "..........dggllllllggd..........",
      "..........dglwwvvvvvgd..........",
      "..........dgvvvvvvvvgd..........",
      "..........dggkvvvvkggd..........",
      "..........dggggkkggggd..........",
      "...........dggggggggd...........",
      "............dkkkkkkd............",
      "........ddgggkkkkkkggqrq........",
      ".......dgglgggggggqrrqgd........",
      "........dlgggllrrrrggld.........",
      "........dddgrrrrlllgddd.........",
      "..........dqqgqqggggd...........",
      "..........dggkkkkkkggd..........",
      "..........dggkd..dkggd..........",
      "..........dggd....dggd..........",
      "..........dgggd....dggd.........",
      "..........dggggd...dkkd.........",
      "...........ddkkd...dggd.........",
      ".............dggd..dggd.........",
      ".............dggd..dgggd........",
      "..............dd...dgggd........",
      "....................dddd........"
    ],
    walkA: [
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "............ddddddd.............",
      "...........dgggggggd............",
      "..........dggllllgggd...........",
      "..........dggwwvvvvgd...........",
      "..........dggvvvvvvgd...........",
      "..........dgggkkvvkgd...........",
      "...........dggggkkgd............",
      "............dkkkkkd.............",
      "..........ddgggggggdd...........",
      ".........dgggglllggggd..........",
      ".........dggggllllgggd..........",
      ".........dggggggggggdd..........",
      ".........dggdggggqrrrrrrrrq.....",
      ".........dggdggggqqrrqqqq.......",
      "..........dd.dgggd.dqqd.........",
      "..........dggkkkggd.dd..........",
      "..........dggkkkkgd.............",
      "..........dggd.dggd.............",
      ".........dggd...dggd............",
      ".........dggd...dggd............",
      ".........dkkd...dkkd............",
      ".........dggd...dggd............",
      ".........dggd...dggd............",
      ".........dggd...dggd............",
      ".........dggd...dgggd...........",
      ".........dgggd..dgggd...........",
      ".........ddddd...ddddd.........."
    ],
    walkB: [
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "............ddddddd.............",
      "...........dgggggggd............",
      "..........dggllllgggd...........",
      "..........dggwwvvvvgd...........",
      "..........dggvvvvvvgd...........",
      "..........dgggkkvvkgd...........",
      "...........dggggkkgd............",
      "............dkkkkkd.............",
      "..........ddgggggggdd...........",
      ".........dgggglllggggd..........",
      ".........dggggllllgggd..........",
      ".........dggggggggggdd..........",
      ".........dggdggggqrrrrrrrrq.....",
      ".........dggdggggqqrrqqqq.......",
      "..........dd.dgggd.dqqd.........",
      "..........dggkkkggd.dd..........",
      "..........dggkkkkgd.............",
      "..........dggddggd..............",
      "..........dggd.dggd.............",
      "..........dkkd.dkkd.............",
      "..........dggd.dggd.............",
      "..........dggd.dggd.............",
      "..........dggd.dggd.............",
      "..........dggd.dggd.............",
      ".........dgggd.dgggd............",
      ".........ddddd.ddddd............"
    ],
    runA: [
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      ".............ddddddd............",
      "............dgggggggd...........",
      "...........dggllllgggd..........",
      "...........dggwwvvvvgd..........",
      "...........dggvvvvvvgd..........",
      "...........dgggkkvvkgd..........",
      "............dggggkkgd...........",
      ".............dkkkkkd............",
      "...........ddgggggggdd..........",
      "..........dgggglllggggd.........",
      "..........dggggllllgggd.........",
      "..........dggggggggggdd.........",
      "..........dggdggggqrrrrrrrrq....",
      "..........dggdggggqqrrqqqq......",
      "...........dd.dgggd.dqqd........",
      "...........dggkkkkgd.dd.........",
      "..........dggggdkkggd...........",
      ".........dggggd..dggggd.........",
      "........dgggd......dkkggd.......",
      "........dkkd........ddgggd......",
      "......ddggd...........dggd......",
      ".....dggggd...........dggggd....",
      ".....dgggd.............ddddd....",
      ".....dddd......................."
    ],
    runB: [
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      ".............ddddddd............",
      "............dgggggggd...........",
      "...........dggllllgggd..........",
      "...........dggwwvvvvgd..........",
      "...........dggvvvvvvgd..........",
      "...........dgggkkvvkgd..........",
      "............dggggkkgd...........",
      ".............dkkkkkd............",
      "...........ddgggggggdd..........",
      "..........dgggglllggggd.........",
      "..........dggggllllgggd.........",
      "..........dggggggggggdd.........",
      "..........dggdggggqrrrrrrrrq....",
      "..........dggdggggqqrrqqqq......",
      "...........dd.dgggd.dqqd........",
      "...........dggkkkkgd.dd.........",
      "...........dgggkkggd............",
      "...........dggdggggd............",
      "..........dggd.dkkgd............",
      "..........dkkd..dggd............",
      "..........dggd..dggd............",
      "..........dgggd.dgggd...........",
      "...........ddd...dddd..........."
    ],
    sideIdle: [
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "............ddddddd.............",
      "...........dgggggggd............",
      "..........dggllllgggd...........",
      "..........dggwwvvvvgd...........",
      "..........dggvvvvvvgd...........",
      "..........dgggkkvvkgd...........",
      "...........dggggkkgd............",
      "............dkkkkkd.............",
      "..........ddgggggggdd...........",
      ".........dgggglllggggd..........",
      ".........dggggllllgggd..........",
      ".........dggggggggggdd..........",
      ".........dggdggggqrrrrrrrrq.....",
      ".........dggdggggqqrrqqqq.......",
      "..........dd.dgggd.dqqd.........",
      "..........dggkkkggd.dd..........",
      "..........dggkkkkgd.............",
      "..........dggddggd..............",
      "..........dggd.dggd.............",
      "..........dggd.dggd.............",
      "..........dkkd.dkkd.............",
      "..........dggd.dggd.............",
      "..........dggd.dggd.............",
      "..........dggd.dggd.............",
      "..........dggd.dggd.............",
      ".........dgggd.dgggd............",
      ".........ddddd.ddddd............"
    ],
    swingA: [
      "................................",
      ".......qqq......................",
      ".......qrrq.....................",
      "........qrrq....................",
      ".........qrrq...................",
      "..........qrrq..................",
      "...........qqrq.................",
      "............dqqdddd.............",
      "...........dgggggggd............",
      "..........dggllllgggd...........",
      "..........dggwwvvvvgd...........",
      "..........dggvvvvvvgd...........",
      "..........dgggkkvvkgd...........",
      "...........dggggkkgd............",
      "............dkkkkkd.............",
      "..........ddgggggggdd...........",
      ".........dgggglllgggggd.........",
      ".........dggggllllggggd.........",
      ".........dggggggggggggd.........",
      ".........dggdgggggggdd..........",
      "..........dd.dgggd..............",
      "..........dggkkkggd.............",
      "..........dggkkkkgd.............",
      "..........dggddggd..............",
      "..........dggd.dggd.............",
      "..........dggd.dggd.............",
      "..........dkkd.dkkd.............",
      "..........dggd.dggd.............",
      "..........dggd.dggd.............",
      "..........dggd.dggd.............",
      "..........dggd.dggd.............",
      ".........dgggddgggdd............"
    ],
    swingB: [
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "............ddddddd.............",
      "...........dgggggggd............",
      "..........dggllllgggd...........",
      "..........dggwwvvvvgd...........",
      "..........dggvvvvvvgd...........",
      "..........dgggkkvvkgd...........",
      "...........dggggkkgd............",
      "............dkkkkkd.............",
      "..........ddgggggggdd...........",
      ".........dgggglllggggdd.........",
      ".........dggggllllgggggd........",
      ".........dgggggggggggggd........",
      ".........dggdggggggdqrrq........",
      "..........dd.dgggd..dqrrq.......",
      "..........dggkkkggd..dqrrq......",
      "..........dggkkkkgd...dqrrq.....",
      "..........dggddggd.....dqqd.....",
      "..........dggd.dggd.............",
      "..........dggd.dggd.............",
      "..........dkkd.dkkd.............",
      "..........dggd.dggd.............",
      "..........dggd.dggd.............",
      "..........dggd.dggd.............",
      "..........dggd.dggd.............",
      ".........dgggddgggdd............"
    ],
    slump: [
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "............dddddddd............",
      "...........dggggggggd...........",
      "..........dggllllllggd..........",
      "..........dglwwvvvvvgd..........",
      "..........dgvvvvvvvvgd..........",
      "..........dggkvvvvkggd..........",
      "..........dggggkkggggd..........",
      "...........dggggggggd...........",
      "........dddgkkkkkkkgdqrq........",
      ".......dggggggggggqrrqd.........",
      ".......dglgggllrrrrgggld........",
      ".......dggdgrrrrlllggdgd........",
      "........dd.qqgqqggggd.dd........",
      "...........dggkkkkggd...........",
      "..........dggkd..dkggd..........",
      ".........dgggd....dgggd.........",
      ".........dggd......dggd.........",
      ".........dkkgd....dgkkd.........",
      "..........dggd....dggd..........",
      ".........dggd......dggd.........",
      ".........dggd......dggd.........",
      "........dgggd......dgggd........",
      "........dgggd......dgggd........",
      "........dddd........dddd........"
    ],
    kneel: [
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "............dddddddd............",
      "...........dggggggggd...........",
      "..........dggllllllggd..........",
      "..........dglwwvvvvvgd..........",
      "..........dgvvvvvvvvgd..........",
      "..........dggkvvvvkggd..........",
      "..........dggggkkggggd..........",
      "...........dggggggggd...........",
      "........dddgkkkkkkkgdqrq........",
      ".......dggggggggggqrrqd.........",
      ".......dglgggllrrrrgggld........",
      ".......dggdgrrrrlllggdgd........",
      "........dd.qqgqqgggggd.dd.......",
      "...........dggkkkkkggd..........",
      "..........dggkd...dkggd.........",
      ".........dgggd.....dgggd........",
      ".........dggd......dggggd.......",
      ".........dkkd......dkkkkggd.....",
      ".........dggd.......dggggggd....",
      ".........dgggd......ddddddgd....",
      ".........ddddd..........ddd....."
    ],
    dead: [
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "..........dddddd................",
      "...dddd..dqrrrrrqd.......dddd...",
      "..dgwwvddgglqqgggggd....dggggd..",
      ".dgvvvvgdkgggggggggddddddgggggd.",
      ".dgvvvggkkggggggggggggggggggggd.",
      ".dggggggkgggggggggddddddggggggd.",
      "..dddddddddddddddd.....dddddd..."
    ],
    hit: [
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "........ww......................",
      "........ww......................",
      "...w....ww....w.................",
      "....w..wvvw..w..................",
      ".....w.wvvw.w...................",
      "........vv......................",
      ".wwwvv......vvwww...............",
      ".wwwvv......vvwww...............",
      "........vv......................",
      ".....w.wvvw.w...................",
      "....w..wvvw..w..................",
      "...w....ww....w.................",
      "........ww......................",
      "........ww......................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................"
    ],
  };

  /* ------------------------------------------------------- build */

  var SVG_NS = "http://www.w3.org/2000/svg";
  var stage = null;
  var chief = null;
  var rival = null;

  /* One pose group: each run of adjacent same-color pixels in a grid
     row becomes a single 1-unit-tall rect.

     Poses are SEATED as they are built: a body whose lowest pixels sit
     above the last row would float, and since the page plants the
     sprite's bottom edge on the stage floor, every cut into or out of
     that pose makes the character jump (drawn 2 rows shy, he dropped
     24 px the instant his charge ended). Seating here means redrawing
     a frame can never bring that back — draw a pose anywhere in its
     32 rows and it still stands on the floor. The starburst is not a
     body and keeps the height it was drawn at. */
  function poseGroup(name, cls) {
    var g = document.createElementNS(SVG_NS, "g");
    g.setAttribute("class", cls);
    var grid = FRAMES[name];
    var drop = 0;
    if (name !== "hit") {
      for (var b = grid.length - 1; b >= 0 && !/[^.]/.test(grid[b]); b--) {
        drop++;
      }
    }
    for (var y = 0; y < grid.length; y++) {
      var row = grid[y];
      var x = 0;
      while (x < row.length) {
        var ch = row.charAt(x);
        if (ch === ".") { x++; continue; }
        var x0 = x;
        while (x < row.length && row.charAt(x) === ch) { x++; }
        var r = document.createElementNS(SVG_NS, "rect");
        r.setAttribute("x", x0);
        r.setAttribute("y", y + drop);
        r.setAttribute("width", x - x0);
        r.setAttribute("height", 1);
        r.setAttribute("fill", PALETTE[ch]);
        g.appendChild(r);
      }
    }
    return g;
  }

  function makeActor(poses) {
    var el = document.createElement("div");
    el.className = "cameo-actor";
    var svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "0 0 32 32");
    svg.setAttribute("shape-rendering", "crispEdges");
    for (var i = 0; i < poses.length; i++) {
      var name = poses[i];
      svg.appendChild(poseGroup(name,
        name === "hit" ? "p-hit" : "pose p-" + name));
    }
    el.appendChild(svg);
    return el;
  }

  function ensureStage() {
    if (!stage) {
      stage = document.createElement("div");
      stage.className = "cameo-stage";
      stage.setAttribute("aria-hidden", "true");
      document.body.appendChild(stage);
    }
  }

  /* -------------------------------------------------- stagecraft */

  /* How wide the sprite actually renders, in vw. The size comes from
     --cameo-size, which is a min() of a vh and a vw term, so how much
     of the stage one body covers depends on the window's shape: the
     same 12vw that read as a rifle-length on a laptop was empty air
     on an ultrawide (the partner swung at nothing and the chief died
     anyway) and an overlap on a phone. So anything that has to MEET
     something else — the melee, and every exit — is measured in
     bodies, not in vw. Read from the DOM so the stylesheet stays the
     one place the size is set; sampled per act, which is also what
     keeps it right after a window resize between acts. */
  function bodyVw() {
    var probe = document.createElement("div");
    probe.className = "cameo-actor";
    var svg = document.createElementNS(SVG_NS, "svg");
    probe.appendChild(svg);
    stage.appendChild(probe);
    var w = svg.getBoundingClientRect().width; /* untransformed: scale 1 */
    stage.removeChild(probe);
    return (w / window.innerWidth) * 100;
  }

  /* Far enough past an edge that a body at this scale is fully gone. */
  function offLeft(body, s) { return -(s * body / 2 + 4); }
  function offRight(body, s) { return 100 + s * body / 2 + 4; }

  var CENTRE = 50;         /* where he stops, facing the camera */
  var MELEE = 0.40;        /* bodies between them when the rifle lands */
  var RECOIL = 0.06;       /* how far the blow shoves him */

  function place(actor, x, y, s, flip) {
    actor.style.transform = "translate(" + x + "vw, " + (-y) + "vh) " +
      "scale(" + (flip ? -s : s) + ", " + s + ")";
  }
  function cut(actor) { actor.style.transitionDuration = "0s"; }
  function glide(actor, ms, ease) {
    actor.style.transitionDuration = ms + "ms";
    actor.style.transitionTimingFunction = ease;
  }
  function pose(actor, name) { actor.setAttribute("data-pose", name); }
  function gait(actor, secs) {
    actor.style.setProperty("--cameo-gait", secs + "s");
  }
  function reflow(el) { void el.offsetWidth; }

  /* Run steps in sequence: each entry is [delay-after-previous, fn]. */
  function chain(steps) {
    var t = 0;
    for (var i = 0; i < steps.length; i++) {
      t += steps[i][0];
      setTimeout(steps[i][1], t);
    }
  }

  var ACCEL = "cubic-bezier(0.55, 0, 0.85, 0.55)"; /* charging, leaving */
  var DECEL = "cubic-bezier(0.25, 0.6, 0.35, 1)";  /* arriving at speed */

  /* Act 1: he walks in along the back of the stage, notices the
     camera, and charges it — growing the whole way. */
  function actOne() {
    busy = true;
    ensureStage();
    chief = makeActor(["walkA", "walkB", "frontA", "frontB", "idle",
                       "slump", "kneel", "dead", "runA", "runB", "hit"]);
    stage.appendChild(chief);
    if (reduced && reduced.matches) {
      cut(chief); pose(chief, "idle"); place(chief, CENTRE, 2, 1);
      act = 1; busy = false;
      return;
    }
    var body = bodyVw();
    cut(chief);
    pose(chief, "walk");
    gait(chief, 0.55);
    place(chief, offLeft(body, 0.42), 26, 0.42);
    reflow(chief);
    chain([
      [30, function () {
        glide(chief, 2300, "linear");
        place(chief, 30, 26, 0.46);
      }],
      [2300, function () { pose(chief, "idle"); }],
      [420, function () {
        pose(chief, "front");
        gait(chief, 0.3);
        glide(chief, 1150, ACCEL);
        place(chief, CENTRE, 2, 1);
      }],
      [1150, function () {
        pose(chief, "idle");
        act = 1; busy = false;
      }]
    ]);
  }

  /* Act 2: the partner arrives at a dead run, one melee from behind
     does what one melee from behind does, and he leaves the scene. */
  function actTwo() {
    busy = true;
    var body = bodyVw();
    var struck = CENTRE + RECOIL * body;   /* where the blow leaves him */
    if (reduced && reduced.matches) {
      cut(chief); pose(chief, "dead"); place(chief, struck, 2, 1);
      act = 2; busy = false;
      return;
    }
    var strike = CENTRE - MELEE * body;    /* within a rifle's reach */
    rival = makeActor(["runA", "runB", "sideIdle", "swingA", "swingB"]);
    stage.insertBefore(rival, chief); /* paints behind the chief */
    cut(rival);
    pose(rival, "run");
    gait(rival, 0.32);
    place(rival, offLeft(body, 0.88), 5, 0.88);
    reflow(rival);
    chain([
      [30, function () {
        glide(rival, 950, DECEL);
        place(rival, strike, 5, 0.88);
      }],
      [950, function () { pose(rival, "swingA"); }],
      [190, function () { pose(rival, "swingB"); }],
      [70, function () { /* contact */
        chief.classList.add("hit");
        pose(chief, "slump");
        glide(chief, 140, "ease-out");
        place(chief, struck, 2, 1);
      }],
      [140, function () {
        chief.classList.remove("hit");
        pose(chief, "kneel");
      }],
      [160, function () { pose(chief, "dead"); }],
      [300, function () { pose(rival, "sideIdle"); }],
      [600, function () { /* about-face, in one cut */
        cut(rival);
        pose(rival, "run");
        place(rival, strike, 5, 0.88, true);
        reflow(rival);
      }],
      [30, function () {
        glide(rival, 1050, ACCEL);
        place(rival, offLeft(body, 0.88), 5, 0.88, true);
      }],
      [1050, function () {
        stage.removeChild(rival);
        rival = null;
        act = 2; busy = false;
      }]
    ]);
  }

  /* Act 3: he gets up, shakes it off, and exits over the page. */
  function actThree() {
    busy = true;
    if (reduced && reduced.matches) {
      teardown();
      return;
    }
    var body = bodyVw();
    chain([
      [250, function () { pose(chief, "kneel"); }],
      [280, function () { pose(chief, "idle"); }],
      [120, function () { chief.classList.add("shake"); }],
      [620, function () { chief.classList.remove("shake"); }],
      [180, function () {
        pose(chief, "run");
        gait(chief, 0.3);
        glide(chief, 1300, ACCEL);
        place(chief, offRight(body, 1), 2, 1);
      }],
      [1300, teardown]
    ]);
  }

  function teardown() {
    if (stage && stage.parentNode) { stage.parentNode.removeChild(stage); }
    stage = null; chief = null; rival = null;
    act = 0; busy = false;
  }

  /* ------------------------------------------------------ trigger */

  document.addEventListener("keydown", function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) { return; }
    var t = e.target;
    if (t && (t.isContentEditable || t.tagName === "INPUT" ||
              t.tagName === "TEXTAREA" || t.tagName === "SELECT")) { return; }
    if (!e.key || e.key.length !== 1) { return; } /* letters only */
    buffer = (buffer + e.key.toLowerCase()).slice(-WORD.length);
    if (buffer !== WORD) { return; }
    buffer = "";
    if (busy) { return; }
    if (act === 0) { actOne(); }
    else if (act === 1) { actTwo(); }
    else { actThree(); }
  });
})();
