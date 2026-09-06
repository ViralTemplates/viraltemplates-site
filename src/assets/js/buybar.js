// Fixed mobile purchase bar. Slides up once the page has scrolled past the
// product hero, and retracts when you scroll back to it. CSS keeps it out of
// the layout entirely above 1024px, so this only ever runs on small screens.
(function () {
  "use strict";

  var bar = document.querySelector("[data-buybar]");
  var anchor = document.querySelector("[data-buybar-anchor]");
  if (!bar || !anchor) return;

  if (!("IntersectionObserver" in window)) {
    bar.classList.add("is-in");
    return;
  }

  new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        // Visible once the anchor (the buy panel in the page flow) is gone.
        bar.classList.toggle("is-in", !entry.isIntersecting);
      });
    },
    { rootMargin: "0px 0px -40% 0px" }
  ).observe(anchor);
})();
