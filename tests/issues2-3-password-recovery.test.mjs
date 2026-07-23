import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const runtime = fs.readFileSync(new URL("../password-recovery-runtime.js", import.meta.url), "utf8");

function element(id, initial = {}) {
  const listeners = new Map();
  return {
    id,
    value: "",
    disabled: false,
    className: "",
    textContent: initial.textContent || "",
    dataset: {},
    focused: false,
    resetCount: 0,
    addEventListener(type, handler) {
      const list = listeners.get(type) || [];
      list.push(handler);
      listeners.set(type, list);
    },
    setAttribute(name, value) {
      this[name] = String(value);
    },
    removeAttribute(name) {
      delete this[name];
    },
    focus() {
      this.focused = true;
    },
    reset() {
      this.resetCount += 1;
    },
    async dispatch(type) {
      const handlers = listeners.get(type) || [];
      for (const handler of handlers) {
        await handler({ preventDefault() {} });
      }
    }
  };
}

function createHarness({
  mode,
  search = "",
  fetchImpl,
  exchangeImpl,
  updateImpl,
  signOutImpl
}) {
  const elements = {};
  if (mode === "forgot") {
    elements["forgot-password-form"] = element("forgot-password-form");
    elements["forgot-submit"] = element("forgot-submit", { textContent: "Send reset email" });
    elements["forgot-email"] = element("forgot-email");
    elements["forgot-message"] = element("forgot-message");
  } else {
    elements["reset-password-form"] = element("reset-password-form");
    elements["reset-submit"] = element("reset-submit", { textContent: "Update password" });
    elements["new-password"] = element("new-password");
    elements["confirm-new-password"] = element("confirm-new-password");
    elements["reset-message"] = element("reset-message");
  }

  const documentListeners = new Map();
  const timers = [];
  const historyCalls = [];
  const auth = {
    stateChangeHandler: null,
    onAuthStateChange(handler) {
      this.stateChangeHandler = handler;
      return { data: { subscription: { unsubscribe() {} } } };
    },
    exchangeCodeForSession: exchangeImpl || (async () => ({ data: { session: null }, error: null })),
    updateUser: updateImpl || (async () => ({ error: null })),
    signOut: signOutImpl || (async () => ({ error: null }))
  };
  let clientOptions = null;
  let turnstileResetCount = 0;
  let fetchCount = 0;

  const document = {
    title: "Reset Password",
    documentElement: { lang: "en" },
    getElementById(id) {
      return elements[id] || null;
    },
    addEventListener(type, handler) {
      const list = documentListeners.get(type) || [];
      list.push(handler);
      documentListeners.set(type, list);
    }
  };

  const window = {
    RXPULSE_FORGOT_PASSWORD_FUNCTION: "https://example.test/forgot-password",
    RXPULSE_SUPABASE_URL: "https://example.supabase.co",
    RXPULSE_SUPABASE_ANON_KEY: "anon-key",
    RXPULSE_PASSWORD_RECOVERY_PORTAL: "doctor",
    rxpulseHasSupabaseAnonKey: () => true,
    location: {
      search,
      pathname: "/reset-password.html",
      hash: "#access_token=secret"
    },
    history: {
      replaceState(...args) {
        historyCalls.push(args);
      }
    },
    turnstile: {
      reset() {
        turnstileResetCount += 1;
      }
    },
    supabase: {
      createClient(_url, _key, options) {
        clientOptions = options;
        return { auth };
      }
    },
    async fetch(...args) {
      fetchCount += 1;
      return fetchImpl(...args);
    },
    setTimeout(callback) {
      timers.push(callback);
      return timers.length;
    }
  };

  vm.runInNewContext(runtime, {
    console,
    document,
    window,
    URLSearchParams,
    JSON,
    Error,
    String,
    Object,
    Promise
  });

  async function domReady() {
    for (const handler of documentListeners.get("DOMContentLoaded") || []) {
      await handler();
    }
    await Promise.resolve();
    await Promise.resolve();
  }

  return {
    auth,
    clientOptions: () => clientOptions,
    domReady,
    elements,
    fetchCount: () => fetchCount,
    historyCalls,
    runTimers() {
      while (timers.length) timers.shift()();
    },
    turnstileResetCount: () => turnstileResetCount,
    window
  };
}

test("native fetch rejection is neutral and cleanup runs exactly once", async () => {
  const harness = createHarness({
    mode: "forgot",
    fetchImpl: async () => { throw new Error("Failed to fetch"); }
  });
  await harness.domReady();

  harness.elements["forgot-email"].value = "doctor@example.com";
  harness.window.rxpulseForgotTurnstileSuccess("token-1");
  await harness.elements["forgot-password-form"].dispatch("submit");

  const message = harness.elements["forgot-message"].textContent;
  assert.match(message, /could not return a response/i);
  assert.doesNotMatch(message, /failed to fetch/i);
  assert.equal(harness.turnstileResetCount(), 1);
  assert.equal(harness.elements["forgot-submit"].disabled, false);

  await harness.elements["forgot-password-form"].dispatch("submit");
  assert.equal(harness.fetchCount(), 1, "cleared Turnstile token must prevent an immediate second request");
  assert.match(harness.elements["forgot-message"].textContent, /complete the security verification/i);
});

