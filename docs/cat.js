/* crosswayapp.com's fifth secret: a black and white cat sleeps at the
   foot of the home page, in its bottom left corner, below the Donate
   window and the footer. Type her name anywhere on the page and she
   wakes, stretches, turns her head and walks along the bottom of the
   page to the other corner, looks back at the visitor, turns round to
   face the middle, and curls up there. Type it again and she walks
   back.

   And a sixth: type the kitten's name and an orange kitten walks in
   from the edge of the screen on the side Shai is not, and goes to
   sleep in that corner; type it again and she gets up and walks off the
   way she came. If Shai is called while the kitten is there, the kitten
   makes way: she walks off through her edge as Shai walks over, and
   Shai takes her corner.

   Click either cat while she sleeps and she lifts her head to look at
   whoever clicked; five seconds after the last click she puts it down
   again.

   Progressive enhancement only, the same listener discipline as
   night.js: keys are never prevented, typing in inputs is ignored, and
   shortcuts pass through untouched. With JavaScript off there is no
   cat, which is fine: she is decoration, and aria-hidden throughout.
   While they sleep this file costs one keydown listener and Shai's two
   mouse listeners; nothing runs on a timer until a name is typed or a
   cat is clicked, and the kitten is not even drawn until her name is
   typed.

   The sprites are drawn HERE, as pixel grids in the cameo's manner:
   one char per pixel, facing right, paws on the bottom row, and each
   run of same-colored pixels in a row becomes one SVG rect. Only fur is
   drawn. The one-pixel edge around a cat is worked out from the fur
   when she is built (edgeOf, below), so a redrawn pose can never ship
   with a gap in it. style.css (the .cat rules) owns their size, their
   two resting places and the edge's color in each appearance. */
