// Count-up on the three stat figures. Fires once, when the stats grid crosses
// 30% visibility, and never again on scroll-back. 1800ms, ease-out cubic.
// Under reduced motion the final value is written immediately, no tween.
(function () {
  "use strict";

  var DURATION = 1800;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  var grid = document.querySelector("[data-stats]");
  if (!grid) return;

  var figures = Array.prototype.slice.call(grid.querySelectorAll("[data-count]"));
  if (!figures.length) return;

  // Read the target off the element so the number lives in the HTML, not here.
  figures.forEach(function (el) {
    var raw = el.getAttribute("data-count");
    el._target = parseFloat(raw);
    el._decimals = (raw.split(".")[1] || "").length; // "4.9" -> 1
    el._suffix = el.getAttribute("data-suffix") || "";
  });

  var render = function (el, value, done) {
    el.textContent = value.toFixed(el._decimals) + (done ? el._suffix : "");
  };

  var easeOutCubic = function (t) {
    return 1 - Math.pow(1 - t, 3);
  };

  var run = function () {
    if (reduced.matches) {
      figures.forEach(function (el) { render(el, el._target, true); });
      return;
    }
    var start = null;
    var frame = function (now) {
      if (start === null) start = now;
      var t = Math.min(1, (now - start) / DURATION);
      var k = easeOutCubic(t);
      figures.forEach(function (el) { render(el, el._target * k, t === 1); });
      if (t < 1) window.requestAnimationFrame(frame);
    };
    figures.forEach(function (el) { render(el, 0, false); });
    window.requestAnimationFrame(frame);
  };

  if (!("IntersectionObserver" in window)) { run(); return; }

  var seen = false;
  new IntersectionObserver(function (entries, obs) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting && !seen) {
        seen = true;
        obs.disconnect(); // once, full stop
        run();
      }
    });
  }, { threshold: 0.3 }).observe(grid);
})();
