/* The feature directory's compact search: it narrows what is already on
   /features/, and it is never the way the page works.

   The HTML is the catalog. Every entry is on the page, in document order,
   with its own heading, anchor and aliases, and the list of sections is
   ordinary fragment links. This script only hides what does not match, so
   with JavaScript off the visitor loses a convenience and nothing else.
   That is why the search field ships hidden in the markup and is revealed
   from here rather than being drawn by the page: a control that cannot
   work must not be on screen.

   What matching means here. A query is split on whitespace and EVERY token
   must match the entry, against one normalised bag of that entry's title,
   visible text, Settings path and `data-search` aliases. Shortcut-shaped
   queries use the aliases alone; this keeps a complete chord such as
   "cmd+w" on the command itself instead of matching an explanatory mention
   elsewhere on the page. A token matches at
   a WORD START, so "window" finds "windows" and "min" finds "minimize",
   while "ind" does not find "window". A one-character key such as W must
   match a complete word; otherwise "cmd w" would match every entry with a
   word beginning in W. Nothing is
   ranked or reordered: the page's own order is the answer, which is what
   keeps a filtered page still readable as a reference.

   Normalisation is deliberately small and symmetric: the SAME function
   runs over the query and over the entry, so a visitor may type the symbol
   or the name and land in the same place. The command symbol becomes
   "cmd command", the option symbol becomes "opt option alt", a backquote
   becomes "grave backtick", accents fold (Expose reaches the accented
   word), apostrophes close up ("app's" is "apps"), and every other
   punctuation mark becomes a space. */
