(function () {
  const FORGOT_ENDPOINT = window.RXPULSE_FORGOT_PASSWORD_FUNCTION;

  const state = {
    forgotTurnstileToken: ""
  };

  window.rxpulseForgotTurnstileSuccess = function (token) {
    state.forgotTurnstileToken = "";
    state.forgotTurnstileToken = token || "";
  };
  window.rxpulseForgotTurnstileExpired = function () {
    state.forgotTurnstileToken = "";
  };

  function $(id) { return document.getElementById(id); }

  // Returns the currently active language ("en" or "bn").
  // Reads document.documentElement.lang which script.js keeps in sync.
  function currentLang() {
    return document.documentElement.lang === "bn" ? "bn" : "en";
  }

  function setMessage(target, type, text) {
    const el = typeof target === "string" ? $(target) : target;
    if (!el) return;
    el.className = "form-message " + (type || "");
    el.textContent = text || "";

    // Also surface final success/error/warning states as a small site toast.
    // This gives users clear feedback even when the message box is below the fold
    // on smaller phones. Loading/progress messages intentionally stay inline only.
    if (text && type && window.rxpulseShowToast) {
      window.rxpulseShowToast(text, type === "error" ? "error" : type === "warning" ? "warning" : "success", 4200);
    }
  }

  function validEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function friendlyError(error, fallback) {
    if (!error) return fallback;
    return error.message || error.error || fallback;
  }

  // postJson — POSTs JSON, returns parsed response on success.
  // On failure (HTTP error OR success===false), throws an Error.
  // The error_code from the backend is attached as `err.code` so callers
  // can branch on specific codes without parsing the message string.
  async function postJson(url, payload) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json().catch(function () { return {}; });

    if (!res.ok || data.success === false) {
      const detail = data.remaining_seconds
        ? " Please wait " + data.remaining_seconds + " seconds."
        : "";
      const err = new Error((data.message || data.error || "Request failed.") + detail);
      // Attach the structured error code so callers can handle specific cases.
      err.code = data.error_code || data.code || "";
      err.retryAfterSeconds = data.retry_after_seconds || data.remaining_seconds || 0;
      throw err;
    }

    return data;
  }

  function resetTurnstile() {
    if (window.turnstile && typeof window.turnstile.reset === "function") {
      try { window.turnstile.reset(); } catch (_) {}
    }
  }

  // setButtonBusy — shows clear progress on the button itself (not only the
  // message box) so low-tech / slow-connection users can see the action is
  // running. Stores the original label so it can be restored afterwards.
  function setButtonBusy(button, busy, busyLabel) {
    if (!button) return;
    if (busy) {
      if (!button.dataset.originalLabel) {
        button.dataset.originalLabel = button.textContent;
      }
      button.disabled = true;
      button.setAttribute("aria-busy", "true");
      if (busyLabel) button.textContent = busyLabel;
    } else {
      button.disabled = false;
      button.removeAttribute("aria-busy");
      if (button.dataset.originalLabel) {
        button.textContent = button.dataset.originalLabel;
        delete button.dataset.originalLabel;
      }
    }
  }

  // Returns the right busy label for the active language.
  function busyText(en, bn) {
    return currentLang() === "bn" ? (bn || en) : en;
  }

  function supportMailto(subject, body) {
    return "mailto:support@rxpulsecs.com" +
      "?subject=" + encodeURIComponent(subject || "RxPulse Support") +
      "&body=" + encodeURIComponent(body || "Hello RxPulse Support,\n\nI need help with my RxPulse account.\n\nThank you.");
  }

  function initForgotPassword() {
    const form = $("forgot-password-form");
    if (!form) return;

    const submit = $("forgot-submit");
    const emailInput = $("forgot-email");

    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      setMessage("forgot-message", "", "");

      const email = (emailInput.value || "").trim();

      if (!validEmail(email)) {
        setMessage("forgot-message", "error", "Please enter a valid registered email address.");
        emailInput.focus();
        return;
      }

      if (!state.forgotTurnstileToken) {
        setMessage("forgot-message", "error", "Please complete the security verification.");
        return;
      }

      setButtonBusy(submit, true, busyText("Sending...", "পাঠানো হচ্ছে..."));
      setMessage("forgot-message", "", "Sending reset link... Please wait.");

      try {
        await postJson(FORGOT_ENDPOINT, {
          email: email,
          portal: "doctor",
          turnstileToken: state.forgotTurnstileToken
        });

        setMessage("forgot-message", "success", "If this doctor account is eligible, a reset link has been sent. Please open the latest email within 5 minutes.");
        form.reset();
        state.forgotTurnstileToken = "";
        resetTurnstile();
      } catch (error) {
        setMessage("forgot-message", "error", friendlyError(error, "Unable to send reset link. Please try again later."));
        state.forgotTurnstileToken = "";
        resetTurnstile();
      } finally {
        setButtonBusy(submit, false);
      }
    });
  }

  async function initResetPassword() {
    const form = $("reset-password-form");
    if (!form) return;

    const submit = $("reset-submit");
    const passwordInput = $("new-password");
    const confirmInput = $("confirm-new-password");
    let client = null;
    let recoveryReady = false;

    function markReady(message) {
      recoveryReady = true;
      setMessage("reset-message", "success", message || "Reset link verified. Enter your new password.");
    }

    try {
      if (!window.rxpulseHasSupabaseAnonKey || !window.rxpulseHasSupabaseAnonKey()) {
        setMessage("reset-message", "error", "Reset page is not fully configured yet. Please add the Supabase public anon key in supabase-config.js.");
        return;
      }

      client = window.supabase.createClient(window.RXPULSE_SUPABASE_URL, window.RXPULSE_SUPABASE_ANON_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      });

      client.auth.onAuthStateChange(function (event, session) {
        if (event === "PASSWORD_RECOVERY" || session) {
          markReady();
        }
      });

      const searchParams = new URLSearchParams(window.location.search);
      const code = searchParams.get("code");

      if (code) {
        const result = await client.auth.exchangeCodeForSession(code);
        if (result.error) throw result.error;
        markReady();
      }

      const sessionResult = await client.auth.getSession();
      if (sessionResult && sessionResult.data && sessionResult.data.session) {
        markReady();
      }

      if (!recoveryReady) {
        setMessage("reset-message", "", "Checking reset link...");
        setTimeout(function () {
          if (!recoveryReady) {
            setMessage("reset-message", "error", "Reset session not found. Please open this page from the latest RxPulse reset email.");
          }
        }, 1600);
      }
    } catch (error) {
      setMessage("reset-message", "error", friendlyError(error, "Reset link could not be verified. Please request a new link."));
    }

    form.addEventListener("submit", async function (event) {
      event.preventDefault();

      const password = passwordInput.value || "";
      const confirmPassword = confirmInput.value || "";

      if (!client || !recoveryReady) {
        setMessage("reset-message", "error", "Reset link is not verified. Please open the latest reset email link again.");
        return;
      }

      if (password.length < 8) {
        setMessage("reset-message", "error", "Password must be at least 8 characters.");
        passwordInput.focus();
        return;
      }

      if (password !== confirmPassword) {
        setMessage("reset-message", "error", "Passwords do not match.");
        confirmInput.focus();
        return;
      }

      setButtonBusy(submit, true, busyText("Updating...", "আপডেট হচ্ছে..."));
      setMessage("reset-message", "", "Updating password... Please wait.");

      try {
        const result = await client.auth.updateUser({ password: password });
        if (result.error) throw result.error;
        await client.auth.signOut();
        setMessage("reset-message", "success", "Password updated successfully. Please return to the RxPulse Windows desktop app and log in with your new password.");
        form.reset();
      } catch (error) {
        setMessage("reset-message", "error", friendlyError(error, "Password update failed. Please request a new reset link."));
      } finally {
        setButtonBusy(submit, false);
      }
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initForgotPassword();
    initResetPassword();
  });
})();