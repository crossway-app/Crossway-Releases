/* crosswayapp.com's copy button: the one line a visitor needs to hand a coding
   agent, put on the clipboard in a click.

   Progressive enhancement only. The button ships with the hidden attribute set
   and nothing here runs without this file, so a visitor with JavaScript off
   never meets a control that does nothing: they read the line and select it by
   hand, which is exactly what the page did before this file existed.

   A failed clipboard write is not worth an error message in a hero, so it
   falls back to selecting the text for the visitor and says nothing. */
(function () {
  "use strict";

  var REVERT = 1600;

  function wire(chip) {
    var button = chip.querySelector(".paste-chip-copy");
    var code = chip.querySelector("code");
    var text = chip.getAttribute("data-copy");
    if (!button || !code || !text) { return; }

    /* The label is announced rather than just redrawn, so the confirmation
       reaches someone who is not watching the button. */
    button.hidden = false;
    button.setAttribute("aria-live", "polite");

    var timer = null;
    function say(word) {
      button.textContent = word;
      /* A second click restarts the countdown instead of stacking timers,
         which is what would otherwise leave the label stuck on "Copied". */
      if (timer) { clearTimeout(timer); }
      timer = setTimeout(function () {
        button.textContent = "Copy";
        timer = null;
      }, REVERT);
    }

    function selectInstead() {
      var range = document.createRange();
      range.selectNodeContents(code);
      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }

    button.addEventListener("click", function () {
      if (!navigator.clipboard) { selectInstead(); return; }
      navigator.clipboard.writeText(text).then(function () {
        say("Copied");
      }, selectInstead);
    });
  }

  var chips = document.querySelectorAll(".paste-chip[data-copy]");
  for (var i = 0; i < chips.length; i++) { wire(chips[i]); }
})();
