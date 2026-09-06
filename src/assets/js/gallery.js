// Product media carousel.
//
// Cross-fades on a timer, pauses on hover and focus-within, advances on
// hover-enter, and is operable from the keyboard as a tablist: arrow keys move
// between dots, exactly one dot is in the tab order, aria-selected tracks the
// visible slide. Prev/next arrows are ordinary buttons outside the slide region.
//
// A video slide is a plain YouTube iframe. The timer never runs while it is the
// active slide, and inactive slides are `inert` so a hidden iframe cannot be
// tabbed into.
(function () {
  "use strict";

  var INTERVAL = 5000;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

  document.querySelectorAll("[data-gallery]").forEach(function (root) {
    var slides = Array.prototype.slice.call(root.querySelectorAll("[data-slide]"));
    var dots = Array.prototype.slice.call(root.querySelectorAll("[data-dot]"));
    var prev = root.querySelector("[data-prev]");
    var next = root.querySelector("[data-next]");

    var index = 0;
    var timer = null;

    function onVideo() {
      return slides[index].hasAttribute("data-video");
    }

    function show(nextIndex, moveFocus) {
      index = (nextIndex + slides.length) % slides.length;

      slides.forEach(function (slide, i) {
        var on = i === index;
        slide.setAttribute("data-active", String(on));
        slide.setAttribute("aria-hidden", String(!on));
        if (on) slide.removeAttribute("inert");
        else slide.setAttribute("inert", "");
      });

      dots.forEach(function (dot, i) {
        var on = i === index;
        dot.setAttribute("aria-selected", String(on));
        dot.tabIndex = on ? 0 : -1; // roving tabindex
        if (on && moveFocus) dot.focus();
      });

      // Landing on the video slide stops the timer; start() refuses to run there.
      if (onVideo()) stop();
    }

    function start() {
      if (reduced.matches || slides.length < 2 || onVideo()) return;
      stop();
      timer = window.setInterval(function () {
        show(index + 1, false);
      }, INTERVAL);
    }

    function stop() {
      if (timer !== null) {
        window.clearInterval(timer);
        timer = null;
      }
    }

    // One slide: no controls exist and no timer should run.
    if (slides.length < 2) return;

    dots.forEach(function (dot, i) {
      dot.addEventListener("click", function () { show(i, false); start(); });
      dot.addEventListener("keydown", function (e) {
        var delta =
          e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 :
          e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
        if (delta) { e.preventDefault(); show(index + delta, true); start(); }
        else if (e.key === "Home") { e.preventDefault(); show(0, true); start(); }
        else if (e.key === "End") { e.preventDefault(); show(slides.length - 1, true); start(); }
      });
    });

    if (prev) prev.addEventListener("click", function () { show(index - 1, false); start(); });
    if (next) next.addEventListener("click", function () { show(index + 1, false); start(); });

    root.addEventListener("mouseenter", function () {
      stop();
      if (!onVideo()) show(index + 1, false);
    });
    root.addEventListener("mouseleave", start);
    root.addEventListener("focusin", stop);
    root.addEventListener("focusout", function (e) {
      if (!root.contains(e.relatedTarget)) start();
    });

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) { if (entry.isIntersecting) start(); else stop(); });
      }, { threshold: 0.2 }).observe(root);
    } else {
      start();
    }

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stop(); else start();
    });

    reduced.addEventListener("change", function () {
      if (reduced.matches) stop(); else start();
    });

    show(0, false);
  });
})();
