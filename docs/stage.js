/* crosswayapp.com's hero: a live simulation of Crossway, not a recording.

   The page's other demo (demo.js) illustrates the product by moving a
   selection ring around hand-drawn figures. This one runs it: a pure
   reducer holds the switcher's real state, a scheduler owns the two
   timers, and a renderer writes DOM from whatever state the visitor
   caused. Nothing here is a scripted sequence, and — as everywhere else
   on this site — no requestAnimationFrame loop exists. JS sets state,
   CSS does the motion.

   Fixtures live at the top because they are DATA, not code: the mobile
   build is a smaller set passed to the same reducer, never a second code
   path. Everything is drawn from the stylesheet's tokens, so the whole
   scene re-cuts for night and for the terminal at no cost.

   Apple's app NAMES appear here (nominative use — they are what makes a
   simulated desktop read as a Mac). Their icons do not: every glyph is
   our own, named by shape below and drawn in ink.

   ---------------------------------------------------------------------
   FIDELITY CONTRACT

   This file is a few hundred lines standing in for a six-thousand-line
   controller, so it should say plainly what it does and does not claim.
   The risk it guards against is drift: the app moves, this does not, and
   the hero quietly starts lying.

   MODELLED, and tested:
     · the four chords and the four modes (idle, app, window, grid)
     · opening selects the PREVIOUS item, so one press-and-release
       switches to the app you were just in
     · advance wraps both ways and never clamps
     · cmd-tab from window mode advances the APP and DROPS the window
       selection rather than carrying it
     · cmd-backtick refuses silently on an app with no windows
     · the exposé freezes its window list at session start
     · MRU for apps and for windows; a commit moves both, which is why
       repeated taps ping-pong between the two most recent
     · the native ruleset: an app-only switcher, a chrome-less window
       walk through a frozen order, and no exposé at all
     · the preview pane folding on every advance and re-dropping after
       PREVIEW_DELAY of rest
     · minimized windows: off the desktop and in the Dock, offered by
       the switcher only when the Include minimized option says so, and
       restored by activating them
     · apps quitting (from their menu: every window goes, the app leaves
       every switcher surface) and launching again from the Dock

   NOT MODELLED, deliberately:
     · the show-delay gate. The real app hides all chrome until you have
       held for SHOW_DELAY; here the row appears at once (user decision).
       A click is 80-120ms, which straddles 100ms, so gating it would
       show or hide chrome unpredictably on identical gestures.
     · live capture. Thumbnails are drawn sketches, not screenshots.
     · everything the switcher does about the real world: multiple
       monitors, hidden (as in ⌘H) apps, Spaces, window lists changing
       underfoot mid-session.
     · pointer arbitration (the app's "last physical action wins" rule).
       This demo has no hover selection to arbitrate with.
     · the optional native-cycling mode, the alphabetical and macOS
       window orderings, notification badges, and live previews.

   If you are changing the app and wondering whether to change this file:
   the answer is yes for anything in the first list, and no for anything
   in the second. scripts/test-site-demo-constants.sh fails the build if
   the two timing constants below drift from the app's own. */
