// Contact form. The <form> already has a real method and action, so with this
// script absent it posts to Formspree and lands on Formspree's own thank-you
// page. This upgrade keeps the user on the site and reports state inline.
(function () {
  "use strict";

  var form = document.getElementById("contact-form");
  if (!form) return;

  var status = document.getElementById("form-status");
  var button = form.querySelector("[type='submit']");
  var buttonLabel = button ? button.textContent : "";
  var fields = Array.prototype.slice.call(
    form.querySelectorAll("input[name], textarea[name]")
  );

  function errorFor(field) {
    return document.getElementById(field.name + "-error");
  }

  function messageFor(field) {
    var v = field.validity;
    if (v.valueMissing) {
      return field.dataset.msgRequired || "This field is required.";
    }
    if (v.typeMismatch && field.type === "email") {
      return "Enter an email address we can reply to.";
    }
    if (v.tooShort) {
      return "That's a little short — give us a sentence or two.";
    }
    return field.validationMessage || "Check this field.";
  }

  function validate(field, show) {
    var slot = errorFor(field);
    var ok = field.checkValidity();

    field.setAttribute("aria-invalid", ok ? "false" : "true");
    if (slot) slot.textContent = ok || !show ? "" : messageFor(field);
    return ok;
  }

  fields.forEach(function (field) {
    // Validate on blur, then keep it live once the user has been told.
    field.addEventListener("blur", function () {
      validate(field, true);
    });
    field.addEventListener("input", function () {
      if (field.getAttribute("aria-invalid") === "true") validate(field, true);
    });
  });

  function setStatus(text, state) {
    if (!status) return;
    status.textContent = text;
    if (state) status.setAttribute("data-state", state);
    else status.removeAttribute("data-state");
  }

  function setBusy(busy) {
    if (!button) return;
    button.disabled = busy;
    button.textContent = busy ? "Sending…" : buttonLabel;
  }

  form.addEventListener("submit", function (e) {
    // Validating
    var firstBad = null;
    fields.forEach(function (field) {
      if (!validate(field, true) && !firstBad) firstBad = field;
    });

    if (firstBad) {
      e.preventDefault();
      setStatus("Fix the highlighted fields and send again.", "error");
      firstBad.focus();
      return;
    }

    if (!window.fetch) return; // no fetch: let the plain POST happen

    e.preventDefault();
    setBusy(true);
    setStatus("Sending your message…", null);

    window
      .fetch(form.action, {
        method: "POST",
        body: new FormData(form),
        headers: { Accept: "application/json" },
      })
      .then(function (response) {
        if (response.ok) {
          form.reset();
          fields.forEach(function (field) {
            field.setAttribute("aria-invalid", "false");
            var slot = errorFor(field);
            if (slot) slot.textContent = "";
          });
          setStatus(
            "Message sent. We usually reply within a day — the Discord is faster if you need us sooner.",
            "success"
          );
          return;
        }

        // Server error: Formspree took the request and refused it.
        return response
          .json()
          .catch(function () {
            return null;
          })
          .then(function (data) {
            var detail =
              data && data.errors
                ? data.errors
                    .map(function (err) {
                      return err.message;
                    })
                    .join(" ")
                : "";
            setStatus(
              "That didn't send" +
                (detail ? " — " + detail : ".") +
                " You can also reach us in the Discord.",
              "error"
            );
          });
      })
      .catch(function () {
        // Network error: the request never arrived.
        setStatus(
          "No connection, so the message didn't send. Check your network and try again, or ask in the Discord.",
          "error"
        );
      })
      .then(function () {
        setBusy(false);
      });
  });
})();
