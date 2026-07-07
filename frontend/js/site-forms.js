/* ============================================
   LS Consultancy Services — Shared Form Enhancements
   ------------------------------------------------
   1. Injects a required "authorisation to contact" consent
      checkbox into every form on the page (lead/contact/inquiry).
   2. Enforces the consent on submit (capturing phase, so it
      runs before each form's own submit handler).
   3. Provides a reusable "Contact Us" modal opened by any
      element carrying the [data-contact-modal] attribute.
   ============================================ */
(function () {
  'use strict';

  var CONSENT_TEXT =
    'I authorise LS Consultancy Services and its representatives to contact me ' +
    'by phone, SMS, WhatsApp or email regarding admission guidance and counselling, ' +
    'even if my number is registered under DND / NDNC.';

  /* ---------- Consent checkbox markup ---------- */
  function buildConsent() {
    var wrap = document.createElement('label');
    wrap.className = 'consent-group';

    var cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.className = 'consent-check';
    cb.name = 'consent';
    cb.required = true;

    var span = document.createElement('span');
    span.className = 'consent-text';
    span.textContent = CONSENT_TEXT;

    wrap.appendChild(cb);
    wrap.appendChild(span);
    return wrap;
  }

  function buildConsentError() {
    var err = document.createElement('div');
    err.className = 'consent-error';
    err.textContent = 'Please tick the box to authorise us to contact you.';
    return err;
  }

  /* Insert consent into a form if it doesn't already have one. */
  function attachConsent(form) {
    if (!form || form.querySelector('.consent-group')) return;

    // Only enhance forms that actually collect contact details.
    var submitBtn = form.querySelector('button[type="submit"], button:not([type]), input[type="submit"], .btn-submit');
    if (!submitBtn) return;

    var consent = buildConsent();
    var error = buildConsentError();
    submitBtn.parentNode.insertBefore(consent, submitBtn);
    submitBtn.parentNode.insertBefore(error, submitBtn);

    // Enforce on the capturing phase so this runs before the form's
    // own (bubbling) submit handler and can cancel it.
    form.addEventListener('submit', function (e) {
      var box = form.querySelector('.consent-check');
      if (box && !box.checked) {
        e.preventDefault();
        e.stopPropagation();
        if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
        error.classList.add('visible');
        box.focus();
      }
    }, true);

    var box = consent.querySelector('.consent-check');
    box.addEventListener('change', function () {
      if (box.checked) error.classList.remove('visible');
    });
  }

  /* ---------- Contact modal ---------- */
  var MODAL_HTML =
    '<div class="lsf-modal-overlay" id="lsfContactModal" role="dialog" aria-modal="true" aria-labelledby="lsfModalTitle" hidden>' +
      '<div class="lsf-modal">' +
        '<button type="button" class="lsf-modal-close" aria-label="Close">&times;</button>' +
        '<h3 id="lsfModalTitle">Contact Us</h3>' +
        '<p class="lsf-modal-sub">Share your details and an LS Consultancy advisor will call you back — usually within 24 hours.</p>' +
        '<div class="lsf-modal-success" id="lsfModalSuccess">Thank you! We have received your request and will contact you shortly.</div>' +
        '<form id="lsfModalForm" novalidate>' +
          '<div class="form-group"><label for="lsf-name">Your Name *</label>' +
            '<input type="text" id="lsf-name" name="name" placeholder="Full name" required></div>' +
          '<div class="form-group"><label for="lsf-phone">Phone Number *</label>' +
            '<input type="tel" id="lsf-phone" name="phone" placeholder="+91 9XXXXXXXXX" required></div>' +
          '<div class="form-group"><label for="lsf-email">Email</label>' +
            '<input type="email" id="lsf-email" name="email" placeholder="you@example.com"></div>' +
          '<div class="form-group"><label for="lsf-message">Message</label>' +
            '<textarea id="lsf-message" name="message" rows="3" placeholder="Which course / college are you interested in?"></textarea></div>' +
          '<label class="consent-group"><input type="checkbox" class="consent-check" name="consent" required>' +
            '<span class="consent-text">' + CONSENT_TEXT + '</span></label>' +
          '<div class="consent-error" id="lsfModalConsentError">Please tick the box to authorise us to contact you.</div>' +
          '<button type="submit" class="btn btn-primary btn-lg" id="lsfModalSubmit">Send Request</button>' +
        '</form>' +
      '</div>' +
    '</div>';

  var overlay, modalForm;

  function buildModal() {
    if (document.getElementById('lsfContactModal')) return;
    var holder = document.createElement('div');
    holder.innerHTML = MODAL_HTML;
    overlay = holder.firstChild;
    document.body.appendChild(overlay);

    modalForm = overlay.querySelector('#lsfModalForm');
    var closeBtn = overlay.querySelector('.lsf-modal-close');
    var consentErr = overlay.querySelector('#lsfModalConsentError');
    var success = overlay.querySelector('#lsfModalSuccess');

    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeModal();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !overlay.hidden) closeModal();
    });

    overlay.querySelector('.consent-check').addEventListener('change', function (e) {
      if (e.target.checked) consentErr.classList.remove('visible');
    });

    modalForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = modalForm.querySelector('[name="name"]').value.trim();
      var phone = modalForm.querySelector('[name="phone"]').value.trim();
      var consent = modalForm.querySelector('.consent-check');
      if (!consent.checked) {
        consentErr.classList.add('visible');
        consent.focus();
        return;
      }
      if (!name || !phone) return;

      var submitBtn = overlay.querySelector('#lsfModalSubmit');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending...';

      var payload = {
        name: name,
        phone: phone,
        email: modalForm.querySelector('[name="email"]').value.trim() || '',
        message: modalForm.querySelector('[name="message"]').value.trim() || '',
        consent: true,
        source: 'contact-modal',
        notes: 'Contact modal — ' + document.title
      };

      var base = (typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : '/api');
      fetch(base + '/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(done).catch(done);

      function done() {
        modalForm.style.display = 'none';
        success.classList.add('visible');
      }
    });
  }

  function openModal() {
    if (!overlay) buildModal();
    overlay.hidden = false;
    document.body.style.overflow = 'hidden';
    var first = overlay.querySelector('#lsf-name');
    if (first) first.focus();
  }

  function closeModal() {
    if (!overlay) return;
    overlay.hidden = true;
    document.body.style.overflow = '';
  }

  /* ---------- Init ---------- */
  function init() {
    Array.prototype.forEach.call(document.querySelectorAll('form'), attachConsent);

    var triggers = document.querySelectorAll('[data-contact-modal]');
    if (triggers.length) {
      buildModal();
      Array.prototype.forEach.call(triggers, function (t) {
        t.addEventListener('click', function (e) {
          e.preventDefault();
          openModal();
        });
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