test("structured 429 remains a safe actionable message", async () => {
  const harness = createHarness({
    mode: "forgot",
    fetchImpl: async () => ({
      ok: false,
      json: async () => ({
        success: false,
        error_code: "rate_limit_cooldown",
        message: "provider raw detail that must not be copied"
      })
    })
  });
  await harness.domReady();

  harness.elements["forgot-email"].value = "doctor@example.com";
  harness.window.rxpulseForgotTurnstileSuccess("token-2");
  await harness.elements["forgot-password-form"].dispatch("submit");

  assert.equal(harness.elements["forgot-message"].textContent, "Please wait before requesting another reset link.");
  assert.equal(harness.turnstileResetCount(), 1);
  assert.equal(harness.elements["forgot-submit"].disabled, false);
});

test("reset client is isolated and unrelated sessions never enable the form", async () => {
  const harness = createHarness({ mode: "reset", fetchImpl: async () => ({ ok: true, json: async () => ({}) }) });
  await harness.domReady();

  assert.equal(harness.clientOptions().auth.persistSession, false);
  assert.equal(harness.clientOptions().auth.autoRefreshToken, false);
  assert.equal(harness.clientOptions().auth.detectSessionInUrl, true);
  assert.equal(harness.elements["new-password"].disabled, true);
  assert.equal(harness.elements["reset-submit"].disabled, true);

  harness.auth.stateChangeHandler("SIGNED_IN", { user: { id: "unrelated" } });
  assert.equal(harness.elements["new-password"].disabled, true);
  assert.equal(harness.elements["reset-submit"].disabled, true);
});

test("PASSWORD_RECOVERY event enables the reset form", async () => {
  const harness = createHarness({ mode: "reset", fetchImpl: async () => ({ ok: true, json: async () => ({}) }) });
  await harness.domReady();

  harness.auth.stateChangeHandler("PASSWORD_RECOVERY", { user: { id: "recovery-user" } });
  assert.equal(harness.elements["new-password"].disabled, false);
  assert.equal(harness.elements["confirm-new-password"].disabled, false);
  assert.equal(harness.elements["reset-submit"].disabled, false);
});

test("successful current-URL code exchange enables the reset form", async () => {
  const harness = createHarness({
    mode: "reset",
    search: "?code=current-code",
    fetchImpl: async () => ({ ok: true, json: async () => ({}) }),
    exchangeImpl: async (code) => {
      assert.equal(code, "current-code");
      return { data: { session: { user: { id: "code-user" } } }, error: null };
    }
  });
  await harness.domReady();

  assert.equal(harness.elements["new-password"].disabled, false);
  assert.equal(harness.elements["reset-submit"].disabled, false);
});

test("failed code exchange leaves the reset form disabled", async () => {
  const harness = createHarness({
    mode: "reset",
    search: "?code=expired-code",
    fetchImpl: async () => ({ ok: true, json: async () => ({}) }),
    exchangeImpl: async () => ({ data: { session: null }, error: new Error("provider detail") })
  });
  await harness.domReady();

  assert.equal(harness.elements["new-password"].disabled, true);
  assert.equal(harness.elements["reset-submit"].disabled, true);
  assert.match(harness.elements["reset-message"].textContent, /could not be verified/i);
  assert.doesNotMatch(harness.elements["reset-message"].textContent, /provider detail/i);
});

test("missing recovery context stays disabled after verification wait", async () => {
  const harness = createHarness({ mode: "reset", fetchImpl: async () => ({ ok: true, json: async () => ({}) }) });
  await harness.domReady();
  harness.runTimers();

  assert.equal(harness.elements["reset-submit"].disabled, true);
  assert.match(harness.elements["reset-message"].textContent, /reset session not found/i);
});

test("successful password update clears local recovery state and URL", async () => {
  const signOutCalls = [];
  const harness = createHarness({
    mode: "reset",
    search: "?code=valid-code&other=value",
    fetchImpl: async () => ({ ok: true, json: async () => ({}) }),
    exchangeImpl: async () => ({ data: { session: { user: { id: "code-user" } } }, error: null }),
    updateImpl: async ({ password }) => {
      assert.equal(password, "new-password-123");
      return { error: null };
    },
    signOutImpl: async (options) => {
      signOutCalls.push(options);
      return { error: null };
    }
  });
  await harness.domReady();

  harness.elements["new-password"].value = "new-password-123";
  harness.elements["confirm-new-password"].value = "new-password-123";
  await harness.elements["reset-password-form"].dispatch("submit");

  assert.equal(signOutCalls.length, 1);
  assert.equal(signOutCalls[0].scope, "local");
  assert.equal(harness.historyCalls.length, 1);
  assert.equal(harness.historyCalls[0][2], "/reset-password.html");
  assert.equal(harness.elements["reset-submit"].disabled, true);
  assert.equal(harness.elements["new-password"].disabled, true);
  assert.match(harness.elements["reset-message"].textContent, /updated successfully/i);
});
