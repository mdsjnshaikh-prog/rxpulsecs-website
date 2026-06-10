(function () {
  const SIGNUP_ENDPOINT = window.RXPULSE_PUBLIC_SIGNUP_FUNCTION;
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
    state.forgotTurnstileToken = token || "";
  };
  window.rxpulseForgotTurnstileExpired = function () {
    state.forgotTurnstileToken = "";
  };

  function $(id) { return document.getElementById(id); }

  function setMessage(target, type, text) {
    const el = typeof target === "string" ? $(target) : target;
    if (!el) return;
    el.className = "form-message " + (type || "");
    el.textContent = text || "";
  }

  function validEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function friendlyError(error, fallback) {
    if (!error) return fallback;
    return error.message || error.error || fallback;
  }

  async function postJson(url, payload) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json().catch(function () { return {}; });

    if (!res.ok || data.success === false) {
      const detail = data.remaining_seconds ? " Please wait " + data.remaining_seconds + " seconds." : "";
      throw new Error((data.message || data.error || "Request failed.") + detail);
    }

    return data;
  }

  function resetTurnstile() {
    if (window.turnstile && typeof window.turnstile.reset === "function") {
      try { window.turnstile.reset(); } catch (_) {}
    }
  }

  function initSignup() {
    const form = $("doctor-signup-form");
    if (!form) return;

    const submit = $("signup-submit");
    const emailInput = $("signup-email");
    const passwordInput = $("signup-password");
    const confirmInput = $("signup-confirm-password");

    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      setMessage("signup-message", "", "");

      const email = (emailInput.value || "").trim();
      const password = passwordInput.value || "";
      const confirmPassword = confirmInput.value || "";

      if (!validEmail(email)) {
        setMessage("signup-message", "error", "Please enter a valid email address.");
        emailInput.focus();
        return;
      }

      if (password.length < 8) {
        setMessage("signup-message", "error", "Password must be at least 8 characters.");
        passwordInput.focus();
        return;
      }

      if (password !== confirmPassword) {
        setMessage("signup-message", "error", "Passwords do not match.");
        confirmInput.focus();
        return;
      }

      if (!state.signupTurnstileToken) {
        setMessage("signup-message", "error", "Please complete the security verification.");
        return;
      }

      submit.disabled = true;
      setMessage("signup-message", "", "Creating your account...");

      try {
        await postJson(SIGNUP_ENDPOINT, {
          email: email,
          password: password,
          turnstileToken: state.signupTurnstileToken
        });

        setMessage("signup-message", "success", "Account request accepted. Please check your email and open the verification link within 5 minutes.");
        form.reset();
        state.signupTurnstileToken = "";
        resetTurnstile();
      } catch (error) {
        setMessage("signup-message", "error", friendlyError(error, "Signup failed. Please try again or contact support."));
        state.signupTurnstileToken = "";
        resetTurnstile();
      } finally {
        submit.disabled = false;
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

      submit.disabled = true;
      setMessage("forgot-message", "", "Sending reset link...");

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
        submit.disabled = false;
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

      submit.disabled = true;
      setMessage("reset-message", "", "Updating password...");

      try {
        const result = await client.auth.updateUser({ password: password });
        if (result.error) throw result.error;
        await client.auth.signOut();
        setMessage("reset-message", "success", "Password updated successfully. Please return to the RxPulse app and log in with your new password.");
        form.reset();
      } catch (error) {
        setMessage("reset-message", "error", friendlyError(error, "Password update failed. Please request a new reset link."));
      } finally {
        submit.disabled = false;
      }
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initSignup();
    initForgotPassword();
    initResetPassword();
  });
})();
