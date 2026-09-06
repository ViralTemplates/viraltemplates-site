// The review strip scrolls as one continuous loop. The duplicate half that
// hides the seam is cloned here rather than written into the HTML, so search
// engines and screen readers only ever see each review once.
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

  document.querySelectorAll("[data-marquee]").forEach(function (marquee) {
    var track = marquee.querySelector(".rmarquee__track");
    var group = marquee.querySelector(".rmarquee__group");
    if (!track || !group || track.dataset.cloned === "true") return;
    // Under reduced motion the strip is a static wrapped grid; a second copy
    // would just repeat every review on screen.
    if (reduced.matches) return;

    var clone = group.cloneNode(true);
    clone.classList.add("rmarquee__group--clone");
    clone.setAttribute("aria-hidden", "true");

    // Nothing in the duplicate half should be reachable by tab.
    clone.querySelectorAll("a, button, [tabindex]").forEach(function (el) {
      el.setAttribute("tabindex", "-1");
    });

    // Two equal-width groups in one animated track, so -50% lands on the seam.
    track.appendChild(clone);
    track.dataset.cloned = "true";
  });
})();
