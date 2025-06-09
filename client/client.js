document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const contactEmailInput = document.getElementById("contactEmail");
  const contactMessageInput = document.getElementById("contactMessage");
  const emailForm = document.getElementById("emailForm");
  const emailSuccess = document.getElementById("emailSuccess");
  const emailError = document.getElementById("emailError");
  const waitlistBtn = document.querySelector("[onclick*='waitlist']");
  const founderBtn = document.querySelector("[onclick*='founder']");
  const demoBtn = document.querySelector("[onclick*='demo']");

  // Dynamic backend URL based on environment
  const BACKEND_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'https://irci-port.onrender.com/api/submit-response'
    : 'https://irci-port.onrender.com/api/submit-response'; // Replace with your actual production URL

  // Form submission handler
  async function submitEmail(actionType = "contact") {
    // Validate inputs
    const email = contactEmailInput.value.trim();
    const message = contactMessageInput.value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Clear previous errors
    emailError.style.display = 'none';

    // Validation
    if (!emailRegex.test(email)) {
      showError('Please enter a valid email address');
      return;
    }

    try {
      // Show loading state (optional)
      // emailForm.querySelector('button').disabled = true;

      const response = await fetch(BACKEND_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          message,
          actionType
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Server responded with an error');
      }

      showSuccess();
      resetFormAfterDelay();
    } catch (error) {
      console.error('Submission error:', error);
      showError(error.message || 'An unexpected error occurred. Please try again.');
    } finally {
      // Remove loading state (optional)
      // emailForm.querySelector('button').disabled = false;
    }
  }

  // Helper functions
  function showError(message) {
    emailError.textContent = message;
    emailError.style.display = 'block';
    emailError.setAttribute('aria-live', 'assertive');
  }

  function showSuccess() {
    emailForm.style.display = 'none';
    emailSuccess.style.display = 'block';
    emailError.style.display = 'none';
  }

  function resetFormAfterDelay() {
    setTimeout(() => {
      emailForm.style.display = 'block';
      emailSuccess.style.display = 'none';
      contactEmailInput.value = '';
      contactMessageInput.value = '';
      contactEmailInput.focus();
    }, 5000);
  }

  // Event Listeners
  if (emailForm) {
    emailForm.addEventListener("submit", (e) => {
      e.preventDefault();
      submitEmail("contact");
    });
  }

  // Button event handlers (if you have separate buttons)
  if (waitlistBtn) {
    waitlistBtn.addEventListener("click", (e) => {
      e.preventDefault();
      submitEmail("waitlist");
    });
  }

  if (founderBtn) {
    founderBtn.addEventListener("click", (e) => {
      e.preventDefault();
      submitEmail("founder");
    });
  }

  if (demoBtn) {
    demoBtn.addEventListener("click", (e) => {
      e.preventDefault();
      submitEmail("demo");
    });
  }

  // Accessibility improvements
  if (contactEmailInput) {
    contactEmailInput.addEventListener('input', () => {
      if (emailError.style.display === 'block') {
        emailError.style.display = 'none';
      }
    });
  }
});