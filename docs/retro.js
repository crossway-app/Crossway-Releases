/* crosswayapp.com's fourth secret: type the magic name anywhere on the
   page and the hero goes back to the hand-drawn figures this site wore
   before the live demo replaced them. Progressive enhancement only; with
   JavaScript off the word simply does nothing and the PowerBook stands.

   The figures live in a <template>, not behind display:none. Chrome
   keeps running CSS animations inside a hidden subtree, and those
   figures hold about twenty flipbook reels, so hiding them would cost
   every visitor style recalc forever. A template subtree is inert
   until cloned.

   Unlike the terminal, this swaps ONE section rather than repainting the
   page, so it needs no class on <html> and no appearance rules. It is
   still persisted the same way: localStorage "crossway-retro" holds "1"
   while the old hero is showing and the key is removed when it is not. */
(function () {
  "use strict";

  var WORD = "retro";
  var KEY = "crossway-retro";
  var buffer = "";

  function live() { return document.getElementById("demo"); }
  function template() { return document.getElementById("retro-hero"); }

  function mount() {
    var existing = document.getElementById("retro-mount");
    if (existing) { return existing; }
    var tpl = template();
    var host = live();
    if (!tpl || !host || !tpl.content) { return null; }
    var wrap = document.createElement("div");
    wrap.id = "retro-mount";
    wrap.appendChild(tpl.content.cloneNode(true));
    host.parentNode.insertBefore(wrap, host.nextSibling);
    /* The figures were cloned after demo.js ran, so its listeners are on
       nodes that are not these. Re-wire the clone. */
    if (window.CrosswayDemo && window.CrosswayDemo.wire) {
      window.CrosswayDemo.wire();
    }
    return wrap;
  }

  function unmount() {
    var wrap = document.getElementById("retro-mount");
    if (wrap && wrap.parentNode) { wrap.parentNode.removeChild(wrap); }
  }

  function isOn() { return !!document.getElementById("retro-mount"); }

  function setOn(on) {
    var host = live();
    if (!host) { return; }
    /* html.retro is set before first paint by the head snippet, purely so
       a returning visitor never sees the PowerBook flash before the swap.
       Keep it in step here — it carries no tokens and no appearance, only
       visibility. */
    var root = document.documentElement.classList;
    if (on) {
      if (!mount()) { return; }
      host.hidden = true;
      root.add("retro");
    } else {
      unmount();
      host.hidden = false;
      root.remove("retro");
    }
  }

  function persist(on) {
    try {
      if (on) { localStorage.setItem(KEY, "1"); } else { localStorage.removeItem(KEY); }
    } catch (e) {
      /* storage unavailable: session-only is fine */
    }
  }

  function trigger() {
    var on = !isOn();
    setOn(on);
    persist(on);
  }

  document.addEventListener("keydown", function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) { return; }
    var t = e.target;
    if (t && (t.isContentEditable || t.tagName === "INPUT" ||
              t.tagName === "TEXTAREA" || t.tagName === "SELECT")) { return; }
    if (!e.key || e.key.length !== 1) { return; } /* letters only */
    buffer = (buffer + e.key.toLowerCase()).slice(-WORD.length);
    if (buffer === WORD) {
      buffer = "";
      trigger();
    }
  });

  /* Restore the choice. Unlike the appearance modes there is no pre-paint
     snippet that can do this before first paint — the swap needs the
     template, so it necessarily happens after parsing. */
  function applyStored() {
    var stored;
    try {
      stored = localStorage.getItem(KEY);
    } catch (e) {
      return; /* storage unavailable: the PowerBook stands */
    }
    setOn(stored === "1");
  }

  applyStored();
  window.addEventListener("pageshow", function (e) {
    if (e.persisted) { applyStored(); }
  });
})();
