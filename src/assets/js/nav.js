// Header: mobile disclosure + condense-on-scroll.
(function () {
  "use strict";

  var header = document.querySelector(".site-header");
  var toggle = document.querySelector(".nav__toggle");
  var links = document.getElementById("nav-links");

  // --- Mobile disclosure ---------------------------------------------------
  if (toggle && links) {
    var mq = window.matchMedia("(max-width: 720px)");

    var apply = function () {
      if (mq.matches) {
        // Collapsed by default on small screens; the button owns the state.
        links.hidden = toggle.getAttribute("aria-expanded") !== "true";
      } else {
        links.hidden = false;
        toggle.setAttribute("aria-expanded", "false");
      }
    };

    toggle.setAttribute("aria-expanded", "false");
    apply();
    mq.addEventListener("change", apply);

    toggle.addEventListener("click", function () {
      var open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      apply();
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
        toggle.setAttribute("aria-expanded", "false");
        apply();
        toggle.focus();
      }
    });

    links.addEventListener("click", function (e) {
      if (e.target.closest("a") && mq.matches) {
        toggle.setAttribute("aria-expanded", "false");
        apply();
      }
    });
  }

  // --- Condense past 60px --------------------------------------------------
  if (!header) return;

  var condensed = false;
  var ticking = false;

  var read = function () {
    var next = window.scrollY > 60;
    if (next !== condensed) {
      condensed = next;
      header.classList.toggle("is-condensed", condensed);
    }
    ticking = false;
  };

  window.addEventListener(
    "scroll",
    function () {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(read);
      }
    },
    { passive: true }
  );

  read();
})();
