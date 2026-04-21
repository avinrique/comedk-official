/* ============================================
   LS Predictor — Contact Form Handler
   Validates form, submits to API, shows feedback.
   ============================================ */

document.addEventListener('DOMContentLoaded', function () {
  initContactForm();
});

function initContactForm() {
  var form = document.getElementById('contactForm');
  if (!form) return;

  var submitBtn = document.getElementById('contactSubmitBtn');
  var successMsg = document.getElementById('formSuccessMsg');
  var errorMsg = document.getElementById('formErrorMsg');

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    // Hide previous messages
    hideMessages();

    // Validate
    var isValid = validateForm();
    if (!isValid) return;

    // Collect data — omit exam if empty (backend enum-validates it)
    var formData = {
      name: getFieldValue('contactName'),
      email: getFieldValue('contactEmail'),
      phone: getFieldValue('contactPhone'),
      notes: getFieldValue('contactMessage'),
      source: 'website',
    };
    var examVal = getFieldValue('contactExam');
    if (examVal) formData.exam = examVal;

    // Show loading state
    setLoading(true);

    // Submit to API
    submitToAPI(formData);
  });

  /**
   * Validate all required form fields.
   * @returns {boolean}
   */
  function validateForm() {
    var valid = true;

    // Name validation
    var name = getFieldValue('contactName');
    if (!name || name.trim().length < 2) {
      showFieldError('contactName');
      valid = false;
    } else {
      clearFieldError('contactName');
    }

    // Email validation
    var email = getFieldValue('contactEmail');
    var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      showFieldError('contactEmail');
      valid = false;
    } else {
      clearFieldError('contactEmail');
    }

    // Phone validation (optional, but validate format if provided)
    var phone = getFieldValue('contactPhone');
    if (phone && phone.trim() !== '') {
      // Accept digits, spaces, +, -, ()
      var phoneClean = phone.replace(/[\s\-\(\)\+]/g, '');
      if (phoneClean.length < 7 || phoneClean.length > 15 || !/^\d+$/.test(phoneClean)) {
        showFieldError('contactPhone');
        valid = false;
      } else {
        clearFieldError('contactPhone');
      }
    } else {
      clearFieldError('contactPhone');
    }

    // Message validation
    var message = getFieldValue('contactMessage');
    if (!message || message.trim().length < 5) {
      showFieldError('contactMessage');
      valid = false;
    } else {
      clearFieldError('contactMessage');
    }

    return valid;
  }

  /**
   * Get a form field's value by ID.
   * @param {string} id
   * @returns {string}
   */
  function getFieldValue(id) {
    var field = document.getElementById(id);
    return field ? field.value : '';
  }

  /**
   * Show error state on a form field.
   * @param {string} id
   */
  function showFieldError(id) {
    var field = document.getElementById(id);
    if (!field) return;
    var group = field.closest('.form-group');
    if (group) {
      group.classList.add('error');
    }
  }

  /**
   * Clear error state on a form field.
   * @param {string} id
   */
  function clearFieldError(id) {
    var field = document.getElementById(id);
    if (!field) return;
    var group = field.closest('.form-group');
    if (group) {
      group.classList.remove('error');
    }
  }

  /**
   * Hide success and error messages.
   */
  function hideMessages() {
    if (successMsg) successMsg.classList.remove('visible');
    if (errorMsg) errorMsg.classList.remove('visible');
  }

  /**
   * Set submit button loading state.
   * @param {boolean} loading
   */
  function setLoading(loading) {
    if (!submitBtn) return;
    if (loading) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="spinner" style="width:18px;height:18px;border-width:2px;display:inline-block;"></span> Sending...';
    } else {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> Send Message';
    }
  }

  /**
   * Submit form data to the API.
   * @param {Object} data
   */
  async function submitToAPI(data) {
    try {
      // Use the API helper if available, otherwise use fetch directly
      var url = (typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'http://localhost:3000/api') + '/leads';

      var response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Server responded with status ' + response.status);
      }

      // Success — redirect to thank-you page
      form.reset();
      window.location.href = 'thank-you.html';
      return;
    } catch (err) {
      // Error
      setLoading(false);
      if (errorMsg) errorMsg.classList.add('visible');

      // Scroll to error message
      errorMsg.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

      console.error('Contact form submission error:', err);
    }
  }

  // Real-time validation: clear field error on input
  var inputFields = form.querySelectorAll('.form-control');
  inputFields.forEach(function (field) {
    field.addEventListener('input', function () {
      var group = field.closest('.form-group');
      if (group && group.classList.contains('error')) {
        group.classList.remove('error');
      }
    });
  });
}