(function () {
  "use strict";

  var buffer = "";
  /* How many cats are on their way somewhere. While any is, a typed name
     is ignored, not saved for later: they finish what they are doing. */
  var moving = 0;

  function media(query) {
    return window.matchMedia ? window.matchMedia(query) : null;
  }
  var reduced = media("(prefers-reduced-motion: reduce)");
  function lessMotion() { return !!(reduced && reduced.matches); }

  /* Shai's colors, the same in every appearance unless style.css re-cuts
     a tone by its class (night lights her rim, the terminal turns her to
     phosphor): k black fur, w white fur, e her eyes, c the crease of her
     closed eyes, a line of black a touch deeper than her fur so it reads
     faintly on her black face, and p the pink of her nose. She is a
     tuxedo cat: a black head with a white blaze that runs down between
     her eyes and opens into a white muzzle, a white bib, white front legs
     from the elbow down, white back feet with a white patch on the
     haunch, and a long black tail.

     Her edge is derived rather than drawn, in three tones: O is the edge
     round her white fur, black in every light, and o is the rim round
     the rest of her (her black fur, and the pink of an ear). By day the
     rim is drawn as nothing, since black fur needs no line against the
     pale desk; the dark desks give it a color. A pixel that borders
     both, as under her chin and between her legs at the top, is b:
     black by day like O, so her white never loses its line there, and
     the rim's color on the dark desks like o, so the rim never breaks
     either. */
  var SHAI_COLORS = {
    k: "#141414",
    w: "#ffffff",
    e: "#c9d84c",
    c: "#000000",
    p: "#e89aa6",
    /* The inside of her ears is a softer, greyer pink than her nose,
       which is the pinkest thing on her. */
    i: "#c8a0a6",
    O: "#000000",
    o: "none",
    b: "#000000"
  };

  /* She faces the visitor whenever she is still, and turns her head the
     way she is going when she walks: the four walk frames draw her head
     in profile (one ear in front of the other, one eye, the blaze seen
     from the side as a white line down the front of her face, and her
     nose at its tip), and turn is the head halfway round, a beat between
     looking at the visitor and looking where she goes, which she passes
     through both ways. */
  var SHAI_FRAMES = {
    sleep: [
      ".........................",
      ".........................",
      ".........................",
      "..................k.....k",
      "..................ki...ik",
      ".......kkkkk......kkkkkkk",
      ".....kkkkkkkkk....kkkwkkk",
      "....kkkkkkkkkkkkkkkccwcck",
      "...kkkkkkkkkkkkkkkkkwpwkk",
      "..kkkkkkkkkkkkkkkkkwwwwwk",
      "k.kkkkkkkkkkkkkkkkkkwwwk.",
      "kkkwwkkkkkkkkkkkkkwwkwwk."
    ],
    wake: [
      ".........................",
      "..................k.....k",
      "..................ki...ik",
      "..................kkkkkkk",
      "..................kkkwkkk",
      ".......kkkkk......kekwkek",
      ".....kkkkkkkkk....kkwpwkk",
      "....kkkkkkkkkkkkkkkwwwwwk",
      "...kkkkkkkkkkkkkkkkkwwwk.",
      "..kkkkkkkkkkkkkkkkkkwwwk.",
      "k.kkkkkkkkkkkkkkkkkkwwwk.",
      "kkkwwkkkkkkkkkkkkkwwkwwk."
    ],
    stretch: [
      ".k.......................",
      "k........................",
      "k........................",
      "k........................",
      ".kkkkk............k.....k",
      ".kkkkkkkk.........ki...ik",
      "..kkkkkkkkkk......kkkkkkk",
      "..wkkkkkkkkkkkk...kkkwkkk",
      "..ww.wwkkkkkkkkkkkkekwkek",
      "..ww.ww...kkkkkkkkkkwpwkk",
      "..ww.ww.....kkkkkkkwwwwwk",
      "..ww.ww.....wwwwwwwwwwwww"
    ],
    stand: [
      "..k...............k.....k",
      ".k................ki...ik",
      ".k................kkkkkkk",
      "..k...............kkkwkkk",
      "...k..............kekwkek",
      "....k.............kkwpwkk",
      ".....kkkkkkkkkkkkkkwwwwwk",
      ".....kkkkkkkkkkkkkkkwwwk.",
      "......wwkkkkkkkkkkkkwww..",
      "......ww.ww.......ww.ww..",
      "......ww.ww.......ww.ww..",
      "......ww.ww.......ww.ww.."
    ],
    turn: [
      "..k................k...k.",
      ".k.................ki..k.",
      ".k................kkkkkk.",
      "..k...............kkkkwkk",
      "...k..............kkekwek",
      "....k.............kkkkwpw",
      ".....kkkkkkkkkkkkkkkkwwww",
      ".....kkkkkkkkkkkkkkkkwww.",
      "......wwkkkkkkkkkkkkwww..",
      "......ww.ww.......ww.ww..",
      "......ww.ww.......ww.ww..",
      "......ww.ww.......ww.ww.."
    ],
    walk1: [
      "..k................k..k..",
      ".k.................ki.k..",
      ".k.................kkkkk.",
      "..k...............kkkkkw.",
      "...k..............kkkekw.",
      "....k.............kkkkwwp",
      ".....kkkkkkkkkkkkkkkkkww.",
      ".....kkkkkkkkkkkkkkkkww..",
      "......wwkkkkkkkkkkkkwww..",
      "......wwww........ww.ww..",
      ".....ww..ww.......ww..ww.",
      "....ww....ww......ww....."
    ],
    walk2: [
      ".k.................k..k..",
      "k..................ki.k..",
      "k..................kkkkk.",
      ".k................kkkkkw.",
      "..k...............kkkekw.",
      "...k..............kkkkwwp",
      "....kkkkkkkkkkkkkkkkkkww.",
      ".....kkkkkkkkkkkkkkkkww..",
      "......wwkkkkkkkkkkkkwww..",
      "......ww.ww.......ww.ww..",
      "......ww.ww.......ww.ww..",
      "......ww.ww.......ww.ww.."
    ],
    walk3: [
      ".k.................k..k..",
      "k..................ki.k..",
      "k..................kkkkk.",
      ".k................kkkkkw.",
      "..k...............kkkekw.",
      "...k..............kkkkwwp",
      "....kkkkkkkkkkkkkkkkkkww.",
      ".....kkkkkkkkkkkkkkkkww..",
      "......wwkkkkkkkkkkkkwww..",
      "......ww.ww.......wwww...",
      "......ww..ww.....ww..ww..",
      "......ww........ww....ww."
    ],
    walk4: [
      "..k................k..k..",
      ".k.................ki.k..",
      ".k.................kkkkk.",
      "..k...............kkkkkw.",
      "...k..............kkkekw.",
      "....k.............kkkkwwp",
      ".....kkkkkkkkkkkkkkkkkww.",
      ".....kkkkkkkkkkkkkkkkww..",
      "......wwkkkkkkkkkkkkwww..",
      "......ww.ww.......ww.ww..",
      "......ww.ww.......ww.ww..",
      "......ww.ww.......ww.ww.."
    ],
    sit: [
      "............k.....k......",
      "............ki...ik......",
      "............kkkkkkk......",
      "............kkkwkkk......",
      "............kekwkek......",
      "...........kkkwpwkk......",
      "..........kkkwwwwwk......",
      "........kkkkkkwwwkk......",
      ".......kkkkkkkwwwkk......",
      ".......kkkkkkkww.ww......",
      "k.....kkkkwwwkww.ww......",
      "kkkkkkkkkwwwwkww.ww......"
    ]
  };

  /* The kitten: the same poses as Shai's, drawn smaller (two thirds of
     her height) and slim, a young cat and not a ball of fluff: a head
     six pixels wide with an ear at each corner, a body two pixels deep
     on short legs, and a short tail held up. g is her orange coat and t
     its darker tabby stripes; w is the cream of her muzzle, chest and
     paws, which takes the edge white fur takes. Her eyes are a kitten's
     blue, and her closed eyes two short lines of deep ginger reaching
     the sides of her face: one pixel each would read as dark eyes,
     open. Facing the visitor her face is an even number of pixels wide,
     so her nose is two, where one would sit off its middle, and it sits
     in cream: the terminal draws her nose and her coat in one tone, and
     only the cream beside it keeps it there. Her eyes sit close together,
     over that cream, so the terminal draws them dark (style.css): in its
     bright tone, the one it gives her cream and Shai's eyes, they would
     run into the cream and her face would read as a bright ring with no
     eyes in it.
     Orange, unlike black, does need a line against the pale desk, so by
     day her whole edge is drawn in a dark ginger, round her cream as
     round her coat: in black, the gaps between her paws and the line in
     front of her chin would show as stray black pixels on a ginger cat.
     The dark desks give her rim their color as they do Shai's, and draw
     the edge round her cream in black as they draw Shai's (style.css).
     The terminal re-cuts her coat and stripes too, so she stays a
     lighter cat than Shai there. Her grids keep an empty first column
     so that, edged, she is 18 pixels wide, a multiple of three like
     Shai's 27: at the stylesheet's sizes for 3x (and 1.5x) screens a
     width that is not lands her right corner between device pixels, and
     her pixels come out uneven there. */
  var KITTEN_COLORS = {
    g: "#e8872f",
    t: "#b4531a",
    w: "#f7e6c4",
    e: "#6fb3e6",
    c: "#5a2a0e",
    p: "#f29aa8",
    O: "#6b3510",
    o: "#6b3510",
    b: "#6b3510"
  };

  var KITTEN_FRAMES = {
    sleep: [
      "................",
      "................",
      "..........g....g",
      "..........gp..pg",
      ".....gtggtggttgg",
      "...ggtggtgccggcc",
      ".t.gggtggggwppwg",
      ".gggwwgggggwwwwg"
    ],
    wake: [
      "..........g....g",
      "..........gp..pg",
      "..........ggttgg",
      "..........geggeg",
      ".....gtggtgwppwg",
      "...ggtggtggwwww.",
      ".t.gggtgggggwwg.",
      ".gggwwgggggwwwwg"
    ],
    stretch: [
      ".t..............",
      ".g..............",
      ".gggg.....g....g",
      ".ggtggg...gp..pg",
      ".ggtggtgggggttgg",
      "..gg.gtggggeggeg",
      "..gg.gg..ggwppwg",
      "..ww.ww..wwwwwww"
    ],
    stand: [
      "..t.......g....g",
      "..g.......gp..pg",
      "..t.......ggttgg",
      "..g.......geggeg",
      "..gtggtggggwppwg",
      "...gtggtgggwwww.",
      "...gg.gg..gg.gg.",
      "...ww.ww..ww.ww."
    ],
    turn: [
      "..t........g...g",
      "..g.......ggp.gg",
      "..t.......gggttg",
      "..g.......ggegeg",
      "..gtggtggggggwpw",
      "...gtggtgggggwww",
      "...gg.gg..gg.gg.",
      "...ww.ww..ww.ww."
    ],
    walk1: [
      "..t........g.g..",
      "..g.......ggpgg.",
      "..t.......gtgtg.",
      "..g.......gggegg",
      "..gtggtgggggggwp",
      "...gtggtgggggww.",
      "...gggg...gg.gg.",
      "..ww..ww..ww..ww"
    ],
    walk2: [
      ".t.........g.g..",
      "..g.......ggpgg.",
      "..t.......gtgtg.",
      "..g.......gggegg",
      "..gtggtgggggggwp",
      "...gtggtgggggww.",
      "...gg.gg..gg.gg.",
      "...ww.ww..ww.ww."
    ],
    walk3: [
      ".t.........g.g..",
      "..g.......ggpgg.",
      "..t.......gtgtg.",
      "..g.......gggegg",
      "..gtggtgggggggwp",
      "...gtggtgggggww.",
      "...gg.gg..gggg..",
      "...ww.ww.ww..ww."
    ],
    walk4: [
      "..t........g.g..",
      "..g.......ggpgg.",
      "..t.......gtgtg.",
      "..g.......gggegg",
      "..gtggtgggggggwp",
      "...gtggtgggggww.",
      "...gg.gg..gg.gg.",
      "...ww.ww..ww.ww."
    ],
    sit: [
      ".......g....g...",
      ".......gp..pg...",
      ".......ggttgg...",
      ".......geggeg...",
      ".....gggwppwg...",
      "....gtggwwwwg...",
      ".t..gtgggg.gg...",
      ".gggggwwww.ww..."
    ]
  };

  /* How they move, in their own body lengths, so that a phone's smaller
     cat walks at a cat's pace too. pace is a stroll, in bodies a second,
     and gait the time one stride of the four walking frames takes at
     that pace: the kitten trots, a little quicker in both. A walk that
     would take longer than LONGEST (on a very wide window) goes a little
     quicker instead, and the strides quicken with it, so the feet keep
     up with the ground. */
  var SHAI = { name: "shai", colors: SHAI_COLORS, frames: SHAI_FRAMES, pace: 2.2, gait: 0.48 };
  var KITTEN = { name: "kitten", colors: KITTEN_COLORS, frames: KITTEN_FRAMES, pace: 2.6, gait: 0.36 };
  var LONGEST = 8000;
  /* How long the half-turned head is held, turning from the visitor to
     the road and back: long enough to be seen as a turn, not a cut. */
  var TURN = 160;
  /* How far along her walk Shai is when the kitten in her way wakes
     and goes: about a fifth of the way. */
  var HEADS_UP = 0.22;
  /* How long a cat clicked awake looks at the visitor before she puts
     her head down again. */
  var LOOK = 5000;

  /* ------------------------------------------------------- build */

  var SVG_NS = "http://www.w3.org/2000/svg";

  /* A pose's grid with its edge: the fur with a pixel of margin above
     and to either side, and every empty pixel that touches fur on a side
     turned into edge. It is the plain edge (O) where it touches only
     white, the rim (o) where it touches only the rest of her, and b
     where it touches both, so by night the rim outlines the cat unbroken
     while her white legs keep the width they have by day, and by day
     every pixel of her white is edged. There is no margin below: her
     paws and her tummy stand on the floor, and the floor is her edge
     there. */
  function edgeOf(fur) {
    var rows = fur.length + 1, cols = fur[0].length + 2, grid = [], x, y;
    for (y = 0; y < rows; y++) {
      grid.push([]);
      for (x = 0; x < cols; x++) {
        var inside = y > 0 && x > 0 && x <= fur[0].length;
        grid[y].push(inside ? fur[y - 1].charAt(x - 1) : ".");
      }
    }
    var at = function (yy, xx) {
      return yy >= 0 && yy < rows && xx >= 0 && xx < cols ? grid[yy][xx] : ".";
    };
    return grid.map(function (row, yy) {
      return row.map(function (ch, xx) {
        if (ch !== ".") { return ch; }
        var touching = [at(yy - 1, xx), at(yy + 1, xx), at(yy, xx - 1), at(yy, xx + 1)];
        var white = touching.indexOf("w") >= 0;
        var dark = touching.some(function (t) { return t !== "." && t !== "w"; });
        return white && dark ? "b" : white ? "O" : dark ? "o" : ".";
      });
    });
  }

  function poseGroup(name, grid, colors) {
    var g = document.createElementNS(SVG_NS, "g");
    g.setAttribute("class", "pose p-" + name);
    for (var y = 0; y < grid.length; y++) {
      var row = grid[y], x = 0;
      while (x < row.length) {
        var ch = row[x];
        if (ch === ".") { x++; continue; }
        var x0 = x;
        while (x < row.length && row[x] === ch) { x++; }
        var r = document.createElementNS(SVG_NS, "rect");
        r.setAttribute("x", x0);
        r.setAttribute("y", y);
        r.setAttribute("width", x - x0);
        r.setAttribute("height", 1);
        r.setAttribute("fill", colors[ch]);
        r.setAttribute("class", "c-" + ch);
        g.appendChild(r);
      }
    }
    return g;
  }

  /* The floor is the strip along the bottom of the page they live on, as
     wide as the browser window, and it clips, so a cat walking off its
     end walks off the screen. Inside it the track is inset by the desk's
     side gutter, and its two ends are the corners they rest in. It is
     the last thing on the page, so it is always at the very bottom, and
     it is part of the page, not of the browser window: they are only
     seen by someone who has scrolled all the way down. The stylesheet
     sizes the floor from Shai's grid, the taller of the two, and each
     cat from her own; only the frames here know those sizes. */
  var floor = document.createElement("div");
  floor.className = "cat-floor";
  floor.setAttribute("aria-hidden", "true");
  var track = document.createElement("div");
  track.className = "cat-track";
  floor.appendChild(track);

  function build(kind) {
    var sheet = {};
    Object.keys(kind.frames).forEach(function (name) { sheet[name] = edgeOf(kind.frames[name]); });
    var cols = sheet.sleep[0].length, rows = sheet.sleep.length;
    var el = document.createElement("div");
    el.className = kind === SHAI ? "cat" : "cat " + kind.name;
    el.style.setProperty("--cat-cols", cols);
    el.style.setProperty("--cat-rows", rows);
    var svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "0 0 " + cols + " " + rows);
    svg.setAttribute("shape-rendering", "crispEdges");
    Object.keys(sheet).forEach(function (name) { svg.appendChild(poseGroup(name, sheet[name], kind.colors)); });
    el.appendChild(svg);
    var c = { kind: kind, el: el, rows: rows, moving: false, nap: null };
    /* A press on her never takes the focus from where it is, or starts
       a text selection; the click is what wakes her. */
    el.addEventListener("mousedown", function (e) { e.preventDefault(); });
    el.addEventListener("click", function () { look(c); });
    track.appendChild(el);
    return c;
  }

  var shai = build(SHAI);
  var kitten = null;
  floor.style.setProperty("--cat-rows", shai.rows);
  document.body.appendChild(floor);

  /* A cat's state is three attributes the stylesheet reads: the pose
     showing, the end of the track she rests at, and the way she faces.
     A cat rests facing into the page, so Shai always walks the way she
     faces when she is woken, and only her arrival turns her round. */
  function pose(c, p) { c.el.setAttribute("data-pose", p); }
  function rest(c, side) { c.el.setAttribute("data-side", side); }
  function face(c, way) { c.el.setAttribute("data-facing", way); }
  function sideOf(c) { return c.el.getAttribute("data-side"); }
  function other(side) { return side === "left" ? "right" : "left"; }
  pose(shai, "sleep");
  rest(shai, "left");
  face(shai, "right");

  function glide(c, ms, x) {
    c.el.style.transitionDuration = ms + "ms";
    c.el.style.transform = x ? "translateX(" + x + "px)" : "";
  }

  /* ------------------------------------------------------ walking */

  /* A walk of `by` pixels (negative is to the left), measured when it
     starts, so a window resized since the last one is walked at its new
     width: how long it takes her at her pace, and where it leaves her,
     on the screen's pixel grid. She walks in whole screen pixels:
     --cat-steps is the number of device pixels in the walk, so every
     step of the glide lands her on one, and her crisp edges never blur
     between them. */
  function stroll(c, by) {
    var ratio = window.devicePixelRatio || 1;
    var steps = Math.max(1, Math.round(Math.abs(by) * ratio));
    var easy = steps / ratio / (c.el.offsetWidth * c.kind.pace) * 1000;
    var ms = Math.round(Math.min(easy, LONGEST));
    c.el.style.setProperty("--cat-gait", (c.kind.gait * ms / easy).toFixed(3) + "s");
    c.el.style.setProperty("--cat-steps", steps);
    return { ms: ms, x: (by < 0 ? -steps : steps) / ratio };
  }

  /* How far a cat goes from her corner to be wholly off the screen: past
     the desk's gutter and her own width. */
  function beyond(c) {
    return (floor.clientWidth - track.clientWidth) / 2 + c.el.getBoundingClientRect().width;
  }

  /* Run a cat's steps in sequence, each entry [delay-after-previous, fn].
     She counts as moving from the first step to the end of the last, and
     a nap she was clicked out of is called off: what she does now is
     what she was called for. */
  function chain(c, steps) {
    clearTimeout(c.nap);
    c.nap = null;
    c.moving = true;
    c.el.setAttribute("data-moving", "");
    moving++;
    var t = 0;
    for (var i = 0; i < steps.length; i++) {
      t += steps[i][0];
      setTimeout(steps[i][1], t);
    }
    setTimeout(function () {
      c.moving = false;
      c.el.removeAttribute("data-moving");
      moving--;
    }, t);
  }

  /* Up from where she lies and on her way: she wakes, stretches, stands,
     turns her head toward where she is going (turning round first, if
     she faces the wrong way), and walks. In a hurry she skips the
     stretch and is up sooner. */
  function setOff(c, way, go, hurry) {
    var round = c.el.getAttribute("data-facing") !== way;
    var up = hurry
      ? [[0, function () { pose(c, "wake"); }], [400, function () { pose(c, "stand"); }]]
      : [[0, function () { pose(c, "wake"); }], [700, function () { pose(c, "stretch"); }], [900, function () { pose(c, "stand"); }]];
    return up.concat([
      [round ? 150 : 300, function () { face(c, way); }],
      [round ? 150 : 0, function () { pose(c, "turn"); }],
      [TURN, function () {
        pose(c, "walk");
        glide(c, go.ms, go.x);
      }]
    ]);
  }

  /* How long a run of steps takes, start to last. */
  function span(steps) {
    return steps.reduce(function (t, s) { return t + s[0]; }, 0);
  }

  /* Shai, to the other corner. Arrived, she looks back at the visitor,
     then turns round to face back into the page. Her place moves from
     the transform to the stylesheet's resting place in the same step, so
     a window resized while she sleeps there keeps her in its corner. */
  function cross(c) {
    var from = sideOf(c), to = other(from);
    if (lessMotion()) { /* no walk: she is simply asleep on the other side */
      clearTimeout(c.nap);
      pose(c, "sleep");
      rest(c, to);
      face(c, from);
      return null;
    }
    var go = stroll(c, (to === "right" ? 1 : -1) * (track.clientWidth - c.el.getBoundingClientRect().width));
    var off = setOff(c, to, go);
    var walk = { start: span(off), ms: go.ms };
    chain(c, off.concat([
      [go.ms, function () { pose(c, "turn"); }],
      [TURN, function () { pose(c, "stand"); }],
      [250, function () {
        glide(c, 0, 0);
        rest(c, to);
        face(c, from);
      }],
      [300, function () { pose(c, "sit"); }],
      [700, function () { pose(c, "wake"); }],
      [900, function () { pose(c, "sleep"); }]
    ]));
    return walk;
  }

  /* The kitten, in from the edge of the screen behind `corner`, to sleep
     there facing into the page. She is shown in her corner only to be
     measured, and put down off the screen in the same moment, before the
     browser draws a frame; reading her width again then makes it place
     her there, so her walk in starts from the edge, not from her corner. */
  function enter(c, corner) {
    rest(c, corner);
    face(c, other(corner));
    c.el.hidden = false;
    if (lessMotion()) { /* no walk: she is simply there, asleep */
      pose(c, "sleep");
      return;
    }
    var ratio = window.devicePixelRatio || 1;
    var off = (corner === "right" ? 1 : -1) * Math.round(beyond(c) * ratio) / ratio;
    var go = stroll(c, -off);
    pose(c, "walk");
    glide(c, 0, off);
    void c.el.offsetWidth;
    chain(c, [
      [0, function () { glide(c, go.ms, 0); }],
      [go.ms, function () { pose(c, "turn"); }],
      [TURN, function () { pose(c, "stand"); }],
      [550, function () { pose(c, "sit"); }],
      [700, function () { pose(c, "wake"); }],
      [900, function () { pose(c, "sleep"); }]
    ]);
  }

  /* The kitten, up and off the screen through the edge behind her
     corner, and gone; in a hurry, without her stretch. */
  function leave(c, hurry) {
    var corner = sideOf(c);
    if (lessMotion()) {
      clearTimeout(c.nap);
      c.el.hidden = true;
      return;
    }
    var go = stroll(c, (corner === "right" ? 1 : -1) * beyond(c));
    chain(c, setOff(c, corner, go, hurry).concat([
      [go.ms, function () {
        c.el.hidden = true;
        glide(c, 0, 0);
        pose(c, "sleep");
      }]
    ]));
  }

  /* ---------------------------------------------------- clicking */

  /* A cat clicked while she rests lifts her head and looks at the
     visitor, and puts it down again LOOK after the last click, so each
     click keeps her up a while longer. One on her way somewhere is busy:
     the click is ignored. */
  function look(c) {
    if (c.moving) { return; }
    pose(c, "wake");
    clearTimeout(c.nap);
    c.nap = setTimeout(function () {
      c.nap = null;
      pose(c, "sleep");
    }, LOOK);
  }

  /* ------------------------------------------------------ trigger */

  var NAMES = {
    /* Shai walks to the other corner. If the kitten is in it, she sleeps
       on until Shai is about a fifth of the way to her (HEADS_UP of Shai's
       walk), then wakes and hurries off ahead of her, the way Shai is
       going. On a narrow screen, where Shai's walk is short, she goes
       sooner, early enough to be up and a body length out of the corner
       before Shai arrives in it. */
    shai: function () {
      var k = kitten && !kitten.el.hidden ? kitten : null;
      var walk = cross(shai);
      if (!k) { return; }
      if (!walk) { leave(k); return; } /* less motion: she is simply gone */
      var away = span(setOff(k, sideOf(k), { ms: 0, x: 0 }, true)) + 1000 / k.kind.pace;
      var at = Math.max(0, Math.min(walk.start + HEADS_UP * walk.ms, walk.start + walk.ms - away));
      setTimeout(function () { leave(k, true); }, at); /* Shai is moving all the while, so a name typed meanwhile is ignored */
    },
    /* The kitten comes in on the side Shai is not, or, if she is here,
       goes out the way she came. */
    gilad: function () {
      if (kitten && !kitten.el.hidden) {
        leave(kitten);
        return;
      }
      kitten = kitten || build(KITTEN);
      enter(kitten, other(sideOf(shai)));
    }
  };
  var LONGEST_NAME = Math.max.apply(null, Object.keys(NAMES).map(function (n) { return n.length; }));

  document.addEventListener("keydown", function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) { return; }
    var t = e.target;
    if (t && (t.isContentEditable || t.tagName === "INPUT" ||
              t.tagName === "TEXTAREA" || t.tagName === "SELECT")) { return; }
    if (!e.key || e.key.length !== 1) { return; } /* letters only */
    buffer = (buffer + e.key.toLowerCase()).slice(-LONGEST_NAME);
    for (var name in NAMES) {
      if (buffer.slice(-name.length) === name) {
        buffer = "";
        if (!moving) { NAMES[name](); } /* mid-walk: they finish the walk they are on */
        return;
      }
    }
  });
})();
