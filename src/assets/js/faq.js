// <details> hides its content the instant `open` is removed, so a CSS collapse
// transition never gets to run. This holds the attribute on while a data-closing
// flag drives the collapse, then removes it once the transition has finished.
//
// With this script absent the FAQ still opens and closes — it just snaps.
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  var DURATION = 420; // must match --t-fade on .faq__a

  document.querySelectorAll("[data-faq] details").forEach(function (item) {
    var summary = item.querySelector("summary");
    if (!summary) return;

    var closing = false;

    summary.addEventListener("click", function (e) {
      if (reduced.matches) return; // let the browser do it instantly

      if (!item.open) {
        // Opening needs no help: the attribute lands first, then CSS animates.
        return;
      }

      // Closing: keep it open, flag it, and remove the attribute at the end.
      e.preventDefault();
      if (closing) return;
      closing = true;
      item.setAttribute("data-closing", "");

      window.setTimeout(function () {
        item.removeAttribute("data-closing");
        item.open = false;
        closing = false;
      }, DURATION);
    });
  });
})();
