// Staggered reveal on cards and grids. Fires once per element and never again
// on scroll-back. If IntersectionObserver is missing, or the user asked for
// reduced motion, everything is shown immediately — content is never left
// stranded at opacity 0.
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  var supportsIO = "IntersectionObserver" in window;
  var targets = Array.prototype.slice.call(document.querySelectorAll(".reveal"));

  function revealAll() {
    targets.forEach(function (el) {
      el.style.removeProperty("--reveal-delay");
      el.classList.add("is-in");
    });
  }

  if (!supportsIO || reduced.matches) {
    revealAll();
  } else {
    var observer = new IntersectionObserver(
      function (entries, obs) {
        // Stagger within the batch that entered together, in DOM order.
        entries
          .filter(function (e) {
            return e.isIntersecting;
          })
          .sort(function (a, b) {
            return a.target.compareDocumentPosition(b.target) &
              Node.DOCUMENT_POSITION_FOLLOWING
              ? -1
              : 1;
          })
          .forEach(function (entry, i) {
            entry.target.style.setProperty("--reveal-delay", i * 40 + "ms");
            entry.target.classList.add("is-in");
            obs.unobserve(entry.target);
          });
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    );

    targets.forEach(function (el) {
      observer.observe(el);
    });
  }

  reduced.addEventListener("change", function () {
    if (reduced.matches) revealAll();
  });
})();
