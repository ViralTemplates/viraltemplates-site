// Stat-card chart: a single-parameter draw.
//
// Every frame samples the curve y(x) = 0.18 + 0.74 * x^2.2 from x = 0 to tipX
// and writes the line's d, the area's d and the dot's position from that one
// tipX. Draw 2400ms, hold 3200ms at p = 1, reset, repeat. The loop is
// cancelled when the card leaves the viewport and restarts from p = 0 when it
// returns. Under reduced motion it draws once at p = 1.
(function () {
  "use strict";

  var N = 120;
  var DRAW = 2400;
  var HOLD = 3200;
  var W = 300;
  var H = 100;

  var root = document.querySelector("[data-spark]");
  if (!root) return;
  var line = root.querySelector("[data-spark-line]");
  var area = root.querySelector("[data-spark-area]");
  var dot = root.querySelector("[data-spark-dot]");
  if (!line || !area || !dot) return;

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

  function y(x) {
    return 0.18 + 0.74 * Math.pow(x, 2.2);
  }

  // NOTE: the brief names easeOutCubic but specifies tip positions of
  // 0.43 / 0.75 / 0.94 / 1.0 at 600 / 1200 / 1800 / 2400ms. Those are the
  // values of easeOutQuad (1 - (1-u)^2); cubic would give 0.58 / 0.88 / 0.98 /
  // 1.0. The stated frames are the acceptance test, so quad is what runs.
  // Swap the body of this function to  1 - Math.pow(1 - u, 3)  for cubic.
  function ease(u) {
    u = u < 0 ? 0 : u > 1 ? 1 : u;
    return 1 - (1 - u) * (1 - u);
  }

  function render(p) {
    var tip = p;
    var pts = [];
    for (var i = 0; i <= N; i++) {
      var x = (tip * i) / N;
      pts.push((x * W).toFixed(2) + " " + ((1 - y(x)) * H).toFixed(2));
    }
    var d = "M" + pts.join(" L");
    line.setAttribute("d", d);
    area.setAttribute("d", d + " L" + (tip * W).toFixed(2) + " " + H + " L0 " + H + " Z");
    dot.style.left = (tip * 100).toFixed(2) + "%";
    dot.style.bottom = (y(tip) * 100).toFixed(2) + "%";
    dot.style.opacity = p > 0.02 ? "1" : "0";
  }

  if (reduced.matches) {
    render(1);
    return;
  }

  var raf = null;
  var start = null;

  function frame(now) {
    if (start === null) start = now;
    var t = (now - start) % (DRAW + HOLD);
    render(t < DRAW ? ease(t / DRAW) : 1);
    raf = window.requestAnimationFrame(frame);
  }

  function play() {
    if (raf !== null) return;
    start = null; // always resume from p = 0
    render(0);
    raf = window.requestAnimationFrame(frame);
  }

  function stop() {
    if (raf !== null) {
      window.cancelAnimationFrame(raf);
      raf = null;
    }
  }

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) play();
        else stop();
      });
    }, { threshold: 0.2 }).observe(root);
  } else {
    play();
  }

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) stop();
  });

  reduced.addEventListener("change", function () {
    if (reduced.matches) { stop(); render(1); }
    else play();
  });
})();
