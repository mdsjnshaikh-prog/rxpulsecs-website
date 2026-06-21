(function () {
  const SIGNUP_START_ENDPOINT = window.RXPULSE_PUBLIC_SIGNUP_START_FUNCTION || window.RXPULSE_PUBLIC_SIGNUP_FUNCTION;
  const SIGNUP_COMPLETE_ENDPOINT = window.RXPULSE_PUBLIC_SIGNUP_COMPLETE_FUNCTION;
  const FORGOT_ENDPOINT = window.RXPULSE_FORGOT_PASSWORD_FUNCTION;

  const state = {
    signupTurnstileToken: "",
    forgotTurnstileToken: ""
  };

  window.rxpulseSignupTurnstileSuccess = function (token) {
    state.signupTurnstileToken = token || "";
  };
  window.rxpulseSignupTurnstileExpired = function () {
    state.signupTurnstileToken = "";
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

  // Sets a rich warning message with a "Contact Support" CTA.
  // Used for generic account-unavailable signup cases only. Content is fully
  // controlled here (no user input interpolated into HTML), so innerHTML is safe.
  function showAccountUnavailableBlock(messageId) {
    var el = $(messageId);
    if (!el) return;

    var lang = currentLang();

    var heading = lang === "bn"
      ? "অ্যাকাউন্ট তৈরি করা যাচ্ছে না"
      : "Account unavailable";

    var body = lang === "bn"
      ? "এই ইমেইল দিয়ে নতুন অ্যাকাউন্ট তৈরি করা যাচ্ছে না। সহায়তার জন্য RxPulse সাপোর্টে যোগাযোগ করুন।"
      : "This email cannot be used to create a new account. Please contact RxPulse support for help.";

    var btnText = lang === "bn"
      ? "সাপোর্টে যোগাযোগ করুন"
      : "Contact Support";

    var mailtoHref = supportMailto(
      "RxPulse Account Support Request",
      "Hello RxPulse Support,\n\nI am trying to create a RxPulse doctor account, but the signup page says this email cannot be used to create a new account.\n\nPlease help me understand my options.\n\nThank you."
    );

    el.className = "form-message warning";
    el.innerHTML =
      "<strong>" + heading + "</strong>" +
      "<p style=\"margin:6px 0 12px;font-weight:400;font-size:0.92em;\">" + body + "</p>" +
      "<a href=\"" + mailtoHref + "\" " +
        "style=\"display:inline-block;background:#b45309;color:#fff;padding:8px 18px;" +
        "border-radius:9999px;font-size:0.85rem;font-weight:700;text-decoration:none;" +
        "letter-spacing:0.01em;\">" + btnText + "</a>";
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

  function signupErrorMessage(error) {
    var code = error && error.code;
    var waitText = error && error.retryAfterSeconds
      ? " Please try again after " + Math.ceil(error.retryAfterSeconds / 60) + " minute(s)."
      : "";

    switch (code) {
      case "signup_verification_cooldown":
        return "A verification email was sent recently. Please check your inbox/spam folder." + waitText;
      case "account_exists":
        return "This email already has an account. Please log in from the RxPulse app or reset your password.";
      case "legacy_unconfirmed_auth_user":
        return "This signup needs support review. Please contact RxPulse support.";
      case "turnstile_failed":
        return "Security verification failed. Please complete the security check again.";
      case "account_unavailable":
      case "account_admin_deleted":
        return "This email cannot be used to create a new account. Please contact support.";
      case "email_send_failed":
        return "Could not send the verification email. Please try again later.";
      default:
        return friendlyError(error, "Signup could not be started. Please try again or contact support.");
    }
  }

  function initSignup() {
    const form = $("doctor-signup-form");
    if (!form) return;

    const submit = $("signup-submit");
    const emailInput = $("signup-email");
    let signupSubmitting = false;

    async function handleSignupStart(event) {
      if (event && typeof event.preventDefault === "function") event.preventDefault();
      if (signupSubmitting) return;

      setMessage("signup-message", "", "");

      if (!SIGNUP_START_ENDPOINT) {
        setMessage("signup-message", "error", "Signup is not configured. Please contact support.");
        return;
      }

      const email = (emailInput && emailInput.value ? emailInput.value : "").trim();

      if (!validEmail(email)) {
        setMessage("signup-message", "error", "Please enter a valid email address.");
        if (emailInput) emailInput.focus();
        return;
      }

      if (!state.signupTurnstileToken) {
        setMessage("signup-message", "error", "Please complete the security verification.");
        return;
      }

      signupSubmitting = true;
      setButtonBusy(submit, true, busyText("Sending...", "পাঠানো হচ্ছে..."));
      setMessage("signup-message", "", "Sending verification email... Please wait.");

      try {
        const data = await postJson(SIGNUP_START_ENDPOINT, {
          email: email,
          turnstileToken: state.signupTurnstileToken
        });

        setMessage(
          "signup-message",
          "success",
          data && data.message
            ? data.message
            : "Please check your email. The signup verification link is valid for 5 minutes."
        );
        form.reset();
        state.signupTurnstileToken = "";
        resetTurnstile();

      } catch (error) {
        if (error.code === "account_unavailable" || error.code === "account_admin_deleted") {
          showAccountUnavailableBlock("signup-message");
        } else if (error.code === "legacy_unconfirmed_auth_user") {
          const messageEl = $("signup-message");
          setMessage(messageEl, "warning", signupErrorMessage(error));
        } else {
          setMessage("signup-message", "error", signupErrorMessage(error));
        }

        state.signupTurnstileToken = "";
        resetTurnstile();
      } finally {
        signupSubmitting = false;
        setButtonBusy(submit, false);
      }
    }

    form.addEventListener("submit", handleSignupStart);

    // Mobile/browser-cache safety: some browsers keep an older cached JS handler
    // or fail to submit when a security widget is focused. A direct click listener
    // ensures the visible button always triggers the same guarded request.
    if (submit) {
      submit.addEventListener("click", handleSignupStart);
    }
  }

  function initCompleteSignup() {
    const form = $("complete-signup-form");
    if (!form) return;

    const submit = $("complete-submit");
    const passwordInput = $("complete-password");
    const confirmInput = $("complete-confirm-password");
    const params = new URLSearchParams(window.location.search);
    const token = (params.get("token") || "").trim();

    if (!SIGNUP_COMPLETE_ENDPOINT) {
      setMessage("complete-message", "error", "Signup completion is not configured. Please contact support.");
      if (submit) submit.disabled = true;
      return;
    }

    if (!token || token.length < 32) {
      setMessage("complete-message", "error", "This signup link is invalid or expired. Please start signup again.");
      if (submit) submit.disabled = true;
      return;
    }

    setMessage("complete-message", "success", "Email verification link detected. Please set your password within 5 minutes of receiving the email.");

    form.addEventListener("submit", async function (event) {
      event.preventDefault();

      const password = passwordInput.value || "";
      const confirmPassword = confirmInput.value || "";

      if (password.length < 8) {
        setMessage("complete-message", "error", "Password must be at least 8 characters.");
        passwordInput.focus();
        return;
      }

      if (password.length > 128) {
        setMessage("complete-message", "error", "Password is too long. Please use 128 characters or fewer.");
        passwordInput.focus();
        return;
      }

      if (password !== confirmPassword) {
        setMessage("complete-message", "error", "Passwords do not match.");
        confirmInput.focus();
        return;
      }

      setButtonBusy(submit, true, busyText("Creating account...", "অ্যাকাউন্ট তৈরি হচ্ছে..."));
      setMessage("complete-message", "", "Creating your RxPulse account... Please wait.");

      try {
        const data = await postJson(SIGNUP_COMPLETE_ENDPOINT, {
          token: token,
          password: password
        });

        setMessage(
          "complete-message",
          "success",
          data && data.message
            ? data.message
            : "Your account has been created. Please log in to complete your doctor profile."
        );
        form.reset();
        setTimeout(function () {
          window.location.href = "https://app.rxpulsecs.com/#/login";
        }, 2200);
      } catch (error) {
        var code = error && error.code;
        if (code === "invalid_or_expired_token") {
          setMessage("complete-message", "error", "This signup link is invalid or expired. Please start signup again from the doctor signup page.");
        } else if (code === "account_exists") {
          setMessage("complete-message", "error", "This email already has an account. Please log in or reset your password.");
        } else if (code === "legacy_unconfirmed_auth_user" || code === "account_unavailable" || code === "account_admin_deleted") {
          setMessage("complete-message", "warning", friendlyError(error, "This signup needs support review. Please contact support."));
        } else {
          setMessage("complete-message", "error", friendlyError(error, "Account creation failed. Please try again or contact support."));
        }
      } finally {
        setButtonBusy(submit, false);
      }
    });
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
        setMessage("reset-message", "success", "Password updated successfully. Please return to the RxPulse app and log in with your new password.");
        form.reset();
      } catch (error) {
        setMessage("reset-message", "error", friendlyError(error, "Password update failed. Please request a new reset link."));
      } finally {
        setButtonBusy(submit, false);
      }
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initSignup();
    initCompleteSignup();
    initForgotPassword();
    initResetPassword();
  });
})();