(function () {
  "use strict";

  /* Each symbol expands to ALL of its names, so one bag answers every way
     of asking. Keys are single characters; values are already normalised. */
  var SYMBOLS = {
    "⌘": " cmd command ",
    "⌥": " opt option alt ",
    "⇧": " shift ",
    "⌃": " ctrl control ",
    "⇥": " tab ",
    "⎋": " esc escape ",
    "⏎": " return enter ",
    "←": " left arrow ",
    "→": " right arrow ",
    "↑": " up arrow ",
    "↓": " down arrow ",
    "`": " grave backtick "
  };

  var COMBINING = /[̀-ͯ]/g;

  /* Lowercase, fold accents, expand key symbols, close up apostrophes,
     turn everything else that is not a letter or digit into a space, and
     collapse. The result always starts and ends with a single space, so a
     word-start test is one substring check. */
  function normalize(text) {
    var s = String(text == null ? "" : text).toLowerCase();
    s = s.normalize ? s.normalize("NFD").replace(COMBINING, "") : s;
    var out = "";
    for (var i = 0; i < s.length; i++) {
      var ch = s.charAt(i);
      if (Object.prototype.hasOwnProperty.call(SYMBOLS, ch)) { out += SYMBOLS[ch]; }
      else if (ch === "'" || ch === "’") { /* app's -> apps */ }
      else if (ch >= "a" && ch <= "z") { out += ch; }
      else if (ch >= "0" && ch <= "9") { out += ch; }
      else { out += " "; }
    }
    var words = out.split(/\s+/).filter(Boolean);
    /* One space for nothing, not two: the sentinel is a single space at
       each end, so " " + token is a word-start test at every position and
       an empty bag is the empty bag. */
    return words.length ? " " + words.join(" ") + " " : " ";
  }

  /* One entry's searchable bag: title, the words a visitor can see, the
     Settings path, and the aliases. Order does not matter; presence does. */
  function haystack(parts) {
    var joined = [];
    for (var i = 0; i < parts.length; i++) {
      if (parts[i]) { joined.push(String(parts[i])); }
    }
    return normalize(joined.join(" "));
  }

  /* A query becomes its tokens. An empty or whitespace-only query has
     none, which every entry satisfies: no query means the whole
     directory. */
  function tokenize(query) {
    return normalize(query).split(" ").filter(function (token) {
      /* "cmd and w" is a natural way to type a chord. Treat the connector
         like + or whitespace, which normalisation has already removed. */
      return token && token !== "and";
    });
  }

  /* AND across tokens. Words prefix-match; one-character keys match whole
     words so a chord query stays precise. */
  function matches(bag, tokens) {
    for (var i = 0; i < tokens.length; i++) {
      var needle = " " + tokens[i] + (tokens[i].length === 1 ? " " : "");
      if (bag.indexOf(needle) === -1) { return false; }
    }
    return true;
  }

  /* A chord has a modifier and a key. The key may be a single letter or one
     of the named keys used by Crossway's default shortcuts. */
  function isShortcutQuery(tokens) {
    var modifier = false;
    var key = false;
    for (var i = 0; i < tokens.length; i++) {
      if (["cmd", "command", "opt", "option", "alt", "ctrl", "control"].indexOf(tokens[i]) !== -1) {
        modifier = true;
      }
      if (tokens[i].length === 1 || ["tab", "grave", "backtick"].indexOf(tokens[i]) !== -1) {
        key = true;
      }
    }
    return modifier && key;
  }

  var api = {
    normalize: normalize,
    haystack: haystack,
    tokenize: tokenize,
    matches: matches,
    isShortcutQuery: isShortcutQuery
  };

  /* The one test seam. Node evaluates this file with no document, takes
     the pure matcher off the sandbox and stops here; a browser has a
     document and never defines this global. Nothing else is exported, and
     the page reaches none of it. */
  if (typeof document === "undefined") {
    globalThis.CrosswayFeatureSearch = api;
    return;
  }

  /* ==================================================================
     The page wiring. Everything below is enhancement: if any piece of
     the expected markup is missing the function returns and the field
     stays hidden, so a half-published page shows a complete directory
     rather than a control that does nothing.
     ================================================================== */

  var box = document.querySelector(".features-search");
  var field = document.getElementById("features-search");
  var status = document.querySelector(".features-search-status");
  var empty = document.querySelector(".features-empty");
  var clearButton = document.querySelector(".features-clear");
  var entries = [].slice.call(document.querySelectorAll("article.feature"));
  var categories = [].slice.call(document.querySelectorAll("section.feature-category"));
  var groups = [].slice.call(document.querySelectorAll(".settings-tab"));
  var links = [].slice.call(document.querySelectorAll(".features-toc-list a[href^='#']"));
  if (!box || !field || !status || !empty || !clearButton || !entries.length) { return; }

  /* The index is built ONCE from what the page already says. textContent
     carries the title, the prose, the Settings path and the meta rows; the
     aliases come from the entry's own data-search. Nothing is written back
     to the document, so the visible copy is never rewritten. */
  var index = entries.map(function (el) {
    var aliases = el.getAttribute("data-search");
    return { el: el, bag: haystack([el.textContent, aliases]), shortcutBag: haystack([aliases]) };
  });

  /* A TOC link's destination, resolved once: a category, or the section
     that contains a deep-linked entry. */
  var destinations = links.map(function (a) {
    var id = a.getAttribute("href").slice(1);
    var target = id ? document.getElementById(id) : null;
    return { link: a, row: a.parentNode && a.parentNode.tagName === "LI" ? a.parentNode : a, target: target };
  });

  var TOTAL = index.length;
  var pending = 0;
  var current = "";

  function show(el, visible) {
    if (!el) { return; }
    if (visible) { el.removeAttribute("hidden"); } else { el.setAttribute("hidden", ""); }
  }

  function count(n) {
    if (!current) { return TOTAL + " features"; }
    if (!n) { return "No features found"; }
    return n === 1 ? "1 feature found" : n + " features found";
  }

  /* One pass, one frame: entries, then the groups and categories that are
     left empty by them, then the list, then one count. Order on the page is
     never touched; only visibility is. */
  function apply() {
    pending = 0;
    var tokens = tokenize(current);
    var shortcut = isShortcutQuery(tokens);
    var shown = 0;
    var i;

    /* If the visitor is standing on something about to disappear, take
       focus back to the field FIRST, so focus is never left on a hidden
       element (which drops it to the document and loses the visitor's
       place). */
    var active = document.activeElement;
    if (active && active !== field) {
      for (i = 0; i < index.length; i++) {
        if (index[i].el.contains(active) && !matches(shortcut ? index[i].shortcutBag : index[i].bag, tokens)) { field.focus(); break; }
      }
    }

    for (i = 0; i < index.length; i++) {
      var hit = matches(shortcut ? index[i].shortcutBag : index[i].bag, tokens);
      show(index[i].el, hit);
      if (hit) { shown++; }
    }
    for (i = 0; i < groups.length; i++) {
      show(groups[i], !!groups[i].querySelector("article.feature:not([hidden])"));
    }
    for (i = 0; i < categories.length; i++) {
      show(categories[i], !!categories[i].querySelector("article.feature:not([hidden])"));
    }
    for (i = 0; i < destinations.length; i++) {
      var d = destinations[i];
      show(d.row, !d.target || !d.target.hasAttribute("hidden"));
    }
    show(empty, current !== "" && shown === 0);
    status.textContent = count(shown);
    field.setAttribute("aria-expanded", current ? "true" : "false");
  }

  /* Coalesced to one frame: a fast typist gets one pass per painted frame,
     never one per keystroke. */
  function schedule() {
    if (pending) { return; }
    pending = window.requestAnimationFrame ? window.requestAnimationFrame(apply) : setTimeout(apply, 0);
  }

  function setQuery(value, focus) {
    current = String(value || "").trim();
    if (field.value !== value) { field.value = value; }
    if (focus) { field.focus(); }
    schedule();
  }

  field.addEventListener("input", function () {
    current = field.value.trim();
    schedule();
  });

  clearButton.addEventListener("click", function () { setQuery("", true); });

  /* Escape clears a query that has something in it, and only then. A second
     Escape is the browser's again, which is what lets a visitor dismiss
     whatever their own browser puts on screen. */
  field.addEventListener("keydown", function (e) {
    if (e.key !== "Escape" && e.keyCode !== 27) { return; }
    if (!field.value) { return; }
    e.preventDefault();
    setQuery("", true);
  });

  /* "/" and the K chords focus the field, but never while the visitor is
     typing somewhere, and never on top of a shortcut the browser owns.
     preventDefault happens only on the branch that actually handled the
     key, so every other combination behaves as it always did. */
  document.addEventListener("keydown", function (e) {
    var t = e.target;
    if (t && (t.isContentEditable || t.tagName === "INPUT" ||
              t.tagName === "TEXTAREA" || t.tagName === "SELECT")) { return; }
    var slash = e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey;
    var k = (e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey) && !e.altKey;
    if (!slash && !k) { return; }
    e.preventDefault();
    field.focus();
    field.select();
  });

  /* A link into an entry the current query has hidden: clear the query,
     then land on it. The query is never stored and never in the URL, so
     this is the only way the two can disagree. */
  window.addEventListener("hashchange", function () {
    var id = location.hash.slice(1);
    var target = id ? document.getElementById(id) : null;
    if (!target || !current) { return; }
    var hiddenNow = target.hasAttribute("hidden") ||
      (target.closest && target.closest("[hidden]"));
    if (!hiddenNow) { return; }
    setQuery("", false);
    apply();
    if (target.scrollIntoView) { target.scrollIntoView(); }
  });

  /* Which category the reader is in, marked on its list link, and only
     while there is no query (with one, the list is already the answer).
     Entirely optional: without IntersectionObserver nothing marks and
     nothing breaks. */
  if (window.IntersectionObserver && categories.length) {
    var seen = {};
    var observer = new window.IntersectionObserver(function (records) {
      var j;
      for (j = 0; j < records.length; j++) { seen[records[j].target.id] = records[j].isIntersecting; }
      var mark = null;
      for (j = 0; j < categories.length; j++) {
        if (seen[categories[j].id]) { mark = categories[j].id; break; }
      }
      for (j = 0; j < destinations.length; j++) {
        var href = destinations[j].link.getAttribute("href").slice(1);
        if (!current && href === mark) { destinations[j].link.setAttribute("aria-current", "location"); }
        else { destinations[j].link.removeAttribute("aria-current"); }
      }
    }, { rootMargin: "-20% 0px -70% 0px" });
    for (var c = 0; c < categories.length; c++) { observer.observe(categories[c]); }
  }

  /* Wiring succeeded, so the control may exist. Nothing above this line
     draws anything, which is the whole point: with JavaScript off, or with
     this file still on its way, there is no field to disappoint anyone. */
  field.value = "";
  status.textContent = count(0);
  box.hidden = false;
})();
