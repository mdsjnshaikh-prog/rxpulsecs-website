(function () {
  const FORGOT_ENDPOINT = window.RXPULSE_FORGOT_PASSWORD_FUNCTION;
  const state = { forgotTurnstileToken: "" };

  window.rxpulseForgotTurnstileSuccess = function (token) {
    state.forgotTurnstileToken = token || "";
  };

  window.rxpulseForgotTurnstileExpired = function () {
    state.forgotTurnstileToken = "";
  };

  function $(id) {
    return document.getElementById(id);
  }

  function currentLang() {
    return document.documentElement.lang === "bn" ? "bn" : "en";
  }

  function busyText(en, bn) {
    return currentLang() === "bn" ? (bn || en) : en;
  }

  function setMessage(target, type, text) {
    const el = typeof target === "string" ? $(target) : target;
    if (!el) return;
    el.className = "form-message " + (type || "");
    el.textContent = text || "";

    if (text && type && window.rxpulseShowToast) {
      window.rxpulseShowToast(
        text,
        type === "error" ? "error" : type === "warning" ? "warning" : "success",
        4200
      );
    }
  }

  function setButtonBusy(button, busy, busyLabel) {
    if (!button) return;
    if (busy) {
      if (!button.dataset.originalLabel) button.dataset.originalLabel = button.textContent;
      button.disabled = true;
      button.setAttribute("aria-busy", "true");
      if (busyLabel) button.textContent = busyLabel;
      return;
    }

    button.disabled = false;
    button.removeAttribute("aria-busy");
    if (button.dataset.originalLabel) {
      button.textContent = button.dataset.originalLabel;
      delete button.dataset.originalLabel;
    }
  }

  function validEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function resetTurnstile() {
    if (window.turnstile && typeof window.turnstile.reset === "function") {
      try { window.turnstile.reset(); } catch (_) {}
    }
  }

  function requestReference(data) {
    if (!data || typeof data !== "object") return "";
    return String(data.request_id || data.requestId || data.correlation_id || data.correlationId || "").trim();
  }

  async function postJson(url, payload) {
    let response;
    try {
      response = await window.fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    } catch (_) {
      const transportError = new Error("Password reset transport failure");
      transportError.code = "transport_error";
      throw transportError;
    }

    const data = await response.json().catch(function () { return {}; });
    if (!response.ok || data.success === false) {
      const error = new Error("Password reset request failed");
      error.code = data.error_code || data.code || "request_failed";
      error.retryAfterSeconds = data.retry_after_seconds || data.remaining_seconds || 0;
      error.requestReference = requestReference(data);
      throw error;
    }

    return data;
  }

  function withRequestReference(message, error) {
    return error && error.requestReference
      ? message + " Reference: " + error.requestReference + "."
      : message;
  }

  function forgotPasswordErrorMessage(error) {
    const code = error && error.code;
    switch (code) {
      case "transport_error":
        return "The reset service could not return a response. Check your connection and try once more. If the problem continues, contact RxPulse support.";
      case "turnstile_failed":
        return "Security verification failed. Please complete the security check again.";
      case "turnstile_unavailable":
        return "Security verification is temporarily unavailable. Please try again.";
      case "frequent_request_blocked":
        return "Too many reset requests. Please try again later.";
      case "rate_limit_cooldown":
        return "Please wait before requesting another reset link.";
      case "invalid_email":
      case "email_required":
        return "Please enter a valid registered email address.";
      case "server_configuration_error":
        return withRequestReference("The reset service is temporarily unavailable. Please try again later or contact RxPulse support.", error);
      default:
        return withRequestReference("Unable to send the reset link. Please try again later or contact RxPulse support.", error);
    }
  }

  function initForgotPassword() {
    const form = $("forgot-password-form");
    if (!form) return;

    const submit = $("forgot-submit");
    const emailInput = $("forgot-email");
    let submitting = false;

    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      if (submitting) return;
      setMessage("forgot-message", "", "");

      if (!FORGOT_ENDPOINT) {
        setMessage("forgot-message", "error", "Password reset is not configured. Please contact RxPulse support.");
        return;
      }

      const email = (emailInput && emailInput.value ? emailInput.value : "").trim();
      if (!validEmail(email)) {
        setMessage("forgot-message", "error", "Please enter a valid registered email address.");
        if (emailInput) emailInput.focus();
        return;
      }

      if (!state.forgotTurnstileToken) {
        setMessage("forgot-message", "error", "Please complete the security verification.");
        return;
      }

      submitting = true;
      setButtonBusy(submit, true, busyText("Sending...", "পাঠানো হচ্ছে..."));
      setMessage("forgot-message", "", "Sending reset link... Please wait.");

      try {
        await postJson(FORGOT_ENDPOINT, {
          email: email,
          portal: window.RXPULSE_PASSWORD_RECOVERY_PORTAL === "admin" ? "admin" : "doctor",
          turnstileToken: state.forgotTurnstileToken
        });

        setMessage(
          "forgot-message",
          "success",
          "If this account is eligible, a reset link has been sent. Please open the latest email within 5 minutes."
        );
        form.reset();
      } catch (error) {
        setMessage("forgot-message", "error", forgotPasswordErrorMessage(error));
      } finally {
        state.forgotTurnstileToken = "";
        resetTurnstile();
        submitting = false;
        setButtonBusy(submit, false);
      }
    });
  }

  function safeResetVerificationMessage() {
    return "Reset link could not be verified. Please request a new link and use the latest email.";
  }

  function clearRecoveryLocation() {
    if (!window.history || typeof window.history.replaceState !== "function") return;
    const cleanPath = window.location.pathname || "/reset-password.html";
    window.history.replaceState({}, document.title, cleanPath);
  }

  async function initResetPassword() {
    const form = $("reset-password-form");
    if (!form) return;

    const submit = $("reset-submit");
    const passwordInput = $("new-password");
    const confirmInput = $("confirm-new-password");
    let client = null;
    let recoveryReady = false;

    function setFormEnabled(enabled) {
      if (passwordInput) passwordInput.disabled = !enabled;
      if (confirmInput) confirmInput.disabled = !enabled;
      if (submit) submit.disabled = !enabled;
    }

    function markReady(message) {
      recoveryReady = true;
      setFormEnabled(true);
      setMessage("reset-message", "success", message || "Reset link verified. Enter your new password.");
    }

    setFormEnabled(false);

    try {
      if (!window.rxpulseHasSupabaseAnonKey || !window.rxpulseHasSupabaseAnonKey()) {
        setMessage("reset-message", "error", "Reset page is not fully configured. Please contact RxPulse support.");
        return;
      }

      client = window.supabase.createClient(
        window.RXPULSE_SUPABASE_URL,
        window.RXPULSE_SUPABASE_ANON_KEY,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: true
          }
        }
      );

      client.auth.onAuthStateChange(function (event, session) {
        if (event === "PASSWORD_RECOVERY" && session) markReady();
      });

      const searchParams = new URLSearchParams(window.location.search);
      const code = (searchParams.get("code") || "").trim();

      if (code) {
        const result = await client.auth.exchangeCodeForSession(code);
        if (result.error || !result.data || !result.data.session) {
          throw result.error || new Error("Recovery session was not created");
        }
        markReady();
      }

      if (!recoveryReady) {
        setMessage("reset-message", "", "Checking reset link...");
        window.setTimeout(function () {
          if (!recoveryReady) {
            setFormEnabled(false);
            setMessage("reset-message", "error", "Reset session not found. Please open this page from the latest RxPulse reset email.");
          }
        }, 1600);
      }
    } catch (_) {
      recoveryReady = false;
      setFormEnabled(false);
      setMessage("reset-message", "error", safeResetVerificationMessage());
    }

    form.addEventListener("submit", async function (event) {
      event.preventDefault();

      const password = passwordInput && passwordInput.value ? passwordInput.value : "";
      const confirmPassword = confirmInput && confirmInput.value ? confirmInput.value : "";

      if (!client || !recoveryReady) {
        setFormEnabled(false);
        setMessage("reset-message", "error", "Reset link is not verified. Please open the latest reset email link again.");
        return;
      }

      if (password.length < 8) {
        setMessage("reset-message", "error", "Password must be at least 8 characters.");
        if (passwordInput) passwordInput.focus();
        return;
      }

      if (password !== confirmPassword) {
        setMessage("reset-message", "error", "Passwords do not match.");
        if (confirmInput) confirmInput.focus();
        return;
      }

      setButtonBusy(submit, true, busyText("Updating...", "আপডেট হচ্ছে..."));
      setMessage("reset-message", "", "Updating password... Please wait.");

      try {
        const result = await client.auth.updateUser({ password: password });
        if (result.error) throw result.error;

        await client.auth.signOut({ scope: "local" });
        recoveryReady = false;
        form.reset();
        clearRecoveryLocation();
        setMessage(
          "reset-message",
          "success",
          "Password updated successfully. Please return to the RxPulse Windows desktop app and log in with your new password."
        );
      } catch (_) {
        setMessage("reset-message", "error", "Password update failed. Please request a new reset link and try again.");
      } finally {
        setButtonBusy(submit, false);
        setFormEnabled(recoveryReady);
      }
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initForgotPassword();
    initResetPassword();
  });
})();