(function (root) {
  "use strict";

  /* ---- timing ----------------------------------------------------------
     Both come from the app's own defaults, and are pinned to them by
     scripts/test-site-demo-constants.sh:

       SHOW_DELAY    Preferences.defaultSwitcherShowDelay  (0.100 s)
       PREVIEW_DELAY Preferences.defaultPreviewDelay       (0.400 s)

     SHOW_DELAY is recorded but deliberately NOT enforced — see the
     fidelity contract above. PREVIEW_DELAY is: the pane folds the moment
     you advance and drops again only once the selection has rested. */
  var SHOW_DELAY = 100;
  var PREVIEW_DELAY = 400;

  /* ---- window content sketches ----------------------------------------
     A window is legible at hero size only by its silhouette, so each one
     carries a sketch name rather than real content. This matters more
     than it looks: with Crossway off, ⌘` produces NO chrome at all — just
     a raise — so if two windows look alike that state reads as a dead
     button rather than as native macOS. Distinctness is load-bearing. */
  var SKETCH = {
    PAGE: "page",         /* a browser: toolbar with the address pill, then a page */
    CODE: "code",         /* a terminal: light on dark, prompt lines, a cursor      */
    MAIL: "mail",         /* a mailer: mailboxes, the message list, the message     */
    NOTE: "note",         /* a note: a title, then text on ruled paper              */
    MUSIC: "music",       /* a player: album art, then what is playing              */
    MOVIE: "movie",       /* a film: the projector's screen, playing                */
  };

  /* ---- apps ------------------------------------------------------------
     Ordered MOST RECENTLY USED first. apps[0] is the app the visitor is
     "in" — the reducer's forward initial selection is index 1, the
     PREVIOUS app, exactly as the real switcher's is.

     `glyph` names a shape we draw ourselves. No Apple icon art. */
  var APPS = [
    { id: "safari",    name: "Safari",           glyph: "compass" },
    { id: "terminal",  name: "Terminal",         glyph: "prompt" },
    /* Third, one Tab past Terminal, so reaching the film is a walk along
       the row with its tile seen PLAYING before it is chosen: that is
       the live previews, shown. Its window starts mostly hidden under a
       Terminal window, so choosing it visibly brings it forward. */
    { id: "quicktime", name: "QuickTime Player", glyph: "reel" },
    { id: "mail",     name: "Mail",     glyph: "envelope", badge: 3 },
    { id: "notes",    name: "Notes",    glyph: "note" },
    { id: "music",    name: "Music",    glyph: "beam" },
  ];

  /* ---- windows ---------------------------------------------------------
     Also MRU-ordered, and FLAT: every surface reads this one list. The
     exposé grid is a frozen slice of it, not a per-app tree.

     Geometry is percent-of-screen so the desktop scales with the display.
     The windows are spread across the whole desktop at the sizes real
     windows have (a wide mailer, a tall note, a squarer player — nothing
     shrunk to fit), the front one sits off-centre, and every window
     keeps a visible edge or corner in the default stack: nothing is
     buried, so every raise is readable and every window can be clicked.
     The test rasterises the stack to check.

     Note the shape of the set: Notes has exactly ONE window (⌘` there has
     nothing to cycle to), and Terminal has FOUR (so the preview strip is
     worth opening). The reducer must also survive an app with ZERO
     windows — ⌘` aborts silently — which is not representable on a
     believable desktop, so it is covered by a fixture in the tests
     rather than shipped in the hero. */
  var WINDOWS = [
    { id: "sa1", app: "safari",    title: "Crossway — a window switcher for macOS", sketch: SKETCH.PAGE,  x: 6,  y: 12, w: 42, h: 56 },
    /* A big Terminal window sits over the film: about a fifth of the
       film shows (its bottom band, where the skyline plays), so choosing
       it in the switcher visibly brings it forward. */
    { id: "tm1", app: "terminal",  title: "~/Projects/Crossway — zsh",              sketch: SKETCH.CODE,  x: 34, y: 28, w: 46, h: 46 },
    { id: "sa2", app: "safari",    title: "GitHub — crossway-app/Crossway",         sketch: SKETCH.PAGE,  x: 24, y: 2,  w: 30, h: 30 },
    { id: "tm2", app: "terminal",  title: "run-tests.sh — 1815 passing",            sketch: SKETCH.CODE,  x: 76, y: 30, w: 24, h: 34 },
    { id: "qt1", app: "quicktime", title: "Flipbook.mov",                           sketch: SKETCH.MOVIE, x: 40, y: 36, w: 46, h: 48 },
    { id: "ml1", app: "mail",      title: "Inbox — 3 unread",                       sketch: SKETCH.MAIL,  x: 2,  y: 6,  w: 44, h: 30 },
    { id: "nt1", app: "notes",     title: "Release notes — 1.12",                   sketch: SKETCH.NOTE,  x: 0,  y: 46, w: 22, h: 44 },
    { id: "ms1", app: "music",     title: "Now Playing",                            sketch: SKETCH.MUSIC, x: 52, y: 5,  w: 26, h: 32 },
    { id: "tm4", app: "terminal",  title: "server.log — tail -f",                   sketch: SKETCH.CODE,  x: 14, y: 62, w: 30, h: 28 },
    { id: "sa3", app: "safari",    title: "Apple Developer Documentation",          sketch: SKETCH.PAGE,  x: 10, y: 16, w: 44, h: 50, minimized: true },
    { id: "tm3", app: "terminal",  title: "~ — top",                                sketch: SKETCH.CODE,  x: 30, y: 20, w: 46, h: 46, minimized: true },
    { id: "ml2", app: "mail",      title: "Re: Crossway 1.11 feedback",             sketch: SKETCH.MAIL,  x: 20, y: 20, w: 50, h: 44, minimized: true },
    { id: "ms2", app: "music",     title: "Focus — playlist",                       sketch: SKETCH.MUSIC, x: 44, y: 40, w: 40, h: 38, minimized: true },
  ];

  /* ---- the Dock --------------------------------------------------------
     A fixed order, never the MRU: a Dock that reshuffles is not a Dock.
     And the window a quit app opens when it is launched again, one per
     app, placed where the spread leaves room. */
  var DOCK = ["safari", "mail", "notes", "music", "quicktime", "terminal"];
  var FRESH = {
    safari:   { title: "Start Page",  sketch: SKETCH.PAGE,  x: 20, y: 12, w: 52, h: 56 },
    terminal: { title: "~ — zsh",     sketch: SKETCH.CODE,  x: 34, y: 28, w: 46, h: 46 },
    mail:     { title: "Inbox",       sketch: SKETCH.MAIL,  x: 10, y: 20, w: 48, h: 50 },
    notes:    { title: "New Note",    sketch: SKETCH.NOTE,  x: 60, y: 14, w: 30, h: 56 },
    music:     { title: "Browse",       sketch: SKETCH.MUSIC, x: 40, y: 60, w: 30, h: 26 },
    quicktime: { title: "Flipbook.mov", sketch: SKETCH.MOVIE, x: 40, y: 36, w: 46, h: 48 },
  };

  /* The default desktop. Cloned on use so a stage can never mutate the
     module's own arrays — two stages on one page stay independent. */
  function defaultFixtures() {
    return {
      apps: APPS.map(function (a) {
        return { id: a.id, name: a.name, glyph: a.glyph, badge: a.badge || 0 };
      }),
      windows: WINDOWS.map(function (w) {
        return { id: w.id, app: w.app, title: w.title, sketch: w.sketch,
                 x: w.x, y: w.y, w: w.w, h: w.h, minimized: !!w.minimized };
      }),
    };
  }

  /* The small screen's desktop: three apps, five windows, same shape.
     A 3x3 exposé grid of titled thumbnails inside a drawn screen at
     ~296px is an unreadable smudge, so the phone gets fewer things
     rather than smaller ones. A SWAP of data — never a second renderer. */
  function compactFixtures() {
    var keepApps = { safari: 1, quicktime: 1, terminal: 1 };
    var full = defaultFixtures();
    var windows = full.windows.filter(function (w) { return keepApps[w.app]; });
    var seen = {};
    /* Safari keeps two, everyone else one, so the strip still has
       something to show and ⌘` still means something. */
    var limit = { safari: 2, quicktime: 1, terminal: 2 };
    windows = windows.filter(function (w) {
      seen[w.app] = (seen[w.app] || 0) + 1;
      return seen[w.app] <= limit[w.app];
    });
    return {
      apps: full.apps.filter(function (a) { return keepApps[a.id]; }),
      windows: windows,
    };
  }

  /* ====================================================================
     THE REDUCER

     Pure and synchronous. It never touches the DOM and owns no timers —
     the scheduler calls it, the renderer reads what it produced. That
     split is what makes the hero a simulation rather than a recording:
     every state it can be in is one the visitor drove it to.

     Four modes, matching SwitcherMode.swift exactly:
       idle    nothing open
       app     the ⌘Tab app row
       window  the ⌘` window strip, within one app
       grid    the ⌥ exposé, a FLAT index into a frozen window list
     ==================================================================== */

  var MODE = { IDLE: "idle", APP: "app", WINDOW: "window", GRID: "grid" };

  /* Which modifier owns a chord. The real app enforces ⌘/⌥ mutual
     exclusion through sessionOwner; here a chord belonging to the other
     modifier ends the open session and starts its own, which is the only
     reading that makes sense when the input is buttons. */
  var OWNER = { "cmd-tab": "cmd", "cmd-tick": "cmd", "opt-tab": "opt", "opt-tick": "opt" };

  /* Advance wraps in both directions and never clamps. One helper for
     apps, windows, and the grid — the real controller uses one too. */
  function nextIndex(current, count, reverse) {
    if (count <= 0) { return 0; }
    return reverse ? (current - 1 + count) % count : (current + 1) % count;
  }

  /* Opening a session selects the PREVIOUS item, not the current one:
     index 1 forward, the last item in reverse. This is why a single
     ⌘Tab press-and-release switches to the app you were just in. */
  function initialIndex(count, reverse) {
    if (count <= 0) { return 0; }
    return reverse ? count - 1 : Math.min(1, count - 1);
  }

  /* Which windows a SWITCHER may offer. Minimized windows are not in the
     system's own lists at all — that is precisely the gap Crossway fills
     — so without Crossway they are always dropped, and with it the
     includeMinimized option decides. The desktop is unaffected: it draws
     what exists, and a minimized window is simply not on it. */
  function switchable(state, list) {
    if (state.crosswayEnabled && state.includeMinimized) { return list; }
    return list.filter(function (w) { return !w.minimized; });
  }

  function windowsForApp(state, appId) {
    return switchable(state, state.windows.filter(function (w) {
      return w.app === appId;
    }));
  }

  function moveToFront(list, predicate) {
    var i = list.findIndex(predicate);
    if (i <= 0) { return list.slice(); }
    var copy = list.slice();
    var item = copy.splice(i, 1)[0];
    copy.unshift(item);
    return copy;
  }

  function createState(fixtures) {
    return {
      mode: MODE.IDLE,
      appIndex: 0,
      windowIndex: 0,
      gridIndex: 0,
      /* On by default: reaching a minimized window without touching the
         mouse is one of the things Crossway is FOR. */
      includeMinimized: true,
      gridWindows: [],
      /* "all" or "app" while a grid is open: the live region says which. */
      gridScope: null,
      apps: fixtures.apps,
      windows: fixtures.windows,
      /* Every app the desktop has, running or not: the Dock lists these,
         and a quit app is launched again from here. */
      catalogue: fixtures.apps.slice(),
      /* Fresh windows need ids no window has had. */
      spawned: 0,
      crosswayEnabled: true,
      /* Native cmd-backtick walks a FROZEN window order rather than the
         live MRU, which is what makes it a walk and not a ping-pong. */
      nativeCycle: null,
    };
  }

  /* --- session openers -------------------------------------------------- */

  function openApp(state, reverse) {
    if (!state.apps.length) { return state; }
    var s = Object.assign({}, state);
    s.mode = MODE.APP;
    s.appIndex = initialIndex(s.apps.length, reverse);
    s.windowIndex = 0;
    return s;
  }

  /* ⌘` from idle opens on the FRONTMOST app — apps[0], the one you are
     already in — because its job is switching between that app's own
     windows. Aborts to idle if it has none. */
  function openWindow(state, reverse) {
    if (!state.apps.length) { return state; }
    var s = Object.assign({}, state);
    var wins = windowsForApp(state, state.apps[0].id);
    if (!wins.length) { return state; }
    s.mode = MODE.WINDOW;
    s.appIndex = 0;
    s.windowIndex = initialIndex(wins.length, reverse);
    return s;
  }

  /* The grid freezes its window list at session start: later advances
     index into that snapshot, never into the live MRU order, so the
     tiles cannot reshuffle under the visitor mid-session. */
  function openGrid(state, scope, reverse) {
    if (scope === "app" && !state.apps.length) { return state; }
    var s = Object.assign({}, state);
    var list = scope === "app"
      ? windowsForApp(state, state.apps[0].id)
      : switchable(state, state.windows);
    if (!list.length) { return state; }
    s.mode = MODE.GRID;
    s.gridWindows = list;
    s.gridScope = scope;
    s.gridIndex = initialIndex(list.length, reverse);
    return s;
  }

  /* ====================================================================
     THE NATIVE macOS RULESET

     What the visitor gets with Crossway switched off. Deliberately a
     separate branch rather than conditionals threaded through the
     Crossway path: the two behave differently enough that interleaving
     them would hide the very difference the hero exists to show.

     Two things carry the comparison:

     - cmd-backtick draws NOTHING. No panel, no thumbnails, no titles —
       macOS just raises the next window. The demo's desktop has to be
       legible enough that a bare raise reads as an event, which is why
       the fixtures insist on distinct titles and staggered origins.

     - cmd-backtick WALKS, one window at a time, through an order frozen
       when the run began. Crossway's ping-pongs between the two most
       recent instead. Both are right; they are simply different tools,
       and putting them side by side is the argument.

     Exposé does not exist here at all. The option chords are inert, and
     their buttons grey out rather than disappearing. */
  function pressNative(state, chord, opts) {
    var reverse = !!(opts && opts.shift);

    /* No exposé without Crossway. */
    if (chord === "opt-tab" || chord === "opt-tick") { return state; }

    if (chord === "cmd-tab") {
      if (!state.apps.length) { return state; }
      var s = Object.assign({}, state);
      s.nativeCycle = null;           /* a different chord ends the run */
      if (state.mode === MODE.APP) {
        s.appIndex = nextIndex(state.appIndex, state.apps.length, reverse);
        return s;
      }
      s.mode = MODE.APP;              /* app-only switcher; no strip ever */
      s.appIndex = initialIndex(state.apps.length, reverse);
      return s;
    }

    if (chord === "cmd-tick") {
      if (!state.apps.length) { return state; }
      var appId = state.apps[0].id;
      var cycle = state.nativeCycle;
      if (!cycle || cycle.app !== appId) {
        var order = windowsForApp(state, appId);
        /* One window means there is nothing to cycle to, and macOS shows
           nothing at all. Not an error — just no visible effect. */
        if (order.length < 2) { return state; }
        cycle = { app: appId, order: order.map(function (w) { return w.id; }), index: 0 };
      }
      var i = nextIndex(cycle.index, cycle.order.length, reverse);
      var targetId = cycle.order[i];
      var n = Object.assign({}, state);
      n.nativeCycle = { app: appId, order: cycle.order, index: i };
      n.windows = moveToFront(state.windows, function (w) { return w.id === targetId; });
      n.mode = MODE.IDLE;             /* the raise IS the whole event */
      return n;
    }

    return state;
  }

  /* --- the chord table --------------------------------------------------- */

  function press(state, chord, opts) {
    var reverse = !!(opts && opts.shift);
    if (!OWNER[chord]) { return state; }
    if (!state.crosswayEnabled) { return pressNative(state, chord, opts); }

    /* A chord from the other modifier ends this session first. */
    if (state.mode !== MODE.IDLE) {
      var openOwner = (state.mode === MODE.GRID) ? "opt" : "cmd";
      if (OWNER[chord] !== openOwner) {
        state = commit(state);
      }
    }

    if (chord === "cmd-tab") {
      if (state.mode === MODE.APP) {
        var a = Object.assign({}, state);
        a.appIndex = nextIndex(state.appIndex, state.apps.length, reverse);
        return a;
      }
      /* From WINDOW mode ⌘Tab advances the APP and DROPS the window
         selection entirely — it does not carry the highlighted window
         across. Subtle, and the thing a naive port gets wrong. */
      if (state.mode === MODE.WINDOW) {
        var b = Object.assign({}, state);
        b.mode = MODE.APP;
        b.appIndex = nextIndex(state.appIndex, state.apps.length, reverse);
        b.windowIndex = 0;
        return b;
      }
      return openApp(state, reverse);
    }

    if (chord === "cmd-tick") {
      /* Descend from the app row into that app's windows. Silently
         refuses if the highlighted app has none — the session simply
         stays where it was rather than opening an empty strip. */
      if (state.mode === MODE.APP) {
        var wins = windowsForApp(state, state.apps[state.appIndex].id);
        if (!wins.length) { return state; }
        var c = Object.assign({}, state);
        c.mode = MODE.WINDOW;
        c.windowIndex = initialIndex(wins.length, reverse);
        return c;
      }
      if (state.mode === MODE.WINDOW) {
        var d = Object.assign({}, state);
        var n = windowsForApp(state, state.apps[state.appIndex].id).length;
        d.windowIndex = nextIndex(state.windowIndex, n, reverse);
        return d;
      }
      return openWindow(state, reverse);
    }

    if (chord === "opt-tab" || chord === "opt-tick") {
      if (state.mode === MODE.GRID) {
        var e = Object.assign({}, state);
        e.gridIndex = nextIndex(state.gridIndex, state.gridWindows.length, reverse);
        return e;
      }
      return openGrid(state, chord === "opt-tick" ? "app" : "all", reverse);
    }

    return state;
  }

  /* Tab within an open session. Same advance in every mode. */
  function advance(state, opts) {
    var reverse = !!(opts && opts.shift);
    /* Native has only the app switcher to advance through. */
    if (!state.crosswayEnabled && state.mode !== MODE.APP) { return state; }
    if (state.mode === MODE.APP) {
      var a = Object.assign({}, state);
      a.appIndex = nextIndex(state.appIndex, state.apps.length, reverse);
      return a;
    }
    if (state.mode === MODE.WINDOW) {
      var b = Object.assign({}, state);
      var n = windowsForApp(state, state.apps[state.appIndex].id).length;
      b.windowIndex = nextIndex(state.windowIndex, n, reverse);
      return b;
    }
    if (state.mode === MODE.GRID) {
      var c = Object.assign({}, state);
      c.gridIndex = nextIndex(state.gridIndex, state.gridWindows.length, reverse);
      return c;
    }
    return state;
  }

  /* Esc abandons the session. Nothing is committed, so no MRU moves and
     the desktop is exactly as it was. */
  function escape(state) {
    var s = Object.assign({}, state);
    s.mode = MODE.IDLE;
    s.gridWindows = [];
    s.gridScope = null;
    s.nativeCycle = null;
    return s;
  }

  /* The mouse picks a cell directly rather than walking to it. Each pick
     is gated on the surface it belongs to, so a stray event on a surface
     that is not open changes nothing: an app is picked from the row (or
     from the strip, which climbs back to the row), a window from the
     strip of the selected app, a tile from the exposé. */
  function selectApp(state, index) {
    if (state.mode !== MODE.APP && state.mode !== MODE.WINDOW) { return state; }
    if (index < 0 || index >= state.apps.length) { return state; }
    return Object.assign({}, state, { mode: MODE.APP, appIndex: index, windowIndex: 0 });
  }
  function selectWindow(state, index) {
    if (state.mode !== MODE.APP && state.mode !== MODE.WINDOW) { return state; }
    /* Without Crossway there is no strip to pick from. */
    if (!state.crosswayEnabled || !state.apps.length) { return state; }
    var n = windowsForApp(state, state.apps[state.appIndex].id).length;
    if (index < 0 || index >= n) { return state; }
    return Object.assign({}, state, { mode: MODE.WINDOW, windowIndex: index });
  }
  function selectGrid(state, index) {
    if (state.mode !== MODE.GRID) { return state; }
    if (index < 0 || index >= state.gridWindows.length) { return state; }
    return Object.assign({}, state, { gridIndex: index });
  }

  /* What the selection resolves to, or null when nothing is open. */
  function selectedWindow(state) {
    if (state.mode === MODE.WINDOW) {
      return windowsForApp(state, state.apps[state.appIndex].id)[state.windowIndex] || null;
    }
    if (state.mode === MODE.GRID) {
      return state.gridWindows[state.gridIndex] || null;
    }
    if (state.mode === MODE.APP) {
      return windowsForApp(state, state.apps[state.appIndex].id)[0] || null;
    }
    return null;
  }

  function selectedApp(state) {
    if (state.mode === MODE.GRID) {
      var w = selectedWindow(state);
      return w ? state.apps.find(function (a) { return a.id === w.app; }) || null : null;
    }
    if (state.mode === MODE.IDLE) { return null; }
    return state.apps[state.appIndex] || null;
  }

  /* Releasing the modifier commits. Both MRU lists move — the chosen
     window to the front of the flat list, its app to the front of the
     app list — which is what makes repeated taps ping-pong between the
     two most recent. That is correct, and it is the point. */
  /* ====================================================================
     THE DESKTOP IS REAL TOO

     Windows raise, move, close, minimize and zoom. All of it goes
     through the reducer, so the switcher's lists and the desktop can
     never disagree about what exists or what is minimized — which is
     the whole reason the minimized option has anything to talk about.
     ==================================================================== */

  function mapWindow(state, id, fn) {
    return Object.assign({}, state, {
      windows: state.windows.map(function (w) {
        return w.id === id ? fn(w) : w;
      }),
    });
  }

  /* Clicking a window activates its app as well as raising the window:
     the app moves to the front of the MRU, so the menu bar, ⌘` and the
     app-scoped grid all agree about which app is current. Without this
     the menu bar said Mail while ⌘` cycled Safari. */
  function raiseWindow(state, id) {
    var win = state.windows.find(function (w) { return w.id === id; });
    if (!win) { return state; }
    return Object.assign({}, state, {
      windows: moveToFront(state.windows, function (w) { return w.id === id; }),
      apps: moveToFront(state.apps, function (a) { return a.id === win.app; }),
    });
  }

  function closeWindow(state, id) {
    return Object.assign({}, state, {
      windows: state.windows.filter(function (w) { return w.id !== id; }),
      /* A closed window cannot stay in an open exposé. */
      gridWindows: state.gridWindows.filter(function (w) { return w.id !== id; }),
    });
  }

  function minimizeWindow(state, id) {
    return mapWindow(state, id, function (w) {
      return Object.assign({}, w, { minimized: true });
    });
  }

  /* Zoom TOGGLES, and remembers where the window was. macOS zoom is not
     really "maximize", but in a demo of a switcher the distinction earns
     nothing and full-screen reads instantly. */
  function zoomWindow(state, id) {
    return mapWindow(state, id, function (w) {
      if (w.zoomed) {
        var r = w.restore || { x: w.x, y: w.y, w: w.w, h: w.h };
        return Object.assign({}, w, {
          zoomed: false, restore: null, x: r.x, y: r.y, w: r.w, h: r.h,
        });
      }
      return Object.assign({}, w, {
        zoomed: true,
        restore: { x: w.x, y: w.y, w: w.w, h: w.h },
        x: 0, y: 0, w: 100, h: 100,
      });
    });
  }

  /* Percentages of the desktop, clamped so a window can always be caught
     again: a strip of the title bar stays on screen on every side. */
  function moveWindow(state, id, x, y) {
    return mapWindow(state, id, function (w) {
      if (w.zoomed) { return w; }
      var minX = -(w.w - 8);
      var maxX = 100 - 8;
      return Object.assign({}, w, {
        x: Math.max(minX, Math.min(maxX, x)),
        y: Math.max(0, Math.min(100 - 6, y)),
      });
    });
  }

  /* The smallest a window can be dragged to, in percent of the desktop:
     a title bar with a little body under it, still a window and still
     catchable. The largest is the screen, which the zoom already knows. */
  var MIN_WIN = { w: 18, h: 16 };

  /* Resize by an edge or a corner. `frame` is where the pointer would
     put the window; `from` says which edges are being pulled (l, t), so
     when the minimum or the screen stops a pull it is the pulled edge
     that stops and the other one stays put, as on a Mac. Zoomed windows
     do not resize; the zoom is the size. */
  function resizeWindow(state, id, frame, from) {
    from = from || {};
    return mapWindow(state, id, function (w) {
      if (w.zoomed) { return w; }
      var x = frame.x, y = frame.y;
      var right = frame.x + frame.w, bottom = frame.y + frame.h;
      if (x < 0) { x = 0; }
      if (y < 0) { y = 0; }
      if (right > 100) { right = 100; }
      if (bottom > 100) { bottom = 100; }
      var width = right - x, height = bottom - y;
      if (width < MIN_WIN.w) {
        if (from.l) { x = right - MIN_WIN.w; }
        width = MIN_WIN.w;
      }
      if (height < MIN_WIN.h) {
        if (from.t) { y = bottom - MIN_WIN.h; }
        height = MIN_WIN.h;
      }
      if (x + width > 100) { x = 100 - width; }
      if (y + height > 100) { y = 100 - height; }
      if (x < 0) { x = 0; }
      if (y < 0) { y = 0; }
      return Object.assign({}, w, { x: x, y: y, w: width, h: height });
    });
  }

  /* Quit, from the app's own menu: every window goes, minimized ones
     included, the app leaves the MRU and so every switcher surface, and
     any open session is abandoned rather than committed (the pointer is
     on the menu bar, not on a chord). The next app in the MRU becomes
     the active one, as on a Mac. */
  function quitApp(state, id) {
    if (!state.apps.some(function (a) { return a.id === id; })) { return state; }
    var s = escape(state);
    s.apps = s.apps.filter(function (a) { return a.id !== id; });
    s.windows = s.windows.filter(function (w) { return w.app !== id; });
    s.appIndex = 0;
    s.windowIndex = 0;
    s.gridIndex = 0;
    return s;
  }

  /* ---- the Dock's three verbs ----------------------------------------
     Each abandons any open session first, as a quit does: the pointer is
     on the Dock, not on a chord. */

  /* Restore a minimized window: back on the desktop, in front, and its
     app active, exactly what clicking it in the Dock does. */
  function restoreWindow(state, id) {
    var win = state.windows.find(function (w) { return w.id === id; });
    if (!win) { return state; }
    var s = escape(state);
    s.windows = moveToFront(s.windows.map(function (w) {
      return w.id === id ? Object.assign({}, w, { minimized: false }) : w;
    }), function (w) { return w.id === id; });
    s.apps = moveToFront(s.apps, function (a) { return a.id === win.app; });
    return s;
  }

  /* Activate a running app: to the front of the MRU, its windows that
     are on the desktop brought forward in their own order, and if every
     one of them is minimized, the most recent one restored, as the Dock
     does. */
  function activateApp(state, id) {
    if (!state.apps.some(function (a) { return a.id === id; })) { return state; }
    var mine = state.windows.filter(function (w) { return w.app === id; });
    var up = mine.filter(function (w) { return !w.minimized; });
    if (!up.length && mine.length) { return restoreWindow(state, mine[0].id); }
    var s = escape(state);
    s.apps = moveToFront(s.apps, function (a) { return a.id === id; });
    s.windows = up.concat(s.windows.filter(function (w) { return w.app !== id || w.minimized; }));
    return s;
  }

  /* Launch a quit app: back at the front of the MRU with one fresh
     window from its template, in front. On a running app this is
     activate, which is what a Dock click means either way. */
  function launchApp(state, id) {
    if (state.apps.some(function (a) { return a.id === id; })) { return activateApp(state, id); }
    var app = state.catalogue.find(function (a) { return a.id === id; });
    var fresh = FRESH[id];
    if (!app || !fresh) { return state; }
    var s = escape(state);
    var n = (state.spawned || 0) + 1;
    s.spawned = n;
    s.apps = [app].concat(s.apps);
    s.windows = [{ id: id + "-" + n, app: id, title: fresh.title, sketch: fresh.sketch,
                   x: fresh.x, y: fresh.y, w: fresh.w, h: fresh.h, minimized: false }].concat(s.windows);
    return s;
  }

  function commit(state) {
    if (state.mode === MODE.IDLE) { return state; }
    var win = selectedWindow(state);
    var app = selectedApp(state);
    var s = Object.assign({}, state);
    if (win) {
      s.windows = moveToFront(state.windows, function (w) { return w.id === win.id; });
      /* Activating a minimized window restores it, exactly as it does on
         a Mac. Without this the demo would commit to a window that then
         stays invisible. */
      if (win.minimized) {
        s.windows = s.windows.map(function (w) {
          return w.id === win.id ? Object.assign({}, w, { minimized: false }) : w;
        });
      }
    }
    if (app) {
      s.apps = moveToFront(s.apps, function (a) { return a.id === app.id; });
    }
    s.mode = MODE.IDLE;
    s.gridWindows = [];
    s.gridScope = null;
    s.nativeCycle = null;
    s.appIndex = 0;
    s.windowIndex = 0;
    s.gridIndex = 0;
    return s;
  }

  /* --- the stage: a thin mutable shell over the pure functions --------- */

  function createStage(fixtures) {
    var state = createState(fixtures || defaultFixtures());
    return {
      get state() { return state; },
      press: function (chord, opts) { state = press(state, chord, opts); return state; },
      advance: function (opts) { state = advance(state, opts); return state; },
      escape: function () { state = escape(state); return state; },
      release: function () { state = commit(state); return state; },
      selectApp: function (i) { state = selectApp(state, i); return state; },
      selectWindow: function (i) { state = selectWindow(state, i); return state; },
      selectGrid: function (i) { state = selectGrid(state, i); return state; },
      /* Changing what the switcher may reach mid-session would move the
         selection under the user, so this abandons the session first —
         the same reasoning as the mode switch below. */
      raiseWindow: function (id) { state = raiseWindow(state, id); return state; },
      closeWindow: function (id) { state = closeWindow(state, id); return state; },
      minimizeWindow: function (id) { state = minimizeWindow(state, id); return state; },
      zoomWindow: function (id) { state = zoomWindow(state, id); return state; },
      moveWindow: function (id, x, y) { state = moveWindow(state, id, x, y); return state; },
      resizeWindow: function (id, frame, from) { state = resizeWindow(state, id, frame, from); return state; },
      quitApp: function (id) { state = quitApp(state, id); return state; },
      launchApp: function (id) { state = launchApp(state, id); return state; },
      activateApp: function (id) { state = activateApp(state, id); return state; },
      restoreWindow: function (id) { state = restoreWindow(state, id); return state; },
      setIncludeMinimized: function (on) {
        state = escape(state);
        state = Object.assign({}, state, { includeMinimized: !!on });
        return state;
      },
      setCrosswayEnabled: function (on) {
        /* Abandon rather than commit: flipping the toggle is the visitor
           inspecting the comparison, not choosing a window, so it must
           not reorder anything behind their back. */
        state = escape(state);
        state = Object.assign({}, state, { crosswayEnabled: !!on });
        return state;
      },
      selectedWindow: function () { return selectedWindow(state); },
      selectedApp: function () { return selectedApp(state); },
      windowsForApp: function (appId) { return windowsForApp(state, appId); },
    };
  }

  /* ====================================================================
     WHAT A SCREEN READER HEARS

     The demo is visual by nature, so without this it is a box that
     announces nothing. One polite live region, one sentence per SETTLED
     state — not a stream. Walking the app row fires an advance every
     keystroke, and reading each one aloud would bury the visitor; the
     sentence is only spoken when it actually changes.

     Pure function, so the wording is testable without a browser.
     ==================================================================== */
  function describeState(state, last) {
    if (state.mode === MODE.IDLE) {
      /* After a commit, say what happened rather than going silent. */
      if (last && last.committedApp) {
        var w = last.committedWindow;
        return w ? "Switched to " + last.committedApp + ", " + w + "."
                 : "Switched to " + last.committedApp + ".";
      }
      return "";
    }

    /* The same lists the panel renders, never the raw window list: with
       Include minimized off, the raw list named a window the strip did
       not show and counted one it could not reach. */
    var app = state.apps[state.appIndex];

    if (state.mode === MODE.APP) {
      var n = windowsForApp(state, app.id).length;
      if (!state.crosswayEnabled) {
        return "System switcher. " + app.name + " selected.";
      }
      return "Switcher open. " + app.name + " selected, " +
        n + (n === 1 ? " window." : " windows.");
    }

    if (state.mode === MODE.WINDOW) {
      var wins = windowsForApp(state, app.id);
      var win = wins[state.windowIndex];
      return app.name + " windows. " + (win ? win.title : "none") +
        ", " + (state.windowIndex + 1) + " of " + wins.length + ".";
    }

    if (state.mode === MODE.GRID) {
      var g = state.gridWindows[state.gridIndex];
      var scope = state.gridScope === "app" && state.apps.length
        ? state.apps[0].name + " windows. "
        : "All windows. ";
      return scope + (g ? g.title : "none") +
        ", " + (state.gridIndex + 1) + " of " + state.gridWindows.length + ".";
    }
    return "";
  }

  /* ====================================================================
     THE RENDERER

     Idempotent: render(state) can run at any moment and produces the
     same DOM for the same state. It creates each window element once and
     thereafter only updates attributes, so nothing is torn down and
     rebuilt — which is both why it is cheap and why CSS transitions
     survive across renders.

     There is no loop here. The renderer runs when something happened,
     and the motion between two renders belongs entirely to CSS.
     ==================================================================== */

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) { e.className = cls; }
    if (text != null) { e.textContent = text; }
    return e;
  }

  function bars(n, cls) {
    var frag = document.createDocumentFragment();
    for (var i = 0; i < n; i++) { frag.appendChild(el("i", cls || "cw-bar")); }
    return frag;
  }

  /* Windows are told apart by silhouette, not by reading them: one
     drawing per app, and the one thing that makes each is stated where
     it is built. The waveform is a fixed profile: the same window must
     draw the same picture on every render, or an idempotent renderer is
     a lie. All of it is grey; the app glyphs stay the only colour. */
  function buildSketch(kind, projector) {
    var s = el("div", "cw-sketch cw-sketch-" + kind);
    if (kind === SKETCH.MOVIE) {
      /* the film is what makes it a player: a screen the projector
         paints, in the window and in every preview of it alike */
      s.appendChild(projector ? projector.mount() : el("div", "cw-reel"));
    } else if (kind === SKETCH.PAGE) {
      /* the address pill is what makes it a browser */
      var bar = el("div", "cw-toolbar");
      bar.appendChild(el("i", "cw-nav"));
      bar.appendChild(el("i", "cw-nav"));
      bar.appendChild(el("i", "cw-url"));
      s.appendChild(bar);
      s.appendChild(el("div", "cw-head"));
      var cols = el("div", "cw-cols");
      for (var c = 0; c < 2; c++) {
        var col = el("div", "cw-col");
        col.appendChild(bars(c === 0 ? 5 : 4));
        cols.appendChild(col);
      }
      s.appendChild(cols);
    } else if (kind === SKETCH.CODE) {
      /* light on dark is what makes it a terminal */
      for (var l = 0; l < 6; l++) {
        var line = el("div", "cw-line");
        line.appendChild(el("i", "cw-prompt"));
        line.appendChild(el("i", "cw-bar"));
        s.appendChild(line);
      }
      var last = el("div", "cw-line");
      last.appendChild(el("i", "cw-prompt"));
      last.appendChild(el("i", "cw-cursor"));
      s.appendChild(last);
    } else if (kind === SKETCH.MAIL) {
      /* three panes are what make it a mailer */
      var side = el("div", "cw-pane cw-pane-side");
      side.appendChild(bars(4));
      var list = el("div", "cw-pane cw-pane-list");
      for (var r = 0; r < 4; r++) {
        var row = el("div", "cw-row");
        row.appendChild(el("i", "cw-dot"));
        var lines = el("div", "cw-lines");
        lines.appendChild(el("i", "cw-bar is-strong"));
        lines.appendChild(el("i", "cw-bar"));
        row.appendChild(lines);
        list.appendChild(row);
      }
      var read = el("div", "cw-pane cw-pane-read");
      read.appendChild(el("div", "cw-head"));
      read.appendChild(bars(5));
      s.appendChild(side);
      s.appendChild(list);
      s.appendChild(read);
    } else if (kind === SKETCH.NOTE) {
      /* the ruling is what makes it a note */
      s.appendChild(el("i", "cw-bar is-title"));
      s.appendChild(bars(5));
    } else if (kind === SKETCH.MUSIC) {
      /* the album art is what makes it a player */
      var tiles = el("div", "cw-tiles");
      for (var t = 0; t < 4; t++) { tiles.appendChild(el("i", "cw-tile-art")); }
      s.appendChild(tiles);
      var now = el("div", "cw-now");
      now.appendChild(el("i", "cw-tile-art"));
      var wave = el("div", "cw-wave");
      var heights = [30, 62, 44, 88, 56, 100, 48, 74, 36, 66, 52, 82, 40, 58];
      for (var i = 0; i < heights.length; i++) {
        var beat = el("i");
        beat.style.height = heights[i] + "%";
        wave.appendChild(beat);
      }
      now.appendChild(wave);
      s.appendChild(now);
    } else {
      s.appendChild(bars(6));
    }
    return s;
  }

  function buildWindow(win, projector) {
    var w = el("div", "cw-win");
    w.dataset.win = win.id;
    var bar = el("div", "cw-win-bar");
    var lights = el("div", "cw-lights");
    ["close", "min", "zoom"].forEach(function (k) {
      lights.appendChild(el("i", "cw-light cw-light-" + k));
    });
    bar.appendChild(lights);
    bar.appendChild(el("span", "cw-win-title", win.title));
    var body = el("div", "cw-win-body cw-body-" + win.sketch);
    body.appendChild(buildSketch(win.sketch, projector));
    w.appendChild(bar);
    w.appendChild(body);
    return w;
  }

  /* Geometry lives in the model and changes as windows are dragged and
     zoomed, so it is written on every render rather than once at build. */
  function placeWindow(e, win) {
    e.style.left = win.x + "%";
    e.style.top = win.y + "%";
    e.style.width = win.w + "%";
    e.style.height = win.h + "%";
  }

  /* A thumbnail is a picture of a WHOLE WINDOW, chrome included — the
     same construction the desktop draws, shrunk. Crossway captures the
     window, so its title bar and traffic lights are in the shot; a bare
     sketch in a bordered card is a content card, not a screenshot.
     
     It is LETTERBOXED, never stretched: `contentsGravity = .resizeAspect`
     (WindowPreviewCell.swift:195). The miniature keeps its own aspect and
     is centred in the slot, and the leftover bars stay transparent so the
     pane — or, on a selected tile, the selection tint — shows through
     them. Which axis binds is decided here rather than left to CSS, so a
     tall window pillarboxes and a wide one letterboxes. */
  function buildMini(win, opts, projector) {
    var m = el("div", "cw-mini");
    var bar = el("div", "cw-win-bar");
    var lights = el("div", "cw-lights");
    ["close", "min", "zoom"].forEach(function (k) {
      lights.appendChild(el("i", "cw-light cw-light-" + k));
    });
    bar.appendChild(lights);
    bar.appendChild(el("span", "cw-win-title", win.title));
    var body = el("div", "cw-win-body cw-body-" + win.sketch);
    body.appendChild(buildSketch(win.sketch, projector));
    m.appendChild(bar);
    m.appendChild(body);

    /* Crossway marks a minimized window on its own tile, because
       reaching one without the mouse is the point of showing it at all.
       Bottom-right, over the picture, as the app has it. */
    if (win.minimized && !(opts && opts.tag === false)) {
      m.appendChild(el("span", "cw-mini-tag", "Minimized"));
    }

    var ratio = (win.w / win.h) * DESKTOP_ASPECT;
    m.style.aspectRatio = String(ratio);
    if (ratio >= TILE_ASPECT) {
      m.style.width = "100%";
      m.style.height = "auto";
    } else {
      m.style.height = "100%";
      m.style.width = "auto";
    }
    return m;
  }

  /* App glyphs are drawn, never fetched: a class per shape, filled with
     ink. Apple's names identify the apps; none of Apple's art is used. */
  function buildAppIcon(app) {
    var i = el("div", "cw-appicon cw-glyph-" + app.glyph);
    i.setAttribute("aria-hidden", "true");
    return i;
  }

  function buildPanel() {
    var panel = el("div", "cw-panel");
    panel.appendChild(el("div", "cw-approw"));
    var fold = el("div", "cw-strip-fold");     /* the thing that opens */
    fold.appendChild(el("div", "cw-strip"));
    panel.appendChild(fold);
    return panel;
  }

  /* The visitor's own time. 9:41 is Apple's keynote clock and a nice
     wink, but this is a live demo rather than a keynote slide, and a
     clock that disagrees with the one two inches above it is exactly the
     kind of detail that quietly says "mock-up". Injectable so a test can
     pin it. */
  function clockText(now) {
    return (now || new Date()).toLocaleTimeString([], {
      hour: "numeric", minute: "2-digit",
    });
  }

  /* The date beside it, as the menu bar shows it: weekday, day, month,
     in the visitor's own locale. */
  function dateText(now) {
    return (now || new Date()).toLocaleDateString([], {
      weekday: "short", day: "numeric", month: "short",
    });
  }

  /* ====================================================================
     THE PROJECTOR

     One window on the desktop plays a film, and the film is the site's
     own: the five pixel flipbooks the hand-drawn hero (the "retro"
     easter egg) runs in its preview strips — the sky, the scrap, the
     cow, the disco man, and the last — played back to back as one clip.
     They stay vector, so they follow the screen's ink and paper into
     night and phosphor.

     The projector is what makes them one clip and one PICTURE: it holds
     the frame, steps it on each reel's own cadence, and paints the same
     frame onto every screen showing the film, so the window and its
     preview tiles are never out of step. That is the point of the film:
     the tile in the switcher shows it playing, which is what Crossway's
     live previews do.

     The reels are read out of the retro template at mount, so the
     figures live in one place. With no template — a page without the
     easter egg, or the test shim — the projector is inert and the
     window is a blank screen, which is still a window.
     ==================================================================== */

  /* The reels' canvas: every one of the five is drawn inside 44 by 23
     units, with a unit of margin around the pixels. */
  var REEL_BOX = "0 0 44 23";
  /* Each reel plays at least this long, in whole loops, before the next
     one: the ten-frame sky at half a second a frame is one loop, the
     four-frame cow at a third of a second is several. */
  var REEL_DWELL = 5;

  function collectReels(template) {
    var content = template && template.content;
    if (!content || !content.querySelectorAll) { return []; }
    var groups = content.querySelectorAll(".movie");
    var reels = [];
    for (var i = 0; i < groups.length; i++) {
      var g = groups[i];
      var frames = g.querySelectorAll(".frame").length;
      var slot = parseFloat((g.style && g.style.getPropertyValue("--slot")) || "") || 0.4;
      if (frames > 0) { reels.push({ frames: frames, slot: slot, node: g }); }
    }
    return reels;
  }

  /* A copy of one reel on its canvas. The frames are renamed so the
     retro hero's own animation rules leave them alone: here the
     projector, not the stylesheet, decides which frame shows. */
  function buildFilm(reel) {
    var NS = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", REEL_BOX);
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    svg.setAttribute("class", "cw-film");
    svg.setAttribute("aria-hidden", "true");
    var g = reel.node.cloneNode(true);
    g.removeAttribute("class");
    g.removeAttribute("style");
    g.removeAttribute("transform");
    var cels = [];
    for (var i = 0; i < g.children.length; i++) {
      g.children[i].setAttribute("class", "cw-cel");
      cels.push(g.children[i]);
    }
    svg.appendChild(g);
    return { node: svg, cels: cels };
  }

  function createProjector(reels, o) {
    o = o || {};
    reels = reels || [];
    var film = o.film || buildFilm;
    var later = o.setTimeout || function (fn, ms) { return setTimeout(fn, ms); };
    var cancel = o.clearTimeout || function (h) { clearTimeout(h); };
    var screens = [];
    var at = 0, frame = 0, loop = 0, handle = null, running = false;

    function loops(reel) {
      return Math.max(1, Math.ceil(REEL_DWELL / (reel.frames * reel.slot)));
    }
    /* A screen that left the document — a rebuilt desktop, a closed
       strip — is forgotten the next time the projector looks. */
    function alive() {
      screens = screens.filter(function (s) { return s.host.isConnected !== false; });
    }
    function paint(s) {
      s.cels.forEach(function (c, i) { c.classList.toggle("is-on", i === frame); });
    }
    function load(s) {
      var reel = reels[at];
      s.host.textContent = "";
      s.cels = [];
      if (!reel) { return; }
      var f = film(reel);
      s.host.appendChild(f.node);
      s.cels = f.cels;
    }
    /* A new screen, showing the frame every other screen shows. */
    function mount() {
      var s = { host: el("div", "cw-reel"), cels: [] };
      load(s);
      paint(s);
      screens.push(s);
      return s.host;
    }
    function step() {
      var reel = reels[at];
      if (!reel) { return; }
      frame += 1;
      if (frame >= reel.frames) {
        frame = 0;
        loop += 1;
        if (loop >= loops(reel)) {
          loop = 0;
          at = (at + 1) % reels.length;
          alive();
          screens.forEach(load);
        }
      }
      alive();
      screens.forEach(paint);
    }
    function schedule() {
      var reel = reels[at];
      if (!running || !reel) { return; }
      handle = later(function () { handle = null; step(); schedule(); }, reel.slot * 1000);
    }
    function start() {
      if (running || !reels.length) { return; }
      running = true;
      schedule();
    }
    function stop() {
      running = false;
      if (handle !== null) { cancel(handle); handle = null; }
    }
    return {
      mount: mount, step: step, start: start, stop: stop, reels: reels,
      get reel() { return at; },
      get frame() { return frame; },
      get running() { return running; },
      get screens() { alive(); return screens.length; },
    };
  }

  function createRenderer(root, o) {
    var projector = (o && o.projector) || null;
    root.classList.add("cw-screen");
    root.textContent = "";

    /* The menu bar names the frontmost app, which is a second, quieter
       signal that a switch happened — useful when the raise itself is
       the only other evidence, as it is in native mode. */
    var menubar = el("div", "cw-menubar");
    /* The app name is a real button, and its menu holds the one item a
       demo of a switcher needs: Quit. Open or closed is view state, like
       the pane, and is rendered from it rather than toggled by hand. */
    var menuApp = el("button", "cw-menu-app");
    menuApp.setAttribute("type", "button");
    menuApp.setAttribute("aria-haspopup", "menu");
    menuApp.setAttribute("aria-expanded", "false");
    menubar.appendChild(menuApp);
    var menu = el("div", "cw-menu");
    menu.setAttribute("role", "menu");
    menu.hidden = true;
    var quitItem = el("button", "cw-menu-quit");
    quitItem.setAttribute("type", "button");
    quitItem.setAttribute("role", "menuitem");
    var quitLabel = el("span", "cw-menu-quit-label");
    quitItem.appendChild(quitLabel);
    quitItem.appendChild(el("span", "cw-menu-key", "\u2318Q"));
    menu.appendChild(quitItem);
    menubar.appendChild(menu);
    ["File", "Edit", "View", "Window", "Help"].forEach(function (m) {
      menubar.appendChild(el("span", "cw-menu-item", m));
    });
    menubar.appendChild(el("span", "cw-menu-spacer"));
    /* Crossway's own menu bar item, beside the clock where a status item
       sits: there while Crossway runs on this screen, gone in Native, as
       a quit menu-bar app's item is. Drawn, like every mark here. */
    var mark = el("span", "cw-menu-mark");
    mark.setAttribute("aria-hidden", "true");
    menubar.appendChild(mark);
    var date = el("span", "cw-menu-date", dateText());
    menubar.appendChild(date);
    var clock = el("span", "cw-menu-clock", clockText());
    menubar.appendChild(clock);

    var desktop = el("div", "cw-desktop");
    var grid = el("div", "cw-grid");
    var panel = buildPanel();
    var approw = panel.children[0];
    var fold = panel.children[1];
    var strip = fold.children[0];
    /* The Dock: the catalogue's apps in the Dock's own order with a dot
       under the running ones, then, past a separator, the minimized
       windows as the tiny pictures macOS keeps there. Chrome under the
       switcher, as on a Mac. */
    var dock = el("div", "cw-dock");
    dock.setAttribute("role", "toolbar");
    dock.setAttribute("aria-label", "Dock");
    var dockApps = el("div", "cw-dock-apps");
    var dockSep = el("i", "cw-dock-sep");
    dockSep.setAttribute("aria-hidden", "true");
    var dockMins = el("div", "cw-dock-mins");
    dock.appendChild(dockApps);
    dock.appendChild(dockSep);
    dock.appendChild(dockMins);
    root.appendChild(menubar);
    root.appendChild(desktop);
    root.appendChild(dock);
    root.appendChild(grid);
    root.appendChild(panel);

    var cache = new Map();
    var appCache = new Map();

    function render(state, view) {
      /* The menu bar names the ACTIVE app, apps[0], the one thing every
         surface reads: an app whose windows are all minimized or closed
         stays active on a Mac, and only an empty desktop names nothing. */
      var active = state.apps.length ? state.apps[0] : null;
      menuApp.textContent = active ? active.name : "";
      /* No app, no menu: there is nothing to quit. */
      var menuOpen = !!(view && view.menuOpen) && !!active;
      menuApp.setAttribute("aria-expanded", menuOpen ? "true" : "false");
      menu.hidden = !menuOpen;
      quitLabel.textContent = active ? "Quit " + active.name : "";
      date.textContent = dateText();
      clock.textContent = clockText();
      mark.hidden = !state.crosswayEnabled;

      /* A minimized window is off the desktop entirely, in the Dock, so
         it is not drawn. */
      var onDesktop = state.windows.filter(function (w) { return !w.minimized; });

      /* Stack by MRU: index 0 is frontmost. Reusing elements keyed by id
         means a raise is one z-index write, not a rebuild. */
      var count = onDesktop.length;
      onDesktop.forEach(function (win, i) {
        var e = cache.get(win.id);
        if (!e) {
          e = buildWindow(win, projector);
          cache.set(win.id, e);
          desktop.appendChild(e);
        }
        placeWindow(e, win);
        e.style.zIndex = String(count - i);
        e.classList.toggle("is-front", i === 0);
        e.classList.toggle("is-zoomed", !!win.zoomed);
      });

      /* Drop anything no longer in the model. Nothing does this today,
         but a renderer that only ever adds is a leak waiting for the
         first feature that removes a window. */
      cache.forEach(function (e, id) {
        if (!onDesktop.some(function (w) { return w.id === id; })) {
          if (e.parentNode) { e.parentNode.removeChild(e); }
          cache.delete(id);
        }
      });

      renderPanel(state, view || {});
      renderGrid(state);
      renderDock(state);
      /* Behind an open switcher the desktop goes soft by the blur the
         bezel sets. The system's own switcher blurs nothing. */
      var switching = state.crosswayEnabled &&
        (state.mode === MODE.APP || state.mode === MODE.WINDOW || state.mode === MODE.GRID);
      root.classList.toggle("is-switching", switching);
    }

    /* Idempotent like the desktop: one button per app, created once and
       thereafter only told whether its app is running; the minimized
       pictures are few and are rebuilt. */
    var dockCache = new Map();
    function renderDock(state) {
      var order = DOCK.filter(function (id) {
        return state.catalogue.some(function (a) { return a.id === id; });
      });
      order.forEach(function (id, i) {
        var app = state.catalogue.find(function (a) { return a.id === id; });
        var b = dockCache.get(id);
        if (!b) {
          b = el("button", "cw-dock-app");
          b.setAttribute("type", "button");
          b.dataset.app = id;
          b.appendChild(buildAppIcon(app));
          /* The Dock wears the badge the row and the grid wear. */
          if (app.badge) {
            var badge = el("span", "cw-dock-badge", String(app.badge));
            badge.setAttribute("aria-hidden", "true");
            b.appendChild(badge);
          }
          var dot = el("i", "cw-dock-dot");
          dot.setAttribute("aria-hidden", "true");
          b.appendChild(dot);
          dockCache.set(id, b);
        }
        if (dockApps.children[i] !== b) { dockApps.appendChild(b); }
        var running = state.apps.some(function (a) { return a.id === id; });
        b.classList.toggle("is-running", running);
        b.setAttribute("aria-label", running ? app.name : app.name + ", not running");
      });
      var mins = state.windows.filter(function (w) { return w.minimized; });
      dockSep.hidden = !mins.length;
      dockMins.textContent = "";
      mins.forEach(function (w) {
        var b = el("button", "cw-dock-min");
        b.setAttribute("type", "button");
        b.dataset.win = w.id;
        b.setAttribute("aria-label", "Restore " + w.title);
        b.appendChild(buildMini(w, { tag: false }, projector));
        dockMins.appendChild(b);
      });
    }

    /* The exposé. A FLAT list frozen when the session opened, so the
       tiles cannot reshuffle under the visitor as the MRU changes — the
       index the reducer carries points into that snapshot, not into the
       live order. Every tile wears its app's glyph, because a grid of
       windows with no app cue is where an exposé stops being readable. */
    function renderGrid(state) {
      var on = state.mode === MODE.GRID;
      grid.classList.toggle("is-open", on);
      if (!on) { grid.textContent = ""; return; }

      grid.textContent = "";
      /* Fill to six, then wrap. A short last row is left-aligned, which
         explicit columns give for free — auto-fit would centre it. */
      var cols = Math.min(state.gridWindows.length, GRID_COLUMNS) || 1;
      grid.style.gridTemplateColumns = "repeat(" + cols + ", var(--cw-tile-w))";

      state.gridWindows.forEach(function (w, i) {
        var app = state.apps.find(function (a) { return a.id === w.app; });
        var cell = el("div", "cw-gcell");
        cell.dataset.win = w.id;
        if (i === state.gridIndex) { cell.classList.add("is-sel"); }

        var shot = el("div", "cw-gshot");
        shot.appendChild(buildMini(w, null, projector));
        /* Bottom-LEFT of the thumbnail, inset, riding on top of the
           picture — where the app puts it, and the only thing on this
           surface that says which app a window belongs to. With the
           focused-app grid that makes every tile carry the same mark;
           with the all-windows grid it makes them visibly mixed. */
        if (app) {
          var mark = el("div", "cw-gbadge");
          mark.appendChild(buildAppIcon(app));
          if (app.badge) {
            mark.appendChild(el("span", "cw-gdot", String(app.badge)));
          }
          shot.appendChild(mark);
        }
        cell.appendChild(shot);
        cell.appendChild(el("span", "cw-gtitle", w.title));
        grid.appendChild(cell);
      });
    }

    /* The panel. Two independent visibilities, which is the whole of the
       timing the user signed off:

         the ROW appears the instant a session opens, and
         the STRIP folds away on every advance and drops back only once
         the selection has rested for PREVIEW_DELAY.

       Window mode is the exception the app itself makes: cmd-backtick
       shows its strip in one frame, because the strip IS the point of
       that command rather than a bloom on top of it. */
    function renderPanel(state, view) {
      var open = state.mode === MODE.APP || state.mode === MODE.WINDOW;
      panel.classList.toggle("is-open", open);
      panel.classList.toggle("is-native", !state.crosswayEnabled);
      if (!open) {
        fold.classList.remove("is-dropped");
        return;
      }

      /* App row, in MRU order, selection ringed. */
      state.apps.forEach(function (app, i) {
        var e = appCache.get(app.id);
        if (!e) {
          e = el("div", "cw-app");
          e.dataset.app = app.id;
          e.appendChild(buildAppIcon(app));
          /* Badged apps wear their Dock count whether or not they are
             selected, exactly as in the row (AppIconView.swift:455 — the
             badge layer sits above everything at zPosition 1000). */
          if (app.badge) {
            e.appendChild(el("span", "cw-abadge", String(app.badge)));
          }
          e.appendChild(el("span", "cw-app-name", app.name));
          appCache.set(app.id, e);
        }
        if (approw.children[i] !== e) { approw.appendChild(e); }
        e.classList.toggle("is-sel", i === state.appIndex);
      });
      /* An app that has quit leaves the row, cell and cache both: the
         loop above only adds and reorders, and a quit Terminal stayed in
         the row wearing its old selection. */
      appCache.forEach(function (e, id) {
        if (!state.apps.some(function (a) { return a.id === id; })) {
          if (e.parentNode) { e.parentNode.removeChild(e); }
          appCache.delete(id);
        }
      });

      /* The strip belongs to the highlighted app. Native mode never gets
         one at all — that absence is the comparison. */
      var wins = state.crosswayEnabled
        ? windowsForApp(state, state.apps[state.appIndex].id)
        : [];
      /* Reserve the widest strip any app in this session can produce, so
         the pane is one fixed size for the whole session and the app row
         never moves under the pointer as you tab. Cleared when there is
         no strip at all, which is what native mode looks like. */
      var widest = 0;
      if (state.crosswayEnabled) {
        state.apps.forEach(function (a) {
          var n = windowsForApp(state, a.id).length;
          if (n > widest) { widest = n; }
        });
      }
      strip.style.minWidth = widest
        ? "calc(" + widest + " * var(--cw-strip-w) + " +
          (widest - 1) + " * var(--cw-strip-gap))"
        : "";

      strip.textContent = "";
      wins.forEach(function (w, i) {
        var tile = el("div", "cw-tile");
        tile.appendChild(buildMini(w, null, projector));
        var cap = el("span", "cw-tile-title", w.title);
        var wrap = el("div", "cw-tile-wrap");
        wrap.dataset.win = w.id;
        wrap.appendChild(tile);
        wrap.appendChild(cap);
        if (state.mode === MODE.WINDOW && i === state.windowIndex) {
          wrap.classList.add("is-sel");
        }
        strip.appendChild(wrap);
      });

      var dropped = wins.length > 0 &&
        (state.mode === MODE.WINDOW || !!view.paneOpen);
      fold.classList.toggle("is-dropped", dropped);
    }

    return {
      render: render, desktop: desktop, menubar: menubar, clock: clock, date: date, mark: mark, screen: root,
      dock: dock,
      /* The switcher's surfaces, for the mouse. */
      panel: panel, approw: approw, strip: strip, grid: grid,
      /* The menu's parts, for the wiring. */
      menu: { button: menuApp, panel: menu, quit: quitItem },
    };
  }

  /* ====================================================================
     A FEW MEASUREMENTS THE RENDERER SHARES WITH THE STYLESHEET
     ==================================================================== */

  /* A thumbnail slot is landscape, like the windows it holds
     (WindowPreviewCell.swift:24-25 — 180 x 112). The fixtures' w/h are
     percentages of the DESKTOP, so a window's real aspect is its
     percentage ratio times the desktop's own: the 8:5 screen less the
     menu bar and the Dock's band (--cw-dock-band, 10.4cqw) is about 2.
     Without that factor a 50%x50% window would come out square when it
     is actually wide. */
  var TILE_ASPECT = 16 / 10;
  var DESKTOP_ASPECT = 2.0;

  /* The exposé fills each row to SIX tiles before starting another, and a
     short last row stays left-aligned rather than balancing itself —
     eight windows is 6 + 2, never 4 + 4 (ExposeGridView.swift:50-71). */
  var GRID_COLUMNS = 6;

  /* How long a tapped cap stays struck. Long enough to see, short enough
     to keep up with a burst. */
  var STRIKE_MS = 240;

  /* ====================================================================
     THE SCHEDULER

     The only place in this file that knows about time, and it owns
     exactly one timer. The rule it implements is the one signed off for
     the hero:

       the app row appears the INSTANT a session opens — no show-delay
       gate, because a click is 80-120ms and would straddle the real
       100ms, showing or hiding chrome unpredictably on identical
       gestures; and

       the preview strip folds away on EVERY advance and drops back only
       once the selection has rested for PREVIEW_DELAY.

     Advancing therefore restarts the clock, which is what makes a fast
     walk through the row stay calm instead of strobing panes open and
     shut. Window mode is exempt: cmd-backtick shows its strip at once,
     because there the strip is the command rather than a bloom on it.
     ==================================================================== */
  function createController(opts) {
    var stage = createStage(opts.fixtures);
    var renderer = createRenderer(opts.root, { projector: opts.projector || null });
    var paneOpen = false;
    var menuOpen = false;
    var timer = null;
    var status = opts.status || null;
    var spoken = "";
    var lastCommit = null;

    function draw() { renderer.render(stage.state, { paneOpen: paneOpen, menuOpen: menuOpen }); }

    function foldNow() {
      paneOpen = false;
      if (timer !== null) { clearTimeout(timer); timer = null; }
    }

    function armDrop() {
      foldNow();
      timer = setTimeout(function () {
        timer = null;
        paneOpen = true;
        draw();
      }, PREVIEW_DELAY);
    }

    /* One place decides what the timing should be after any input, so
       the rule cannot drift apart across the five entry points. */
    function settle(before) {
      var m = stage.state.mode;
      if (m === MODE.APP) {
        /* Re-arm on entering the row AND on every advance within it. */
        armDrop();
      } else {
        foldNow();
      }
      draw();
      announce();
      return before;
    }

    /* Only speak when the sentence actually changes: an advance per
       keystroke would otherwise bury the listener in near-identical
       announcements. */
    function announce() {
      var line = describeState(stage.state, lastCommit);
      if (line === spoken) { return; }
      spoken = line;
      if (status) { status.textContent = line; }
    }

    function release() {
      var app = stage.selectedApp();
      var win = stage.selectedWindow();
      lastCommit = app ? { committedApp: app.name, committedWindow: win ? win.title : null } : null;
      stage.release();
      return settle();
    }

    /* A click on the desktop while the switcher is up is a click-away,
       as on a Mac: the session is abandoned, nothing is committed, and
       the window clicked comes forward on its own account. At rest the
       desktop's verbs are just the desktop's verbs. */
    function leave() {
      if (stage.state.mode === MODE.IDLE) { return false; }
      lastCommit = null;
      stage.escape();
      return true;
    }
    function after(left) { if (left) { settle(); } else { draw(); } return left; }

    return {
      get state() { return stage.state; },
      _spoken: function () { return spoken; },
      press: function (chord, o) { stage.press(chord, o); return settle(); },
      advance: function (o) { stage.advance(o); return settle(); },
      escape: function () { lastCommit = null; stage.escape(); return settle(); },
      release: release,
      /* The mouse on the switcher's own surfaces: a hover re-selects,
         with the same fold-and-bloom an advance gets, and a pick selects
         and commits, exactly as letting go of the modifier would. */
      hoverApp: function (i) { stage.selectApp(i); return settle(); },
      hoverWindow: function (i) { stage.selectWindow(i); return settle(); },
      hoverGrid: function (i) { stage.selectGrid(i); return settle(); },
      pickApp: function (i) { stage.selectApp(i); return release(); },
      pickWindow: function (i) { stage.selectWindow(i); return release(); },
      pickGrid: function (i) { stage.selectGrid(i); return release(); },
      /* A click-away with nothing under it: the wallpaper. True when
         there was a session to abandon. */
      dismiss: function () { return after(leave()); },
      setCrosswayEnabled: function (on) { stage.setCrosswayEnabled(on); return settle(); },
      setIncludeMinimized: function (on) { stage.setIncludeMinimized(on); return settle(); },
      raiseWindow: function (id) { var left = leave(); stage.raiseWindow(id); return after(left); },
      closeWindow: function (id) { var left = leave(); stage.closeWindow(id); return after(left); },
      minimizeWindow: function (id) { var left = leave(); stage.minimizeWindow(id); return after(left); },
      zoomWindow: function (id) { var left = leave(); stage.zoomWindow(id); return after(left); },
      moveWindow: function (id, x, y) { stage.moveWindow(id, x, y); draw(); },
      resizeWindow: function (id, frame, from) { stage.resizeWindow(id, frame, from); draw(); },
      /* Through settle, not draw: a quit abandons the session, so the
         pane folds and the live region goes quiet with it. The menu the
         quit came from closes with it. */
      quitApp: function (id) { menuOpen = false; lastCommit = null; stage.quitApp(id); return settle(); },
      /* The Dock's verbs abandon a session the same way, so they settle. */
      launchApp: function (id) { menuOpen = false; lastCommit = null; stage.launchApp(id); return settle(); },
      activateApp: function (id) { menuOpen = false; lastCommit = null; stage.activateApp(id); return settle(); },
      restoreWindow: function (id) { menuOpen = false; lastCommit = null; stage.restoreWindow(id); return settle(); },
      /* The app menu: open, closed, or flipped. View state, like the pane. */
      setMenuOpen: function (on) { menuOpen = !!on && stage.state.apps.length > 0; draw(); },
      _menuOpen: function () { return menuOpen; },
      /* Test seam: the pane's visibility is timing, not switcher state,
         so it is not on `state` and needs its own window. */
      _paneOpen: function () { return paneOpen; },
      _pending: function () { return timer !== null; },
      draw: draw,
      stage: stage,
      renderer: renderer,
    };
  }

  /* ====================================================================
     THE KEYS

     macOS reserves these chords at the OS level, so pressing them for
     real would switch the visitor's own apps rather than the demo's. So
     the keys the visitor presses ARE the keyboard: four caps beside the
     screen. The two modifiers LATCH — a click holds ⌘ or ⌥ down, a
     second click lets it go, and letting go is what commits, exactly as
     releasing the real key does. The two keys TAP: every click is one
     more tap of Tab or backtick, because that is the part of the gesture
     that moves the selection, and a visitor needs to do it repeatedly to
     see the switcher walk. A held modifier plus a tapped key is one
     press of that chord, and the reducer already knows whether that
     opens, advances or descends, so this hands the chord straight over
     rather than deciding for it.

     Only one modifier is ever held. Holding the other lets the first go
     first, so the new chord starts from rest.

     Without Crossway the ⌥ cap is unavailable: aria-disabled rather than
     the disabled attribute, deliberately, so it stays focusable; greyed
     rather than hidden, because a key you cannot have is the pitch. The
     legend's rows follow the same rule, light the chord in effect, and
     say what the chord does in whichever world is on the screen.
     ==================================================================== */
  function wireKeys(rail, controller) {
    var noop = function () {};
    if (!rail) {
      return { hold: noop, tap: noop, clear: noop, sync: noop, _held: function () { return null; } };
    }
    var keys = {};
    Array.prototype.forEach.call(rail.querySelectorAll("[data-key]"), function (b) {
      keys[b.getAttribute("data-key")] = b;
    });
    var rows = Array.prototype.slice.call(rail.querySelectorAll("[data-chord]"));
    var held = null;      /* "cmd", "opt", or null: the modifier being held */
    var last = null;      /* the chord the last tap made, for the legend */
    var strikes = {};

    function native() { return !controller.state.crosswayEnabled; }
    function cls(el, name, on) { if (el && el.classList) { el.classList.toggle(name, on); } }
    function attr(el, name) { return el && el.getAttribute ? el.getAttribute(name) : null; }

    function sync() {
      ["cmd", "opt"].forEach(function (m) {
        var k = keys[m];
        if (!k) { return; }
        var on = held === m;
        k.setAttribute("aria-pressed", on ? "true" : "false");
        cls(k, "is-held", on);
      });
      if (keys.opt) {
        keys.opt.setAttribute("aria-disabled", native() ? "true" : "false");
      }
      rows.forEach(function (r) {
        var chord = attr(r, "data-chord");
        /* Without Crossway, cmd-backtick leaves no session open — the
           raise is the whole event — so the row stays lit on the last tap
           rather than on an open mode. */
        var off = native() && attr(r, "data-crossway-only") === "1";
        cls(r, "is-active", chord === last && (controller.state.mode !== MODE.IDLE || native()));
        /* With a modifier held, both of its chords are there to tap, and
           the legend says so; the tapped one stays pressed on top. */
        cls(r, "is-ready", held !== null && !off && chord.indexOf(held + "-") === 0);
        cls(r, "is-off", off);
        var what = r.querySelector ? r.querySelector(".cw-legend-what") : null;
        var alt = attr(r, "data-what-native");
        if (what && alt) { what.textContent = native() ? alt : attr(r, "data-what"); }
      });
    }

    /* A tapped cap goes down for a beat and comes back up, which is the
       only feedback that a second tap of the same key did anything. */
    function strike(b) {
      if (!b || !b.classList) { return; }
      var k = attr(b, "data-key");
      if (strikes[k]) { clearTimeout(strikes[k]); }
      b.classList.add("is-struck");
      strikes[k] = setTimeout(function () {
        strikes[k] = null;
        b.classList.remove("is-struck");
      }, STRIKE_MS);
    }

    /* Click a modifier to hold it; click it again to let go, which is
       what commits. Holding the other modifier lets this one go first. */
    function hold(m) {
      if (m === "opt" && native()) { return; }
      if (held === m) {
        held = null; last = null;
        controller.release();
      } else {
        if (held !== null) { controller.release(); }
        held = m; last = null;
      }
      sync();
    }

    /* Tap a key: one more press of the held modifier's chord. With no
       modifier held there is no chord, and only the cap moves. */
    function tap(k, e) {
      strike(keys[k]);
      if (held === null) { return; }
      var chord = held + "-" + k;
      controller.press(chord, { shift: !!(e && e.shiftKey) });
      last = chord;
      sync();
    }

    /* click, not pointerdown: it carries Enter and Space for free, so the
       keyboard path needs no second implementation. */
    if (keys.cmd) { keys.cmd.addEventListener("click", function () { hold("cmd"); }); }
    if (keys.opt) { keys.opt.addEventListener("click", function () { hold("opt"); }); }
    if (keys.tab) { keys.tab.addEventListener("click", function (e) { tap("tab", e); }); }
    if (keys.tick) { keys.tick.addEventListener("click", function (e) { tap("tick", e); }); }
    sync();

    return {
      hold: hold,
      tap: tap,
      /* For the comparison switch, which ABANDONS the session in the
         reducer first: with nothing open the release here commits nothing
         and only drops the latch. */
      clear: function () {
        /* Only a session still open is committed; when the reducer has
           already ended it — a switch flip, a Dock click, a pick with
           the mouse — this just drops the latch. */
        if (held !== null && controller.state.mode !== MODE.IDLE) { controller.release(); }
        held = null; last = null;
        sync();
      },
      sync: sync,
      _held: function () { return held; },
    };
  }

  /* The desktop, driven by the mouse. Clicking raises, the title bar
     drags, and the three lights close, minimize and zoom. Every one of
     them goes through the reducer, so what the switcher lists and what
     is on screen cannot drift apart.

     Drag maths is in PERCENT, because that is what the model stores and
     what keeps a window in the same relative place when the machine is
     resized. */
  /* How far inside a window's edge still counts as the edge, in the
     screen's own pixels: a resize grip you can hit without aiming. */
  var GRIP = 8;

  /* Which edges of a window a point is on: "l", "r", "t", "b", the
     corners as two letters ("tl", "br"), or "" for the inside. */
  function edgeAt(rect, x, y) {
    if (!rect || !rect.width) { return ""; }
    var v = y - rect.top <= GRIP ? "t" : rect.bottom - y <= GRIP ? "b" : "";
    var h = x - rect.left <= GRIP ? "l" : rect.right - x <= GRIP ? "r" : "";
    return v + h;
  }

  function wireDesktop(desktop, controller, onAct) {
    if (!desktop || typeof document === "undefined") { return { _drag: null }; }
    var drag = null;
    /* Whether a press landed while the switcher was up: then it was a
       click-away, and whoever holds the keys is told to let go. */
    function away(fn) {
      var open = controller.state.mode !== MODE.IDLE;
      fn();
      if (open && onAct) { onAct(); }
    }

    function within(node, cls) {
      while (node && node !== desktop) {
        if (node.classList && node.classList.contains(cls)) { return node; }
        node = node.parentNode;
      }
      return null;
    }

    desktop.addEventListener("pointerdown", function (e) {
      var win = within(e.target, "cw-win");
      if (!win) {
        /* The wallpaper: with the switcher up, a click-away. */
        away(function () { controller.dismiss(); });
        return;
      }
      var id = win.dataset.win;

      var light = within(e.target, "cw-light");
      if (light) {
        /* A light is not a drag handle and not a raise. */
        if (e.preventDefault) { e.preventDefault(); }
        if (e.stopPropagation) { e.stopPropagation(); }
        away(function () {
          if (light.classList.contains("cw-light-close")) { controller.closeWindow(id); }
          else if (light.classList.contains("cw-light-min")) { controller.minimizeWindow(id); }
          else { controller.zoomWindow(id); }
        });
        return;
      }

      away(function () { controller.raiseWindow(id); });

      var w = controller.state.windows.filter(function (x) { return x.id === id; })[0];
      if (!w || w.zoomed) { return; }
      var box = desktop.getBoundingClientRect();
      if (!box.width || !box.height) { return; }

      /* On an edge or a corner: a resize. The pointer pulls that edge;
         the reducer keeps the window a window and on the screen. */
      var edge = win.getBoundingClientRect ? edgeAt(win.getBoundingClientRect(), e.clientX, e.clientY) : "";
      if (edge) {
        drag = { id: id, w: box.width, h: box.height, edge: edge,
                 px: e.clientX, py: e.clientY, ox: w.x, oy: w.y, ow: w.w, oh: w.h };
      } else {
        if (!within(e.target, "cw-win-bar")) { return; }
        drag = { id: id, w: box.width, h: box.height,
                 px: e.clientX, py: e.clientY, ox: w.x, oy: w.y };
      }
      if (desktop.setPointerCapture) { desktop.setPointerCapture(e.pointerId); }
      if (e.preventDefault) { e.preventDefault(); }
    });

    desktop.addEventListener("pointermove", function (e) {
      if (!drag) {
        /* At rest, the cursor says what a press here would do: the
           window under the pointer wears the edge it is on. */
        var over = within(e.target, "cw-win");
        if (over && over.getBoundingClientRect && over.dataset) {
          over.dataset.edge = edgeAt(over.getBoundingClientRect(), e.clientX, e.clientY);
        }
        return;
      }
      var dx = ((e.clientX - drag.px) / drag.w) * 100;
      var dy = ((e.clientY - drag.py) / drag.h) * 100;
      if (!drag.edge) {
        controller.moveWindow(drag.id, drag.ox + dx, drag.oy + dy);
        return;
      }
      var frame = { x: drag.ox, y: drag.oy, w: drag.ow, h: drag.oh };
      var from = {};
      if (drag.edge.indexOf("l") >= 0) { frame.x += dx; frame.w -= dx; from.l = true; }
      if (drag.edge.indexOf("r") >= 0) { frame.w += dx; }
      if (drag.edge.indexOf("t") >= 0) { frame.y += dy; frame.h -= dy; from.t = true; }
      if (drag.edge.indexOf("b") >= 0) { frame.h += dy; }
      controller.resizeWindow(drag.id, frame, from);
    });

    var end = function (e) {
      if (!drag) { return; }
      if (desktop.releasePointerCapture && e && e.pointerId !== undefined) {
        try { desktop.releasePointerCapture(e.pointerId); } catch (err) { /* gone */ }
      }
      drag = null;
    };
    desktop.addEventListener("pointerup", end);
    desktop.addEventListener("pointercancel", end);

    return {
      _dragging: function () { return drag && drag.id; },
      _resizing: function () { return drag && drag.edge ? drag.edge : null; },
    };
  }

  /* The switcher's own surfaces, driven by the mouse: the app row, the
     window strip and the exposé grid. Hovering a cell re-selects it and
     clicking one activates it, as the app allows, under the app's own
     rule: the device that last physically acted owns the selection. A
     pane that opens or moves under a parked cursor makes the browser
     report a hover the visitor never made, so a hover counts only when
     the pointer's position actually changed since it was last seen
     anywhere on the screen. Clicks are always deliberate and always
     win, and a pick tells whoever holds the keys to let go. */
  function wirePane(parts, controller, onAct) {
    var screen = parts && parts.screen, panel = parts && parts.panel, grid = parts && parts.grid;
    if (!panel && !grid) { return { _wired: false }; }
    var lastX = null, lastY = null;

    function cellOf(node, root) {
      while (node && node !== root) {
        var c = node.classList, d = node.dataset || {};
        if (c && c.contains("cw-app") && d.app) { return { kind: "app", id: d.app }; }
        if (c && c.contains("cw-tile-wrap") && d.win) { return { kind: "strip", id: d.win }; }
        if (c && c.contains("cw-gcell") && d.win) { return { kind: "grid", id: d.win }; }
        node = node.parentNode;
      }
      return null;
    }
    function indexOf(cell) {
      var st = controller.state;
      if (cell.kind === "app") {
        return st.apps.findIndex(function (a) { return a.id === cell.id; });
      }
      if (cell.kind === "strip") {
        var app = st.apps[st.appIndex];
        if (!app) { return -1; }
        return controller.stage.windowsForApp(app.id).findIndex(function (w) { return w.id === cell.id; });
      }
      return st.gridWindows.findIndex(function (w) { return w.id === cell.id; });
    }
    function hover(cell) {
      var i = indexOf(cell);
      if (i < 0) { return; }
      if (cell.kind === "app") { controller.hoverApp(i); }
      else if (cell.kind === "strip") { controller.hoverWindow(i); }
      else { controller.hoverGrid(i); }
    }
    function pick(cell) {
      var i = indexOf(cell);
      if (i < 0) { return; }
      if (cell.kind === "app") { controller.pickApp(i); }
      else if (cell.kind === "strip") { controller.pickWindow(i); }
      else { controller.pickGrid(i); }
      if (onAct) { onAct(); }
    }
    /* The position gate, over the whole screen: where the pointer was
       last seen is what a hover has to differ from. */
    function moved(e) {
      var x = e.clientX, y = e.clientY;
      if (x === lastX && y === lastY) { return false; }
      lastX = x; lastY = y;
      return true;
    }
    var track = screen || panel || grid;
    track.addEventListener("pointermove", function (e) {
      if (!moved(e)) { return; }
      var cell = cellOf(e.target, track);
      if (cell) { hover(cell); }
    });
    [panel, grid].forEach(function (root) {
      if (!root) { return; }
      root.addEventListener("click", function (e) {
        var cell = cellOf(e.target, root);
        if (cell) { pick(cell); }
      });
    });
    return { _wired: true, _last: function () { return [lastX, lastY]; } };
  }

  /* The menu bar's app menu. Click the app's name to open it, click its
     one item to quit the app, click anywhere else or press Escape to
     close it and quit nothing. `onQuit` lets the keypad drop its latch,
     since a quit abandons whatever session the keys were holding. */
  function wireMenubar(parts, controller, onQuit) {
    if (!parts || !parts.button) { return { _open: function () { return false; } }; }
    var stop = function (e) { if (e && e.stopPropagation) { e.stopPropagation(); } };
    parts.button.addEventListener("click", function (e) {
      stop(e);
      controller.setMenuOpen(!controller._menuOpen());
    });
    parts.quit.addEventListener("click", function (e) {
      stop(e);
      var active = controller.state.apps[0];
      if (!active) { return; }
      controller.quitApp(active.id);
      if (onQuit) { onQuit(active.id); }
    });
    /* A click anywhere on the screen that is not the menu closes it;
       the two listeners above stop their own clicks from getting here. */
    if (parts.screen) {
      parts.screen.addEventListener("click", function () {
        if (controller._menuOpen()) { controller.setMenuOpen(false); }
      });
    }
    var esc = function (e) {
      if (e && e.key === "Escape" && controller._menuOpen()) { controller.setMenuOpen(false); }
    };
    parts.button.addEventListener("keydown", esc);
    parts.quit.addEventListener("keydown", esc);
    return { _open: function () { return controller._menuOpen(); } };
  }

  /* The Dock, driven by the mouse: an app's icon launches it if it has
     quit and activates it if it is running (one click, one meaning, as
     on a Mac); a minimized window's picture restores it. One listener on
     the Dock, since its buttons come and go. `onAct` lets the keypad
     drop its latch: every one of these abandons the session. */
  function wireDock(dock, controller, onAct) {
    if (!dock) { return { _wired: false }; }
    dock.addEventListener("click", function (e) {
      var node = e && e.target;
      while (node && node !== dock) {
        var d = node.dataset || {};
        if (d.app) { controller.launchApp(d.app); if (onAct) { onAct(); } return; }
        if (d.win) { controller.restoreWindow(d.win); if (onAct) { onAct(); } return; }
        node = node.parentNode;
      }
    });
    return { _wired: true };
  }

  /* Blur behind the switcher, as the app has it. Four steps, because a
     continuous slider on a demo is a fiddle rather than a setting. */
  var BLUR_STEPS = ["0px", "8px", "18px", "30px"];
  var BLUR_NAMES = ["None", "Light", "Medium", "Heavy"];

  /* Options are not chords: they change what the switcher may REACH, or
     how it looks, rather than driving it. One handler for all of them,
     keyed by data-option, so a third option needs no new wiring. */
  function wireOptions(root, controller, screen, onAct) {
    if (!root) { return { sync: function () {} }; }
    var boxes = Array.prototype.slice.call(root.querySelectorAll("[data-option]"));
    var box = root.querySelector ? root.querySelector(".cw-settings") : null;

    function applyBlur(value) {
      var i = Math.max(0, Math.min(BLUR_STEPS.length - 1, Number(value) || 0));
      if (screen && screen.style) { screen.style.setProperty("--cw-blur", BLUR_STEPS[i]); }
      var out = root.querySelector ? root.querySelector("#cw-blur-now") : null;
      if (out) { out.textContent = BLUR_NAMES[i]; }
      /* The scale printed over the wheel marks the word the cap is under. */
      var wheel = root.querySelector ? root.querySelector(".cw-slider") : null;
      if (wheel && wheel.setAttribute) { wheel.setAttribute("data-blur", String(i)); }
      return i;
    }

    function sync() {
      /* Without Crossway there is nothing here to set: the system cannot
         reach a minimized window at all, and its switcher's blur is not
         ours. Shown but not offered, as the exposé buttons are. */
      var native = !controller.state.crosswayEnabled;
      boxes.forEach(function (b) { b.disabled = native; });
      if (box && box.classList) { box.classList.toggle("is-disabled", native); }
    }

    boxes.forEach(function (b) {
      var what = b.getAttribute("data-option");
      var handler = function () {
        if (what === "include-minimized") {
          /* The reducer abandons any session here; whoever holds the
             keys is told to let go, as after every other verb that
             ends one. */
          controller.setIncludeMinimized(b.checked);
          if (onAct) { onAct(); }
        }
        else if (what === "blur") { applyBlur(b.value); }
      };
      b.addEventListener("change", handler);
      /* A slider should follow the thumb, not wait for it to be let go. */
      if (what === "blur") { b.addEventListener("input", handler); applyBlur(b.value); }
    });

    sync();
    return { sync: sync, boxes: boxes, _blur: applyBlur };
  }

  /* ====================================================================
     THE COMPARISON SWITCH

     Two radios rather than a checkbox or a switch, because neither side
     is "off" — the visitor is choosing which of two worlds to look at.
     role=switch would announce one of them as unchecked, which is wrong
     about what this control means.

     Arrow keys move between the cells, as a radiogroup should.
     ==================================================================== */
  function wireToggle(container, controller, onChange) {
    if (!container) { return { set: function () {} }; }
    var cells = Array.prototype.slice.call(container.querySelectorAll("[data-mode]"));

    function set(mode) {
      var crossway = mode !== "native";
      cells.forEach(function (cell) {
        var on = (cell.getAttribute("data-mode") === mode);
        cell.setAttribute("aria-checked", on ? "true" : "false");
        /* Roving tabindex: a radiogroup is one tab stop, not two. */
        cell.setAttribute("tabindex", on ? "0" : "-1");
      });
      controller.setCrosswayEnabled(crossway);
      if (onChange) { onChange(crossway); }
    }

    /* One tab stop from the start, not from the first click: the roving
       tabindex follows whichever cell the markup ships checked. */
    cells.forEach(function (cell) {
      cell.setAttribute("tabindex", cell.getAttribute("aria-checked") === "true" ? "0" : "-1");
    });

    /* A click ANYWHERE on the control flips it: on the other half it
       chooses that side, on the checked half, a label or the knob it
       flips to the other. A slide switch is thrown, not aimed. */
    function checked() {
      var on = cells.find(function (cell) { return cell.getAttribute("aria-checked") === "true"; });
      return on ? on.getAttribute("data-mode") : "crossway";
    }
    function flip(e) {
      var node = e && e.target, mode = null;
      while (node && node !== container) {
        if (node.getAttribute && node.getAttribute("data-mode")) { mode = node.getAttribute("data-mode"); break; }
        node = node.parentNode;
      }
      var now = checked();
      if (!mode || mode === now) { mode = now === "native" ? "crossway" : "native"; }
      set(mode);
    }
    if (container.addEventListener) { container.addEventListener("click", flip); }

    cells.forEach(function (cell, i) {
      cell.addEventListener("keydown", function (e) {
        var back = (e.key === "ArrowLeft" || e.key === "ArrowUp");
        var fwd = (e.key === "ArrowRight" || e.key === "ArrowDown");
        if (!back && !fwd) { return; }
        e.preventDefault();
        var next = cells[(i + (fwd ? 1 : cells.length - 1)) % cells.length];
        set(next.getAttribute("data-mode"));
        if (next.focus) { next.focus(); }
      });
    });

    return { set: set, cells: cells, flip: flip };
  }

  /* ====================================================================
     THE AUTOMATIC DEMO

     Left alone, the demo demonstrates itself: an autopilot drives the
     same keypad a visitor clicks, at a visitor's pace (a little uneven,
     as a hand is), through nine scenes that use all four chords. It
     opens on the film: ⌘Tab along the row to QuickTime, its tile seen
     playing, and letting go brings the mostly hidden window forward.
     Then ⌘` brings ONE Terminal window forward and leaves the others as
     they were, ⌥` walks Terminal's own windows, ⌥Tab walks everything
     to a Safari window, and so on. Each commit moves one window and its app to the
     front of the MRU, and the LAST FIVE are ordered so the desktop ends
     EXACTLY where it started: the loop ends in the state it began in and
     runs again from there, with no reset and no jump. Only windows of
     Safari, QuickTime and Terminal are ever committed, so nothing else
     can drift.

     Targets are named, not counted: a tap is repeated until the named
     app or window is selected, so a scene still lands if the visitor
     left the desktop rearranged.

     macOS Native has its own nine (DEMO_SCENES_NATIVE, below): the
     system has no ⌥ chords and no strip to read, so those scenes are
     ⌘ alone and their targets name the window left IN FRONT rather
     than a selection. The switch chooses which loop runs, and flipping
     it between scenes starts the other from ITS first scene, since a
     loop only closes when it runs whole. The autopilot waits while the
     demo is scrolled away or the tab is hidden. The visitor's first
     real click on the keys, the screen or the switch turns the
     automatic demo off; the box over the keys turns it back on.
     ==================================================================== */
  var DEMO_SCENES = [
    /* ⌘Tab along the row to the film: its tile is seen playing, and
       letting go brings the mostly hidden window forward. */
    { hold: "cmd", taps: [{ key: "tab", app: "quicktime" }] },
    /* ⌘Tab, ⌘`: ONE Terminal window forward, the others left as they
       were. */
    { hold: "cmd", taps: [{ key: "tab", app: "terminal" }, { key: "tick", win: "tm2" }] },
    /* ⌥`: the focused app's windows, Terminal's, to its other one. */
    { hold: "opt", taps: [{ key: "tick", win: "tm1" }] },
    /* ⌥Tab: every window, a few along, to a Safari window. */
    { hold: "opt", taps: [{ key: "tab", win: "sa2" }] },
    /* And the five that close the loop, in the one order that does:
       the stack's first five, deepest first. */
    { hold: "opt", taps: [{ key: "tab", win: "qt1" }] },
    { hold: "cmd", taps: [{ key: "tab", app: "terminal" }, { key: "tick", win: "tm2" }] },
    { hold: "cmd", taps: [{ key: "tab", app: "safari" }, { key: "tick", win: "sa2" }] },
    { hold: "cmd", taps: [{ key: "tab", app: "terminal" }, { key: "tick", win: "tm1" }] },
    { hold: "cmd", taps: [{ key: "tab", app: "safari" }, { key: "tick", win: "sa1" }] },
  ];
  /* The same demo without Crossway, in what the system has: Command-Tab
     lands on an app's front window, and Command-backtick raises the
     front app's next window at once, with no session to read, so those
     targets name the window that must be IN FRONT afterwards.

     Nine scenes that close the loop, checked by walking them: the raises
     are tm1, tm2, qt1, tm2, tm1, sa1, sa2, sa1, tm1, sa1, and the five
     that survive to the top of the stack are the opening stack's first
     five, deepest first (qt1, tm2, sa2, tm1, sa1) — spread over scenes
     3, 4, 7 and 8/9 rather than gathered in the last five as the
     Crossway list's are, because ⌘` here raises at once and a scene can
     carry two. Every raise is a Safari, QuickTime or Terminal window,
     so nothing else can drift. */
  var DEMO_SCENES_NATIVE = [
    { hold: "cmd", taps: [{ key: "tab", app: "terminal" }] },
    { hold: "cmd", taps: [{ key: "tick", front: "tm2" }] },
    { hold: "cmd", taps: [{ key: "tab", app: "quicktime" }] },
    { hold: "cmd", taps: [{ key: "tab", app: "terminal" }] },
    { hold: "cmd", taps: [{ key: "tick", front: "tm1" }] },
    { hold: "cmd", taps: [{ key: "tab", app: "safari" }] },
    { hold: "cmd", taps: [{ key: "tick", front: "sa2" }, { key: "tick", front: "sa1" }] },
    { hold: "cmd", taps: [{ key: "tab", app: "terminal" }] },
    { hold: "cmd", taps: [{ key: "tab", app: "safari" }] },
  ];
  /* A visitor's pace, in ms, and an unhurried one: the modifier goes
     down and is seen down before the first tap, the taps come at a
     stroll (each well past the preview delay, so every strip is seen to
     bloom) and a little unevenly, the last selection is looked at, and
     the modifier goes up; then a real rest before the next scene. The
     first cut was half this and read as jarring (the user, 2026-08-27);
     a test keeps the floors. */
  var DEMO_PACE = { hold: 1100, tap: 1200, jitter: 220, settle: 1600, rest: 2200 };
  /* No scene needs more taps than this; a target that never comes
     (a rearranged desktop) is given up on rather than tapped forever. */
  var DEMO_MAX_TAPS = 16;

  function createAutopilot(o) {
    o = o || {};
    var keys = o.keys, controller = o.controller;
    var scenes = o.scenes || DEMO_SCENES, nativeScenes = o.nativeScenes || DEMO_SCENES_NATIVE;
    var pace = o.pace || DEMO_PACE;
    var later = o.setTimeout || function (fn, ms) { return setTimeout(fn, ms); };
    var cancel = o.clearTimeout || function (h) { clearTimeout(h); };
    var paused = o.paused || function () { return false; };
    var random = o.random || Math.random;
    var running = false, handle = null, scene = 0, step = 0, taps = 0, loops = 0;
    var world = null;   /* which switcher the last scene ran under */

    /* The scenes of the world the switch is set to. */
    function current() { return controller.state.crosswayEnabled ? scenes : nativeScenes; }

    /* A hand does not tap on a metronome. */
    function jittered(ms) { return ms + (random() * 2 - 1) * (pace.jitter || 0); }

    function onTarget(t) {
      if (t.app) { var a = controller.stage.selectedApp(); return !!a && a.id === t.app; }
      if (t.win) { var w = controller.stage.selectedWindow(); return !!w && w.id === t.win; }
      /* A raise with no session to read: the window is simply in front. */
      if (t.front) { var f = controller.state.windows[0]; return !!f && f.id === t.front; }
      return true;
    }
    function schedule(fn, ms) {
      handle = later(function () { handle = null; if (running) { fn(); } }, ms);
    }
    /* The modifier goes down. A demo nobody is looking at can wait: it
       just tries again after a rest. */
    function begin() {
      if (paused()) { schedule(begin, pace.rest); return; }
      /* The switch was flipped between scenes: the other world's loop,
         from its first scene, since a loop closes only when run whole. */
      var w = controller.state.crosswayEnabled;
      if (world !== null && w !== world) { scene = 0; }
      world = w;
      var sc = current()[scene];
      step = 0; taps = 0;
      keys.hold(sc.hold);
      if (keys._held() !== sc.hold) { next(); return; }
      schedule(tapNext, pace.hold);
    }
    /* One tap of the scene's current key; on to the next key once its
       named target is selected. */
    function tapNext() {
      var sc = current()[scene], t = sc ? sc.taps[step] : null;
      if (!sc) { next(); return; }
      /* The latch can be dropped under a running scene (a rebuild at
         the breakpoint, a switch flipped from the keyboard): then the
         scene is over, not sixteen taps of nothing. */
      if (keys._held() !== sc.hold) { next(); return; }
      if (!t) { schedule(letGo, pace.settle); return; }
      keys.tap(t.key);
      taps += 1;
      if (onTarget(t) || taps >= DEMO_MAX_TAPS) { step += 1; taps = 0; }
      schedule(tapNext, jittered(pace.tap));
    }
    /* The modifier goes up, which commits, exactly as a visitor's does. */
    function letGo() {
      var sc = current()[scene];
      if (sc && keys._held() === sc.hold) { keys.hold(sc.hold); }
      next();
    }
    function next() {
      scene = (scene + 1) % current().length;
      if (scene === 0) { loops += 1; }
      schedule(begin, pace.rest);
    }
    function start() {
      if (running) { return; }
      running = true;
      scene = 0; world = null;
      schedule(begin, pace.rest);
    }
    /* Stopping mid-scene abandons the session rather than committing a
       selection nobody chose, and lets the key go. */
    function stop() {
      if (!running) { return; }
      running = false;
      if (handle !== null) { cancel(handle); handle = null; }
      if (keys._held() !== null) { controller.escape(); keys.clear(); }
    }
    return {
      start: start, stop: stop,
      get running() { return running; },
      get scene() { return scene; },
      get loops() { return loops; },
    };
  }

  /* The box over the keys. Checked runs the autopilot; a real press on
     any of `stops` unchecks it, so the visitor's first go at driving
     takes over and never fights the demo.

     What is IN that list is the keys and the screen: the two surfaces
     the demo itself drives. The bezel is deliberately out (2026-08-27,
     the user) — throwing the switch or moving the blur wheel is watching
     the demo under different settings, not taking it over, so it keeps
     running and picks up the world the switch now names.

     Three events, because a visitor reaches a surface three ways: a
     pointer press; a click in the CAPTURE phase, which runs before the
     key's own handler and so ends the autopilot's session before the
     visitor's begins (the keys are buttons wired on click, so Enter and
     Space arrive that way); and a keydown, also in capture, for anything
     driven by arrow keys rather than clicks. The autopilot itself never
     sends DOM events, so every one is the visitor. */
  function wireDemoMode(box, autopilot, stops) {
    if (!box) { return { _wired: false }; }
    function sync() {
      if (box.checked) { autopilot.start(); } else { autopilot.stop(); }
    }
    /* The box sits inside the keys box, so a press on the box itself, or
       on its label, is the visitor working the box, not taking over. */
    function onTheBox(node) {
      var label = box.parentNode || null;
      while (node) {
        if (node === box || (label && node === label)) { return true; }
        node = node.parentNode;
      }
      return false;
    }
    box.addEventListener("change", sync);
    function takeOver(e) {
      if (onTheBox(e && e.target)) { return; }
      if (box.checked) { box.checked = false; autopilot.stop(); }
    }
    (stops || []).forEach(function (el) {
      if (!el || !el.addEventListener) { return; }
      el.addEventListener("pointerdown", takeOver);
      el.addEventListener("click", takeOver, true);
      el.addEventListener("keydown", takeOver, true);
    });
    sync();
    return { _wired: true, sync: sync };
  }

  /* ====================================================================
     MOUNTING

     The phone gets FEWER things, not smaller ones. A 3x3 exposé of
     titled thumbnails inside a drawn screen at ~296px is a smudge, so
     below the breakpoint the demo runs on the compact fixture set: three
     apps, five windows, same reducer, same renderer. That is the whole
     reason the fixtures were data from the first task rather than code.

     Rebuilt when the breakpoint is crossed, because a visitor who
     rotates a phone should get the set that fits, not the one they
     happened to load with.
     ==================================================================== */
  var NARROW = "(max-width: 700px)";

  function pickFixtures() {
    var narrow = typeof window !== "undefined" && window.matchMedia
      && window.matchMedia(NARROW).matches;
    return narrow ? compactFixtures() : defaultFixtures();
  }

  function mountHero(opts) {
    var current = null;

    /* The DOM is wired ONCE, against this stand-in, and the engine is
       swapped underneath it at the breakpoint. Wiring per build stacked a
       second set of listeners on every key and control each time the
       breakpoint was crossed, so a tap moved the selection twice, and a
       Native choice on the switch was thrown away by a fresh engine that
       started in Crossway. */
    var proxy = {
      get state() { return current.controller.state; },
      get stage() { return current.controller.stage; },
      press: function (chord, o) { return current.controller.press(chord, o); },
      release: function () { return current.controller.release(); },
      escape: function () { return current.controller.escape(); },
      setCrosswayEnabled: function (on) { return current.controller.setCrosswayEnabled(on); },
      setIncludeMinimized: function (on) { return current.controller.setIncludeMinimized(on); },
    };

    /* The film, read out of the retro template once; every engine built
       here shows it on the same projector, so a rebuild at the
       breakpoint changes the screens and not the frame. */
    var projector = opts.projector || createProjector(collectReels(opts.reels || null));

    function build() {
      var c = createController({
        root: opts.root,
        status: opts.status,
        fixtures: pickFixtures(),
        projector: projector,
      });
      /* The screen is rebuilt, so its surfaces are new elements, and are
         what is wired per build. Every mouse verb that ends a session
         tells the keypad to let go of its latch. */
      var dropLatch = function () { if (keys) { keys.clear(); } };
      wireDesktop(c.renderer.desktop, c, dropLatch);
      wireMenubar({ button: c.renderer.menu.button, quit: c.renderer.menu.quit, screen: c.renderer.screen }, c, dropLatch);
      wireDock(c.renderer.dock, c, dropLatch);
      wirePane({ screen: c.renderer.screen, panel: c.renderer.panel, grid: c.renderer.grid }, c, dropLatch);
      c.draw();
      return { controller: c };
    }

    var keys = null;
    current = build();
    keys = wireKeys(opts.controls, proxy);
    var options = wireOptions(opts.settings || opts.controls, proxy, opts.root,
      function () { if (keys) { keys.clear(); } });
    /* The stage wears the mode, so the drawing around the screen can
       answer it: the display's power light is lit with Crossway and
       dark without. */
    var stageEl = opts.stage || opts.settings || null;
    function markMode(crossway) {
      if (stageEl && stageEl.classList) { stageEl.classList.toggle("is-native", !crossway); }
    }
    var toggle = wireToggle(opts.toggle, proxy, function (crossway) {
      options.sync();
      markMode(crossway);
      /* A session open on a chord the other mode does not have must not
         survive the flip, and it was abandoned rather than committed. */
      keys.clear();
    });

    /* What the visitor has set, read back off the controls and put into
       a fresh engine: the switch's checked side, the minimized box, and
       the blur (which lives on the screen element and re-applies itself
       through the options). The latch is dropped: the new engine has no
       session for it to hold. */
    function restore() {
      var cells = toggle.cells || [];
      var native = cells.some(function (cell) {
        return cell.getAttribute("data-mode") === "native" && cell.getAttribute("aria-checked") === "true";
      });
      if (native) { current.controller.setCrosswayEnabled(false); }
      markMode(!native);
      (options.boxes || []).forEach(function (b) {
        if (b.getAttribute("data-option") === "include-minimized") {
          current.controller.setIncludeMinimized(!!b.checked);
        }
      });
      options.sync();
      keys.clear();
    }

    function rebuild() {
      current = build();
      restore();
    }

    /* The hero starts at rest: the desktop, the film playing, nothing
       held, so the first thing a visitor does is the first thing that
       happens. A caller that wants it open — the social card — asks. */
    if (opts.open === true) { keys.hold("cmd"); keys.tap("tab"); }

    /* Whether anyone can see the demo: scrolled away or in a hidden tab,
       the film stands on its frame and the autopilot waits. The film also
       stands still for good when the visitor has asked for less motion,
       as the retro figures do. */
    var reduced = typeof window !== "undefined" && !!window.matchMedia
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var onScreen = true;
    function hidden() { return typeof document !== "undefined" && !!document.hidden; }
    var filmRuns = !reduced && projector.reels.length > 0;
    function attend() {
      if (!filmRuns) { return; }
      if (onScreen && !hidden()) { projector.start(); } else { projector.stop(); }
    }
    if (typeof IntersectionObserver !== "undefined" && opts.root) {
      new IntersectionObserver(function (entries) {
        onScreen = !!entries[0].isIntersecting;
        attend();
      }).observe(opts.root);
    }
    if (typeof document !== "undefined" && document.addEventListener) {
      document.addEventListener("visibilitychange", attend);
    }
    attend();

    /* The automatic demo: the autopilot on the same keys, and the box
       that runs it. */
    var autopilot = opts.autopilot || createAutopilot({
      keys: keys,
      controller: proxy,
      paused: function () { return !onScreen || hidden(); },
    });
    /* The keys and the screen, and NOT the bezel (2026-08-27, the user):
       changing a setting is watching the demo, not taking it over. Throw
       the switch or move the wheel and the demo keeps running, in the
       world the switch now names; only the keys, the screen and the box
       itself stop it. The bezel is a sibling of the screen host rather
       than inside it, so leaving it out of this list is the whole of
       what that takes. */
    wireDemoMode(opts.demo, autopilot, [opts.controls, opts.root]);

    /* One write a minute is enough to keep the clock honest, and it
       touches nothing else — a full redraw would fight the session the
       visitor is in the middle of. */
    if (typeof setInterval === "function") {
      var ticking = setInterval(function () {
        var c = current && current.controller;
        if (c && c.renderer && c.renderer.clock) {
          c.renderer.clock.textContent = clockText();
          if (c.renderer.date) { c.renderer.date.textContent = dateText(); }
        }
      }, 20000);
      /* Under node the interval would hold the process open. */
      if (ticking && typeof ticking.unref === "function") { ticking.unref(); }
    }

    if (typeof window !== "undefined" && window.matchMedia) {
      var mq = window.matchMedia(NARROW);
      if (mq.addEventListener) { mq.addEventListener("change", rebuild); }
      else if (mq.addListener) { mq.addListener(rebuild); }
    }

    return {
      get controller() { return current.controller; },
      keys: keys,
      rebuild: rebuild,
      projector: projector,
      autopilot: autopilot,
    };
  }

  var CrosswayStage = {
    SKETCH: SKETCH,
    MODE: MODE,
    SHOW_DELAY: SHOW_DELAY,
    PREVIEW_DELAY: PREVIEW_DELAY,
    DOCK: DOCK,
    FRESH: FRESH,
    defaultFixtures: defaultFixtures,
    compactFixtures: compactFixtures,
    createStage: createStage,
    createRenderer: createRenderer,
    createProjector: createProjector,
    collectReels: collectReels,
    REEL_BOX: REEL_BOX,
    REEL_DWELL: REEL_DWELL,
    clockText: clockText,
    dateText: dateText,
    createController: createController,
    mountHero: mountHero,
    pickFixtures: pickFixtures,
    describeState: describeState,
    wireKeys: wireKeys,
    wireOptions: wireOptions,
    wireDesktop: wireDesktop,
    wireMenubar: wireMenubar,
    wireDock: wireDock,
    wirePane: wirePane,
    wireToggle: wireToggle,
    wireDemoMode: wireDemoMode,
    createAutopilot: createAutopilot,
    BLUR_NAMES: BLUR_NAMES,
    BLUR_STEPS: BLUR_STEPS,
    DEMO_SCENES: DEMO_SCENES,
    DEMO_SCENES_NATIVE: DEMO_SCENES_NATIVE,
    DEMO_PACE: DEMO_PACE,
    GRID_COLUMNS: GRID_COLUMNS,
    TILE_ASPECT: TILE_ASPECT,
    DESKTOP_ASPECT: DESKTOP_ASPECT,
    MIN_WIN: MIN_WIN,
    GRIP: GRIP,
    _edgeAt: edgeAt,
    STRIKE_MS: STRIKE_MS,
    /* exposed for tests */
    _nextIndex: nextIndex,
    _initialIndex: initialIndex,
  };

  /* Browser gets a namespace; the test runner gets an export. One line,
     no build step, and the browser path is untouched. */
  if (typeof module !== "undefined" && module.exports) {
    module.exports = CrosswayStage;
  } else {
    root.CrosswayStage = CrosswayStage;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
