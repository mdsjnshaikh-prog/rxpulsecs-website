import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const signupHtml = read("doctor-signup.html");
const forgotHtml = read("forgot-password.html");
const authRuntime = read("auth-runtime.js");
const recoveryRuntime = read("password-recovery-runtime.js");
const portalAdapter = read("password-recovery-portal.js");

function executePortalAdapter(search) {
  const requests = [];
  const window = {
    location: { search },
    RXPULSE_FORGOT_PASSWORD_FUNCTION: "https://example.supabase.co/functions/v1/forgot-password",
    fetch(input, init) {
      requests.push({ input, init });
      return Promise.resolve({ ok: true });
    },
  };

  vm.runInNewContext(portalAdapter, {
    Array,
    JSON,
    Object,
    URLSearchParams,
    window,
  });

  return { window, requests };
}

test("uses exact Turnstile actions required by the backend", () => {
  assert.match(signupHtml, /data-action="doctor_signup_start"/);
  assert.match(forgotHtml, /data-action="forgot_password"/);
});

test("keeps both public requests bound to their Turnstile tokens", () => {
  assert.match(authRuntime, /turnstileToken:\s*state\.signupTurnstileToken/);
  assert.match(authRuntime, /if \(!state\.signupTurnstileToken\)/);
  assert.match(recoveryRuntime, /turnstileToken:\s*state\.forgotTurnstileToken/);
  assert.match(recoveryRuntime, /if \(!state\.forgotTurnstileToken\)/);
});

test("clears token state and resets the widget after each completed request", () => {
  assert.ok((authRuntime.match(/state\.signupTurnstileToken = "";/g) || []).length >= 3);
  assert.ok((recoveryRuntime.match(/state\.forgotTurnstileToken = "";/g) || []).length >= 2);
  assert.ok((recoveryRuntime.match(/resetTurnstile\(\);/g) || []).length >= 1);
});

test("maps only the exact admin query value to the admin portal", async () => {
  const admin = executePortalAdapter("?portal=admin");
  await admin.window.fetch(admin.window.RXPULSE_FORGOT_PASSWORD_FUNCTION, {
    method: "POST",
    body: JSON.stringify({ email: "admin@example.com", portal: "doctor" }),
  });

  assert.equal(admin.window.RXPULSE_PASSWORD_RECOVERY_PORTAL, "admin");
  assert.equal(JSON.parse(admin.requests[0].init.body).portal, "admin");

  for (const search of ["", "?portal=super_admin", "?portal=ADMIN"]) {
    const doctor = executePortalAdapter(search);
    await doctor.window.fetch(doctor.window.RXPULSE_FORGOT_PASSWORD_FUNCTION, {
      method: "POST",
      body: JSON.stringify({ email: "doctor@example.com", portal: "admin" }),
    });

    assert.equal(doctor.window.RXPULSE_PASSWORD_RECOVERY_PORTAL, "doctor");
    assert.equal(JSON.parse(doctor.requests[0].init.body).portal, "doctor");
  }
});

test("does not alter unrelated fetch requests", async () => {
  const context = executePortalAdapter("?portal=admin");
  const originalBody = JSON.stringify({ portal: "doctor", value: 1 });

  await context.window.fetch("https://example.com/other", {
    method: "POST",
    body: originalBody,
  });

  assert.equal(context.requests[0].init.body, originalBody);
});

test("loads the portal adapter after the password recovery runtime", () => {
  const recoveryRuntimeIndex = forgotHtml.indexOf("/password-recovery-runtime.js?");
  const adapterIndex = forgotHtml.indexOf("/password-recovery-portal.js?");

  assert.ok(recoveryRuntimeIndex >= 0);
  assert.ok(adapterIndex > recoveryRuntimeIndex);
});

test("does not put an account email into the recovery URL", () => {
  assert.doesNotMatch(forgotHtml, /forgot-password\.html\?[^"']*email=/i);
  assert.doesNotMatch(portalAdapter, /searchParams\.set\([^)]*email/i);
});
