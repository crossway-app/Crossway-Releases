/* The menu bar's pull-down menus: Crossway, Learn and Support, the way a
   System 7 menu bar works, with the Download button and the lamp at the
   bar's right end.

   Each page writes its bar as plain links, which is the whole bar for a
   visitor without scripts. This script is loaded in the head, without
   defer, so it can mark the page (html.menus) before the first paint;
   style.css then draws the bar as the menus will have it, and nothing
   moves when they are built. The bar is changed in place: hero-init.js
   holds a reference to the nav and night.js finds the lamp by its class,
   so the nav, the lamp and the spacer stay, and only the links and the
   app title are replaced.

   Titles are disclosure buttons and menus are lists of links (no menu
   roles), so a screen reader hears a list of links. A menu opens when the
   pointer rests on its title, and once one is open the others open as the
   pointer slides across. A press and drag works too, as on the Mac. A
   click on the Crossway title goes home, as choosing Home does; Enter,
   Space and a tap open its menu instead, since they have no hover.

   A chosen item flashes once while the browser is already following its
   link, so nothing waits for the flash. The browser follows the link
   itself, so history, the hash jump and where focus starts all behave as
   they would for any link. */
(function () {
  "use strict";

  var ROOT = new URL(".", document.currentScript.src);
  var html = document.documentElement;
  html.classList.add("menus");

  /* ---------- where we are, and where things go ---------- */

  var PAGE = (function () {
    var p = location.pathname;
    if (p.indexOf(ROOT.pathname) !== 0) { return ""; }
    var rel = p.slice(ROOT.pathname.length).replace(/index\.html$/, "");
    if (rel === "") { return "home"; }
    var m = /^([a-z-]+)\/$/.exec(rel);
    return m ? m[1] : "";
  })();

  /* Download, Try it, Privacy and Donate are places on the home page.
     Donate is the home page's window, never donate/, which is the address
     the app links to and only sends the visitor on to that window. */
  var DEST = {
    home: { label: "Home", page: "home", path: "" },
    download: { label: "Download", hash: "download" },
    tryit: { label: "Try it", hash: "demo" },
    privacy: { label: "Privacy", hash: "privacy" },
    donate: { label: "Donate", hash: "donate" },
    features: { label: "Features", page: "features", path: "features/" },
    readme: { label: "Read Me", page: "readme", path: "readme/" },
    troubleshooting: { label: "Troubleshooting", page: "troubleshooting", path: "troubleshooting/" },
    contact: { label: "Contact", page: "contact", path: "contact/" },
    terms: { label: "Terms", page: "terms", path: "terms/" },
    github: { label: "GitHub", ext: "https://github.com/crossway-app/Crossway-Releases" }
  };
  var MENUS = [
    { key: "crossway", app: true, items: ["home", "-", "download", "tryit", "privacy", "donate", "-", "github", "terms"] },
    { key: "learn", label: "Learn", items: ["features", "readme"] },
    { key: "support", label: "Support", items: ["troubleshooting", "contact"] }
  ];

  function hereWith(hash) {
    var u = new URL(location.href);
    u.hash = hash;
    return u.href;
  }
  function hrefOf(d) {
    if (d.ext) { return d.ext; }
    /* Home from the home page goes to its top, as the plain bar's app
       title does, rather than reloading the page and restarting the hero. */
    if (d.page === "home" && PAGE === "home") { return hereWith("top"); }
    if (d.hash) {
      /* In retro mode the demo is hidden and the retro hero stands in its
         place, so Try it goes there. */
      var h = d.hash === "demo" && html.classList.contains("retro") ? "retro-mount" : d.hash;
      return PAGE === "home" ? hereWith(h) : new URL("#" + h, ROOT).href;
    }
    return new URL(d.path, ROOT).href;
  }
  function isCurrent(d) { return !!d.page && d.page === PAGE; }

  /* ---------- small helpers ---------- */

  var reducedQuery = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  var coarseQuery = window.matchMedia ? window.matchMedia("(pointer: coarse)") : null;
  function motionOK() { return !(reducedQuery && reducedQuery.matches); }
  function now() { return performance.now(); }
  function el(tag, cls) {
    var n = document.createElement(tag);
    if (cls) { n.className = cls; }
    return n;
  }
  function modified(e) { return e.metaKey || e.ctrlKey || e.shiftKey || e.altKey; }
  function isField(t) {
    return !!t && (t.isContentEditable || t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT");
  }
  function closestEl(t, sel) { return t && t.closest ? t.closest(sel) : null; }

  /* ---------- building the bar ---------- */

  var nav = null, lamp = null, spacer = null;
  var titles = null, download = null, scrim = null;
  var menus = [];             /* the menus on a wide bar: { app, li, btn, panel } */
  var sheet = null;           /* the folded bar's one menu, on the Crossway title */

  function built() { return !!titles; }
  function isFolded() { return !!nav && nav.classList.contains("is-folded"); }
  function active() { return isFolded() ? [sheet] : menus; }

  function tree(items) {
    return items.map(function (key) { return key === "-" ? { sep: true } : { dest: key }; });
  }
  /* The folded bar's one menu holds every menu in order, each after the
     first under a grey header named after its title. */
  function foldedTree() {
    var all = tree(MENUS[0].items);
    for (var i = 1; i < MENUS.length; i++) {
      all.push({ sep: true });
      all.push({ label: MENUS[i].label, kids: tree(MENUS[i].items) });
    }
    return all;
  }

  function itemLink(key) {
    var d = DEST[key];
    var a = el("a", "menu-item");
    a.href = hrefOf(d);
    a.draggable = false;
    a.setAttribute("data-dest", key);
    var check = el("span", "menu-check");
    check.setAttribute("aria-hidden", "true");
    var text = el("span", "menu-text");
    text.textContent = d.label;
    var side = el("span", "menu-key");
    side.setAttribute("aria-hidden", "true");
    if (isCurrent(d)) {
      check.textContent = "✓";
      a.setAttribute("aria-current", "page");
    }
    if (d.ext) {
      /* Off the site, in a tab of its own, so this page stays open. */
      a.target = "_blank";
      a.rel = "noopener";
      side.classList.add("menu-external");
      var sr = el("span", "sr-only");
      sr.textContent = " (opens in a new tab)";
      text.appendChild(sr);
    }
    a.appendChild(check);
    a.appendChild(text);
    a.appendChild(side);
    return a;
  }

  var headers = 0;
  function renderList(nodes, ul) {
    nodes.forEach(function (n) {
      var li = el("li");
      if (n.sep) {
        li.className = "menu-sep";
        li.setAttribute("aria-hidden", "true");
      } else if (n.kids) {
        headers += 1;
        var head = el("div", "menu-header");
        head.id = "menu-header-" + headers;
        head.setAttribute("aria-hidden", "true");
        head.textContent = n.label;
        var group = el("div");
        group.setAttribute("role", "group");
        group.setAttribute("aria-labelledby", head.id);
        var sub = el("ul");
        renderList(n.kids, sub);
        group.appendChild(sub);
        li.appendChild(head);
        li.appendChild(group);
      } else {
        li.appendChild(itemLink(n.dest));
      }
      ul.appendChild(li);
    });
  }

  function titleButton(spec) {
    var b = el("button", "menu-title");
    b.type = "button";
    b.id = "menu-title-" + spec.key;
    b.setAttribute("aria-expanded", "false");
    b.setAttribute("aria-controls", "menu-" + spec.key);
    if (spec.app) {
      var img = el("img", "appicon");
      img.src = new URL("assets/favicon-32.png", ROOT).href;
      img.width = 18;
      img.height = 18;
      img.alt = "";
      img.draggable = false;
      b.appendChild(img);
      b.appendChild(document.createTextNode("Crossway"));
    } else {
      b.textContent = spec.label;
    }
    return b;
  }

  function panelFor(id, nodes, extra) {
    var p = el("ul", "menu-panel" + (extra ? " " + extra : ""));
    p.id = id;
    p.hidden = true;
    renderList(nodes, p);
    return p;
  }

  function build() {
    /* The plain bar's links and its app title, which the menus replace. */
    [].slice.call(nav.children).forEach(function (c) { if (c.tagName === "A") { c.remove(); } });

    titles = el("ul", "menu-titles");
    menus = MENUS.map(function (s) {
      var li = el("li", "menu");
      var btn = titleButton(s);
      var panel = panelFor("menu-" + s.key, tree(s.items));
      li.appendChild(btn);
      li.appendChild(panel);
      titles.appendChild(li);
      return { app: !!s.app, li: li, btn: btn, panel: panel };
    });
    var all = panelFor("menu-all", foldedTree(), "menu-sheet");
    menus[0].li.appendChild(all);
    sheet = { app: true, li: menus[0].li, btn: menus[0].btn, panel: all };
    nav.insertBefore(titles, spacer && spacer.parentNode === nav ? spacer : lamp);

    /* The site's one zip link stays the home page's Download button, so
       this one takes the visitor there and never to the zip itself. */
    download = el("a", "menu-download");
    download.href = hrefOf(DEST.download);
    download.draggable = false;
    download.textContent = "Download";
    nav.insertBefore(download, lamp);

    /* The cover over the page while a menu is open (see syncPage). Its
       click listener is what makes the browser count it as a tap target;
       the window's pointerdown has normally closed the menu already. */
    scrim = el("div", "menu-scrim");
    scrim.hidden = true;
    scrim.setAttribute("aria-hidden", "true");
    scrim.addEventListener("click", close);
    nav.appendChild(scrim);

    fit();
  }

  /* ---------- fitting the bar on one row ---------- */

  /* Measured, not a breakpoint, so the terminal's wider face works too.
     The titles and the lamp decide: when they no longer fit on one row,
     the bar folds to the Crossway title alone, and its menu holds
     everything. The Download button is the first to give way: it shows
     only where it still fits beside whatever titles the bar keeps. The
     pages preload the bar's face (style.css's @font-face says why), so
     the first measurement is normally made in it already, and the bar is
     measured again whenever a font arrives. */
  function outerWidth(n) {
    if (!n) { return 0; }
    var cs = getComputedStyle(n);
    if (cs.display === "none") { return 0; }
    return n.getBoundingClientRect().width + parseFloat(cs.marginLeft) + parseFloat(cs.marginRight);
  }
  function fit() {
    if (!built()) { return; }
    var was = isFolded();
    var hadFocus = nav.contains(document.activeElement);
    nav.classList.remove("is-folded", "hides-download");
    var cs = getComputedStyle(nav);
    var room = nav.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - 8;
    function fits(withButton) {
      return outerWidth(titles) + (withButton ? outerWidth(download) : 0) + outerWidth(lamp) <= room + 0.5;
    }
    var folded = !fits(false);
    if (folded) { nav.classList.add("is-folded"); }
    if (!fits(true)) { nav.classList.add("hides-download"); }
    menus[0].btn.setAttribute("aria-controls", folded ? "menu-all" : "menu-crossway");
    /* A menu that is still the right one stays open, and hangs again from
       its title, which the terminal's face or a late font may have moved. */
    if (folded !== was && S.open) { close(); } else if (S.open) { hang(S.open); }
    /* Keyboard focus is never dropped. A title or the Download button
       that has just folded away (closing a menu hands focus to its title,
       which may be one of them) passes it to the Crossway title, which is
       always shown and now holds every menu. */
    var f = document.activeElement;
    if (hadFocus && !(f && nav.contains(f) && f.getClientRects().length)) { moveFocus(menus[0].btn); }
  }
  var fitQueued = false;
  function fitSoon() {
    if (fitQueued) { return; }
    fitQueued = true;
    requestAnimationFrame(function () { fitQueued = false; fit(); });
  }

  /* ---------- state ---------- */

  var S = {
    open: null,        /* the menu showing */
    openedAt: 0,
    openedBy: "",      /* "hover" (resting on a closed bar's title), "mouse"
                          (sliding across from an open menu), "press", "key"
                          or "tap" */
    press: null,       /* a mouse button held since a press on a title or panel */
    busy: false,       /* a chosen item is on its way */
    lit: null,         /* the one highlighted item */
    owner: "",         /* "pointer" or "keys": the device that moved last in
                          the open menu. Only a menu the pointer owns closes
                          when the pointer leaves it. */
    switching: false,  /* focus is being moved by this script, not by the visitor */
    ptrInside: false,  /* the mouse is on the bar or an open panel */
    quiet: null        /* a title just closed by a click or Esc: it waits for
                          the pointer to leave before resting on it opens it
                          again */
  };
  var swallow = null;          /* the rest of a click that closed a menu from outside */
  var passThrough = null;      /* our own click on the chosen link */
  var lastType = "";           /* the last pointer's type */
  var overTitle = null;        /* the menu whose title the mouse is over */
  var chooseTimers = [];

  var FLASH_MS = 60;
  var SETTLE_MS = 120;
  var STAY_MS = 2000;
  var HOVER_OPEN_MS = 100;
  var HOVER_GRACE_MS = 150;
  var HOVER_CLICK_GUARD_MS = 500;
  var AIM_MS = 300;
  var AIM_TOLERANCE = 20;
  var LAND_MS = 90;

  /* Every move of focus this script makes. It is marked as the script's,
     so the nav's focusout does not take it for the visitor leaving, and it
     never scrolls: the bar sits in the strip the page's scroll padding
     keeps clear, so the browser would scroll the page to bring a control
     in it into view, and the reader would lose their place. */
  function moveFocus(n) {
    S.switching = true;
    n.focus({ preventScroll: true });
    S.switching = false;
  }

  function menuOfTitle(t) {
    var b = closestEl(t, "button.menu-title");
    if (!b || !built()) { return null; }
    var list = active();
    for (var i = 0; i < list.length; i++) { if (list[i].btn === b) { return list[i]; } }
    return null;
  }
  function itemIn(m, t) {
    if (!m) { return null; }
    var a = closestEl(t, "a.menu-item");
    return a && m.panel.contains(a) ? a : null;
  }
  function items(m) { return m ? [].slice.call(m.panel.querySelectorAll("a.menu-item")) : []; }

  function light(a) {
    if (S.lit === a) { return; }
    if (S.lit) { S.lit.classList.remove("is-lit", "is-flashing"); }
    S.lit = a || null;
    if (S.lit) { S.lit.classList.add("is-lit"); }
  }
  function focusedItem() {
    var f = document.activeElement;
    return S.open && f && f.classList && f.classList.contains("menu-item") && S.open.panel.contains(f) ? f : null;
  }
  /* One highlight in a menu, owned by whichever device moved last. The
     mouse takes it by moving over an item; if the keyboard was in the
     menu, focus follows the mouse so the next key carries on from there.
     Off the items, the focused item keeps it, so focus never goes unseen. */
  function lightByMouse(a) {
    if (!a) { light(focusedItem()); return; }
    var f = focusedItem();
    if (f && f !== a) { moveFocus(a); }
    light(a);
  }
  function focusItem(a) {
    if (!a) { return; }
    S.owner = "keys";
    light(a);
    moveFocus(a);
    var p = S.open && S.open.panel;
    if (p && p.scrollHeight > p.clientHeight) {
      var top = a.offsetTop, bottom = top + a.offsetHeight;
      var parent = a.offsetParent;
      while (parent && parent !== p) { top += parent.offsetTop; bottom += parent.offsetTop; parent = parent.offsetParent; }
      if (top < p.scrollTop) { p.scrollTop = top; } else if (bottom > p.scrollTop + p.clientHeight) { p.scrollTop = bottom - p.clientHeight; }
    }
  }

  /* Try it follows retro mode, which can change while the page is open. */
  function syncTryIt(m) {
    var a = m.panel.querySelectorAll('a[data-dest="tryit"]');
    for (var i = 0; i < a.length; i++) { a[i].href = hrefOf(DEST.tryit); }
  }

  /* Hangs from the bar's rule, its left edge on its title's, clamped
     inside the viewport. The folded bar's sheet is placed by its CSS. */
  function place(m) {
    var p = m.panel;
    /* The nav has no top border, so its padding box starts at its top:
       its full height is exactly the rule's foot, whatever whole device
       pixels the browser snapped the 1.5px rule to. */
    p.style.top = nav.getBoundingClientRect().height + "px";
    if (m === sheet) { p.style.left = ""; p.style.maxWidth = ""; return; }
    var vw = html.clientWidth;
    var gutter = vw <= 700 ? 16 : 8;
    p.style.maxWidth = Math.max(160, vw - 2 * gutter) + "px";
    p.style.left = "0px";
    var nb = nav.getBoundingClientRect();
    var bb = m.btn.getBoundingClientRect();
    var pw = p.getBoundingClientRect().width;
    var x = Math.min(bb.left, vw - gutter - pw);
    x = Math.max(x, Math.min(bb.left, gutter));
    p.style.left = (x - nb.left) + "px";
  }

  /* The Crossway menu's words start under the word Crossway, so its
     check column is as wide as the icon's stretch of the title and the
     check sits under the icon. The other menus keep the plain check
     column, and the folded bar's sheet keeps its own columns. */
  function alignWords(m) {
    m.panel.style.removeProperty("--menu-check-width");
    if (isFolded() || !m.app) { return; }
    var word = null;
    for (var n = m.btn.lastChild; n && !word; n = n.previousSibling) { if (n.nodeType === 3 && n.data.trim()) { word = n; } }
    if (!word) { return; }
    var range = document.createRange();
    range.selectNodeContents(word);
    var x = range.getBoundingClientRect().left;
    var box = m.panel.getBoundingClientRect();
    var edge = parseFloat(getComputedStyle(m.panel).borderLeftWidth) || 0;
    m.panel.style.setProperty("--menu-check-width", Math.max(0, x - box.left - edge) + "px");
  }

  /* An open menu follows its title, wherever the bar puts it. */
  function hang(m) {
    place(m);
    alignWords(m);
  }

  function isPhone() { return isFolded() || html.clientWidth <= 700; }

  /* While a menu is open the page behind it is covered, as on the Mac,
     where nothing else answers until the menu is done. A click or tap on
     the cover closes the menu (the window's pointerdown does that). The
     cover also keeps the browser's touch adjustment honest: a tap just
     below a menu lands on the cover, which answers taps, instead of being
     moved up onto the nearest row. Under the folded bar's sheet it wears
     the site's dither, lightly, and the page under it holds still. */
  function syncPage() {
    var open = !!S.open;
    var sheetOpen = open && isFolded();
    html.classList.toggle("menu-sheet-open", sheetOpen);
    scrim.hidden = !open;
    scrim.classList.toggle("is-dithered", sheetOpen);
  }

  /* Opening m (or closing, with m null). Keyboard focus is never dropped:
     if it was in the menu going away, it moves to the new menu's title, or
     back to the old one's when nothing replaces it. */
  function show(m, by) {
    var prev = S.open;
    if (prev === m) { return; }
    if (prev) {
      var f = document.activeElement;
      if (f && prev.panel.contains(f)) { moveFocus((m || prev).btn); }
      prev.panel.hidden = true;
      prev.btn.setAttribute("aria-expanded", "false");
    }
    light(null);
    S.open = m || null;
    if (m) {
      syncTryIt(m);
      m.panel.scrollTop = 0;
      m.panel.hidden = false;
      hang(m);
      m.btn.setAttribute("aria-expanded", "true");
      S.openedAt = now();
      S.openedBy = by || "";
      S.owner = S.openedBy === "key" ? "keys" : "pointer";
    }
    syncPage();
  }

  function close() {
    cancelAim();
    cancelIntent();
    cancelGrace();
    S.press = null;
    if (S.open) { show(null); }
  }

  /* ---------- menu aim (the diagonal into a panel) ---------- */

  var locs = [];
  var aim = { m: null, timer: 0 };
  function track(e) {
    locs.push({ x: e.clientX, y: e.clientY });
    if (locs.length > 3) { locs.shift(); }
  }
  function sign(p, a, b) { return (p.x - b.x) * (a.y - b.y) - (a.x - b.x) * (p.y - b.y); }
  function inTriangle(p, a, b, c) {
    var d1 = sign(p, a, b), d2 = sign(p, b, c), d3 = sign(p, c, a);
    var neg = d1 < 0 || d2 < 0 || d3 < 0, pos = d1 > 0 || d2 > 0 || d3 > 0;
    return !(neg && pos);
  }
  /* Heading into the open panel: inside the triangle from an earlier
     pointer sample to the panel's top corners (Kamens' menu aim), so a
     diagonal from a title down into its menu does not pass over the next
     title and switch menus on the way. */
  function headingIn(x, y) {
    var m = S.open;
    if (!m) { return false; }
    var r = m.panel.getBoundingClientRect();
    if (!r.width || y >= r.top) { return false; }
    var p = locs[0];
    if (!p || (p.x === x && p.y === y) || p.y >= y) { return false; }
    return inTriangle({ x: x, y: y }, p,
      { x: r.left - AIM_TOLERANCE, y: r.top }, { x: r.right + AIM_TOLERANCE, y: r.top });
  }
  function cancelAim() {
    if (aim.timer) { clearTimeout(aim.timer); }
    aim.m = null;
    aim.timer = 0;
  }
  function wantSwitch(m, x, y) {
    if (m === S.open) { cancelAim(); return; }
    if (S.open && headingIn(x, y)) {
      if (aim.m !== m) {
        cancelAim();
        aim.m = m;
        aim.timer = setTimeout(function () {
          var target = aim.m;
          cancelAim();
          if (target && overTitle === target && !S.busy) { show(target, S.press ? "press" : "mouse"); }
        }, AIM_MS);
      }
      return;
    }
    cancelAim();
    show(m, S.press ? "press" : "mouse");
  }

  /* ---------- resting on a title, and leaving ---------- */

  var intent = { m: null, timer: 0 };
  var grace = 0;
  function cancelIntent() {
    if (intent.timer) { clearTimeout(intent.timer); }
    intent.m = null;
    intent.timer = 0;
  }
  function cancelGrace() {
    if (grace) { clearTimeout(grace); }
    grace = 0;
  }
  /* The grace is for a pointer leaving its menu. A menu the keyboard is
     driving stays open until Esc, a choice, or focus leaving the nav,
     however the mouse drifts over the page. */
  function startGrace() {
    if (grace || !S.open || S.owner !== "pointer") { return; }
    grace = setTimeout(function () {
      grace = 0;
      if (!S.busy && !S.press && !S.ptrInside && S.owner === "pointer") { close(); }
    }, HOVER_GRACE_MS);
  }

  /* ---------- choosing ---------- */

  /* A chosen item confirms the pick with one quick flash (none with less
     motion asked for) while the page is already on its way. A jump on
     this page, or GitHub opening in a new tab, closes the menu once the
     flash is over. A trip to another page leaves the menu up, the item
     inverted, until the next page replaces this one, so the click never
     looks unanswered; if no page comes (the visitor stopped it), the menu
     closes after a moment. */
  function later(f, ms) { chooseTimers.push(setTimeout(f, ms)); }
  function settle() {
    chooseTimers.forEach(clearTimeout);
    chooseTimers = [];
    S.busy = false;
    close();
  }
  function choose(a) {
    if (S.busy || !S.open) { return; }
    S.busy = true;
    cancelAim();
    cancelIntent();
    cancelGrace();
    S.press = null;
    light(a);
    if (motionOK()) {
      a.classList.add("is-flashing");
      later(function () { a.classList.remove("is-flashing"); }, FLASH_MS);
    }
    /* Follow in a task of its own, never inside the event that chose the
       item: Enter chooses from within the browser's own click on this
       link, and a second click on a link the browser is already clicking
       is ignored, so nothing would happen. */
    later(function () { follow(a); }, 0);
  }

  function goHome(m) {
    var home = m.panel.querySelector('a.menu-item[data-dest="home"]');
    if (!home) { return; }
    if (S.open !== m) { show(m, "press"); }
    choose(home);
  }

  var LANDING_KEY = "crossway-menu-landing";
  function follow(a) {
    var url = new URL(a.href, location.href);
    var samePage = url.origin === location.origin && url.pathname === location.pathname && url.search === location.search;
    /* Focus leaves the item for its title now, as closing would move it,
       so the jump below still sets the focus starting point last. */
    var f = document.activeElement;
    if (S.open && f && S.open.panel.contains(f)) { moveFocus(S.open.btn); }
    passThrough = a;
    if (url.hash && samePage) {
      a.click();
      landing(url.hash.slice(1));
      later(settle, motionOK() ? SETTLE_MS : 0);
      return;
    }
    if (a.target === "_blank") {
      /* A new tab: this page stays, so the menu closes once the flash is
         over, as after a jump. */
      a.click();
      later(settle, motionOK() ? SETTLE_MS : 0);
      return;
    }
    if (url.hash && url.origin === location.origin) {
      try { sessionStorage.setItem(LANDING_KEY, url.hash); } catch (e) { /* no mark on arrival, that is all */ }
    }
    a.click();
    later(settle, STAY_MS);
  }

  /* Where the visitor landed: the target's title bar inverts twice, or the
     real Download button for Download, or the display for Try it. The top
     of the page (Home, from the home page) needs no mark. */
  function landing(id) {
    if (!motionOK() || !id || id === "top") { return; }
    var target = document.getElementById(id);
    if (!target) { return; }
    var marks;
    if (id === "download") {
      marks = [target.querySelector(".btn-default") || target.querySelector(".btn")];
    } else if (id === "demo") {
      marks = [target.querySelector(".cw-display-frame") || target];
    } else {
      var own = target.querySelector(":scope > .titlebar");
      marks = own ? [own] : [].slice.call(target.querySelectorAll(".titlebar"));
    }
    marks = marks.filter(Boolean);
    if (!marks.length) { return; }
    var flips = 0;
    (function flip() {
      var on = flips % 2 === 0;
      marks.forEach(function (m) { m.classList.toggle("menu-landing", on); });
      flips += 1;
      if (flips < 4) { setTimeout(flip, LAND_MS); } else { setTimeout(function () { marks.forEach(function (m) { m.classList.remove("menu-landing"); }); }, LAND_MS); }
    })();
  }

  /* ---------- pointer ---------- */

  function consume(e) {
    e.preventDefault();
    e.stopImmediatePropagation();
    swallow = { until: now() + 1500 };
  }
  function swallowing() {
    if (!swallow) { return false; }
    if (now() > swallow.until) { swallow = null; return false; }
    return true;
  }

  function onPointerDown(e) {
    lastType = e.pointerType || "mouse";
    swallow = null;
    if (!built()) { return; }
    var t = e.target;
    var title = menuOfTitle(t);
    var inPanel = !!S.open && S.open.panel.contains(t);
    if (S.busy) {
      if (S.open || nav.contains(t)) { consume(e); }
      return;
    }
    if (download.contains(t) || lamp.contains(t)) {
      /* The bar's own buttons, Download and the lamp, are not the page
         beneath: the first click does what the button says, and closes
         any open menu as it goes. The visitor may never have clicked to
         open that menu at all. */
      if (S.open) { close(); }
      return;
    }
    if (!title && !inPanel) {
      /* Outside, the empty bar included: close, and keep the click from
         also acting on the page beneath (the hero pauses on a click, for
         one). */
      if (S.open) { close(); consume(e); }
      return;
    }
    if (e.button !== 0) { return; }
    if (lastType !== "mouse") { return; }     /* touch and pen act on the tap's click */
    cancelIntent();
    cancelGrace();
    if (title) {
      var wasOpen = S.open === title;
      /* A click soon after resting on the title opened its menu is the
         visitor confirming it, not asking to close it. */
      if (wasOpen && S.openedBy === "hover" && now() - S.openedAt < HOVER_CLICK_GUARD_MS) { wasOpen = false; }
      if (S.open !== title) { cancelAim(); show(title, "press"); }
      S.press = { id: e.pointerId, m: title, wasOpen: wasOpen };
    } else {
      S.press = { id: e.pointerId, m: null, wasOpen: true };
      lightByMouse(itemIn(S.open, t));
    }
  }

  /* The bar and its panels, but not the cover over the page. */
  function onBar(t) { return nav.contains(t) && !scrim.contains(t); }

  function onPointerMove(e) {
    if (e.pointerType !== "mouse") { return; }
    track(e);
    if (!built()) { return; }
    var t = e.target;
    var title = menuOfTitle(t);
    var inside = onBar(t);
    overTitle = title;
    S.ptrInside = inside;
    if (S.quiet && title !== S.quiet) { S.quiet = null; }
    if (S.busy) { return; }
    if (S.press && !(e.buttons & 1)) { S.press = null; }   /* a release we never heard */
    if (S.open && inside) { S.owner = "pointer"; }
    if (S.press || S.open) {
      var inPanel = !!S.open && S.open.panel.contains(t);
      if (title) {
        if (title !== S.open) { wantSwitch(title, e.clientX, e.clientY); } else { cancelAim(); }
      } else if (inPanel) {
        cancelAim();
        lightByMouse(itemIn(S.open, t));
      } else if (inside && S.press) {
        /* Over the empty bar while the button is held, System 7 shows no
           menu but stays armed: back on a title, its menu opens. */
        cancelAim();
        if (S.open) { show(null); }
      } else {
        /* Off below the panel: it stays open with nothing highlighted. */
        cancelAim();
        lightByMouse(null);
      }
      if (S.open && !S.press) {
        if (inside) { cancelGrace(); } else { startGrace(); }
      }
      return;
    }
    if (!e.buttons) {
      if (title && title !== S.quiet) {
        if (intent.m !== title) {
          cancelIntent();
          intent.m = title;
          intent.timer = setTimeout(function () {
            var m = intent.m;
            cancelIntent();
            if (m && !S.open && overTitle === m && !S.busy) { show(m, "hover"); }
          }, HOVER_OPEN_MS);
        }
      } else {
        cancelIntent();
      }
    }
  }

  function onPointerUp(e) {
    if (swallowing()) { e.stopImmediatePropagation(); return; }
    if (!S.press || e.pointerId !== S.press.id) { return; }
    var p = S.press;
    S.press = null;
    cancelAim();
    if (S.busy || !built()) { return; }
    var t = e.target;
    var title = menuOfTitle(t);
    var inPanel = !!S.open && S.open.panel.contains(t);
    var item = inPanel ? itemIn(S.open, t) : null;
    if (item) {
      if (!modified(e)) { choose(item); }
      return;
    }
    if (title) {
      if (title === p.m && title.app && !modified(e)) { goHome(title); return; }
      if (title === p.m && p.wasOpen && S.open === title) { close(); S.quiet = title; return; }
      if (S.open !== title) { show(title, "press"); }
      return;      /* sticky: a release on a title always leaves its menu open */
    }
    /* A press that began on a title and ends anywhere but an item, a
       divider or a header included, chooses nothing and closes the menu
       (System 7). A click inside an open menu leaves it open. */
    if (inPanel && !p.m) { return; }
    if (S.open) { close(); }
  }

  function onPointerCancel(e) {
    if (S.press && e.pointerId === S.press.id) { S.press = null; cancelAim(); }
  }

  function onMouseDown(e) {
    if (swallowing()) { e.preventDefault(); e.stopImmediatePropagation(); return; }
    if (!built()) { return; }
    if (menuOfTitle(e.target) || closestEl(e.target, ".menu-panel")) { e.preventDefault(); }
  }

  function onClick(e) {
    if (swallowing()) {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (e.type === "click") { swallow = null; }
      return;
    }
    if (!built() || e.type !== "click") { return; }
    var t = e.target;
    var a = closestEl(t, "a.menu-item");
    /* Enter and Space click with no detail; a tap carries its own type. */
    var type = e.detail === 0 ? "" : (e.pointerType || lastType || "mouse");
    if (a && nav.contains(a)) {
      if (a === passThrough) { passThrough = null; return; }
      if (e.button !== 0 || modified(e)) { return; }     /* a new tab or window: the browser's */
      e.preventDefault();
      if (type === "mouse" || S.busy) { return; }       /* the mouse chose it on release */
      if (S.open && S.open.panel.contains(a)) { choose(a); }
      return;
    }
    var title = menuOfTitle(t);
    if (title) {
      if (type === "mouse" || S.busy) { return; }
      /* Enter or Space, or a tap: toggle. Opening never moves focus. */
      if (S.open === title) { close(); S.quiet = title; } else { show(title, type ? "tap" : "key"); }
    }
  }

  /* ---------- keyboard ---------- */

  var NAV_KEYS = ["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight", "Home", "End"];

  function step(dir) {
    var list = items(S.open);
    if (!list.length) { return; }
    var cur = S.lit && list.indexOf(S.lit) >= 0 ? S.lit : focusedItem();
    var i = cur ? list.indexOf(cur) : -1;
    var next = i < 0 ? (dir > 0 ? 0 : list.length - 1) : (i + dir + list.length) % list.length;
    focusItem(list[next]);
  }
  /* Where there is nowhere to go, as from the folded bar's one title or
     its sheet, focus and the highlight stay where they are. Home on the
     first title with another menu open still brings the first menu. */
  function moveTitle(from, dir, absolute) {
    var list = active();
    var i = list.indexOf(from);
    var j = absolute === "first" ? 0 : absolute === "last" ? list.length - 1 : (i + dir + list.length) % list.length;
    var to = list[j];
    if (!to || (to === from && (!S.open || S.open === to))) { return; }
    if (S.open && S.open !== to) { show(to, "key"); }
    moveFocus(to.btn);
  }

  /* The APG's disclosure navigation. Letters are never taken: the site's
     secret words listen for typing anywhere on the page. */
  function onKeyDown(e) {
    if (!built()) { return; }
    if (e.metaKey || e.ctrlKey || e.altKey) { return; }
    var t = e.target;
    var k = e.key;
    var inNav = nav.contains(t);
    if (S.busy) {
      if (S.open && (NAV_KEYS.indexOf(k) >= 0 || k === "Enter" || k === " " || k === "Escape")) { e.preventDefault(); }
      return;
    }
    /* Escape closes an open menu even when a field has also used it (the
       features search clears its text on the same key), and only then is
       it ours. Focus goes back to the title unless the visitor was typing
       somewhere else. */
    if (k === "Escape" || k === "Esc") {
      if (!S.open) { return; }
      var m = S.open;
      var refocus = inNav || t === document.body || t === html;
      close();
      S.quiet = overTitle;
      if (refocus) { moveFocus(m.btn); }
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (e.defaultPrevented) { return; }
    var title = inNav ? menuOfTitle(t) : null;
    var item = inNav ? itemIn(S.open, t) : null;
    if (title) {
      if (k === "ArrowDown" || k === "ArrowUp") {
        if (S.open !== title) { show(title, "key"); }
        step(k === "ArrowDown" ? 1 : -1);
      } else if (k === "ArrowRight" || k === "ArrowLeft") {
        moveTitle(title, k === "ArrowRight" ? 1 : -1);
      } else if (k === "Home" || k === "End") {
        moveTitle(title, 0, k === "Home" ? "first" : "last");
      } else {
        return;
      }
      e.preventDefault();
      return;
    }
    if (item) {
      if (k === "ArrowDown") { step(1); }
      else if (k === "ArrowUp") { step(-1); }
      else if (k === "Home") { focusItem(items(S.open)[0]); }
      else if (k === "End") { var l = items(S.open); focusItem(l[l.length - 1]); }
      else if (k === "ArrowRight" || k === "ArrowLeft") { moveTitle(S.open, k === "ArrowRight" ? 1 : -1); }
      else if (k === " ") { choose(item); }
      else { return; }
      e.preventDefault();
      return;
    }
    /* A menu opened with the mouse while focus is elsewhere on the page:
       the arrows still drive it, unless the visitor is typing. */
    if (S.open && !isField(t) && !inNav) {
      if (k === "ArrowDown") { step(1); }
      else if (k === "ArrowUp") { step(-1); }
      else if (k === "ArrowRight" || k === "ArrowLeft") { moveTitle(S.open, k === "ArrowRight" ? 1 : -1); }
      else { return; }
      e.preventDefault();
    }
  }

  function onFocusIn(e) {
    var t = e.target;
    if (S.open && t.classList && t.classList.contains("menu-item") && S.open.panel.contains(t)) { light(t); }
  }
  function onFocusOut(e) {
    if (!S.open || S.busy || S.switching) { return; }
    var to = e.relatedTarget;
    if (to && S.open.li.contains(to)) { return; }
    if (!to && S.open.li.contains(document.activeElement)) { return; }
    close();
  }

  /* ---------- the bar's Download button ---------- */

  function onDownloadClick(e) {
    if (e.button !== 0 || modified(e)) { return; }
    var url = new URL(download.href, location.href);
    if (url.pathname === location.pathname && url.search === location.search) {
      requestAnimationFrame(function () { landing("download"); });
    } else {
      try { sessionStorage.setItem(LANDING_KEY, "#download"); } catch (err) { /* no mark on arrival, that is all */ }
    }
  }

  /* ---------- page events ---------- */

  var lastW = window.innerWidth, lastH = window.innerHeight;
  function onResize() {
    var w = window.innerWidth, h = window.innerHeight;
    var widthChanged = w !== lastW, heightChanged = h !== lastH;
    lastW = w;
    lastH = h;
    /* A phone's toolbar coming and going changes the height alone, and
       must not close the menu under the visitor's finger. */
    if (S.open && !S.busy && (widthChanged || (heightChanged && !(coarseQuery && coarseQuery.matches)))) { close(); }
    if (widthChanged) { fit(); } else { fitSoon(); }
  }
  function onScroll() {
    if (S.open && !S.busy && isPhone()) { close(); }
  }
  /* Back to this page from the browser's cache: the menu left up for the
     trip away comes back closed. */
  function onPageShow(e) {
    if (e.persisted) { settle(); }
  }

  window.addEventListener("pointerdown", onPointerDown, true);
  window.addEventListener("pointermove", onPointerMove, { capture: true, passive: true });
  window.addEventListener("pointerup", onPointerUp, true);
  window.addEventListener("pointercancel", onPointerCancel, true);
  window.addEventListener("mousedown", onMouseDown, true);
  window.addEventListener("mouseup", function (e) { if (swallowing()) { e.stopImmediatePropagation(); } }, true);
  window.addEventListener("click", onClick, true);
  window.addEventListener("auxclick", onClick, true);
  document.addEventListener("keydown", onKeyDown);
  window.addEventListener("resize", onResize);
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("pageshow", onPageShow);
  window.addEventListener("blur", function () { if (S.press) { S.press = null; cancelAim(); } });
  document.addEventListener("mouseout", function (e) {
    if (!e.relatedTarget && S.open && !S.press) { S.ptrInside = false; startGrace(); }
  });
  if (reducedQuery && reducedQuery.addEventListener) {
    reducedQuery.addEventListener("change", function () { if (S.open && !S.busy) { close(); } });
  }

  /* Arriving from another page through a menu item or the Download
     button: the browser has jumped to the hash; show where. */
  (function () {
    var land = null;
    try { land = sessionStorage.getItem(LANDING_KEY); sessionStorage.removeItem(LANDING_KEY); } catch (e) { /* no mark */ }
    if (!land || land !== location.hash) { return; }
    window.addEventListener("load", function () { setTimeout(function () { landing(land.slice(1)); }, 120); });
  })();

  /* ---------- attaching to the nav as soon as it is parsed ---------- */

  var attached = false;
  function attach() {
    if (attached) { return true; }
    var n = document.querySelector("nav.menubar");
    var l = n && n.querySelector(":scope > .lamp");
    if (!n || !l) { return false; }
    attached = true;
    nav = n;
    lamp = l;
    spacer = nav.querySelector(":scope > .spacer");
    nav.addEventListener("focusin", onFocusIn);
    nav.addEventListener("focusout", onFocusOut);
    nav.addEventListener("dragstart", function (e) { e.preventDefault(); });
    nav.addEventListener("click", function (e) { if (closestEl(e.target, "a.menu-download") === download) { onDownloadClick(e); } });
    build();
    /* The bar's height, for style.css: jumps land clear of the bar, the
       demo fits under it, and the folded sheet hangs from it. */
    if (window.ResizeObserver) {
      var lastWidth = -1;
      new ResizeObserver(function () {
        var r = nav.getBoundingClientRect();
        html.style.setProperty("--menubar-height", r.height + "px");
        if (r.width !== lastWidth) { lastWidth = r.width; fitSoon(); }
      }).observe(nav);
    }
    /* The terminal's face and a late web font change the titles' widths. */
    var wasHacker = html.classList.contains("hacker");
    new MutationObserver(function () {
      var h = html.classList.contains("hacker");
      if (h !== wasHacker) { wasHacker = h; fitSoon(); }
    }).observe(html, { attributes: true, attributeFilter: ["class"] });
    if (document.fonts) {
      if (document.fonts.ready) { document.fonts.ready.then(fitSoon); }
      if (document.fonts.addEventListener) { document.fonts.addEventListener("loadingdone", fitSoon); }
    }
    return true;
  }
  /* This script runs in the head, before the bar is parsed, so it builds
     the moment the lamp, the bar's last child, arrives. */
  if (!attach()) {
    var watch = new MutationObserver(function () { if (attach()) { watch.disconnect(); } });
    watch.observe(html, { childList: true, subtree: true });
    document.addEventListener("DOMContentLoaded", function () { if (attach()) { watch.disconnect(); } });
  }
  window.addEventListener("load", fitSoon);
})();
