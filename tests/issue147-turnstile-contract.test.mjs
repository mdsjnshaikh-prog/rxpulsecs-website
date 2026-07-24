import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const signupHtml = read("doctor-signup.html");
const completeSignupHtml = read("complete-signup.html");
const forgotHtml = read("forgot-password.html");
const indexHtml = read("index.html");
const workflowHtml = read("workflow.html");
const downloadHtml = read("download.html");
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

test("keeps signup pages retired while preserving forgot-password Turnstile action", () => {
  assert.doesNotMatch(signupHtml, /<form\b/i);
  assert.doesNotMatch(signupHtml, /type="email"/i);
  assert.doesNotMatch(signupHtml, new RegExp(["cf-turnstile", "doctor_" + "signup_start", "rxpulse" + "SignupTurnstile"].join("|"), "i"));
  assert.doesNotMatch(completeSignupHtml, new RegExp(["<form\\b", "type=\"password\"", "complete-" + "signup-form"].join("|"), "i"));
  assert.match(forgotHtml, /data-action="forgot_password"/);
});

test("removes browser signup requests while keeping recovery requests bound to Turnstile tokens", () => {
  assert.doesNotMatch(authRuntime, new RegExp(["RXPULSE_PUBLIC_" + "SIGNUP", "public-doctor-" + "signup", "SIGNUP_" + "START_ENDPOINT", "SIGNUP_" + "COMPLETE_ENDPOINT"].join("|")));
  assert.doesNotMatch(authRuntime, new RegExp(["doctor-" + "signup-form", "complete-" + "signup-form", "signup" + "TurnstileToken", "rxpulse" + "SignupTurnstile"].join("|")));
  assert.match(recoveryRuntime, /turnstileToken:\s*state\.forgotTurnstileToken/);
  assert.match(recoveryRuntime, /if \(!state\.forgotTurnstileToken\)/);
});

test("keeps desktop onboarding copy aligned and non-circular", () => {
  const retiredSignupLinkCopy = /verification link|open the link|link খুলুন|verification link খুলে/i;

  assert.doesNotMatch(indexHtml, retiredSignupLinkCopy);
  assert.doesNotMatch(workflowHtml, retiredSignupLinkCopy);

  const downloadStep = workflowHtml.indexOf('data-en="Download and install RxPulse"');
  const emailStep = workflowHtml.indexOf('data-en="Open the app and enter email"');
  const codeStep = workflowHtml.indexOf('data-en="Enter six-digit code"');
  const passwordStep = workflowHtml.indexOf('data-en="Create password"');
  const approvalStep = workflowHtml.indexOf('data-en="Submit for administrator approval"');

  assert.ok(downloadStep >= 0);
  assert.ok(downloadStep < emailStep);
  assert.ok(emailStep < codeStep);
  assert.ok(codeStep < passwordStep);
  assert.ok(passwordStep < approvalStep);

  assert.match(downloadHtml, /prospective and existing doctors by request/i);
  assert.match(downloadHtml, /email you intend to use for your RxPulse account/i);
  assert.doesNotMatch(downloadHtml, /Access mode: approved doctors by request/i);
  assert.doesNotMatch(downloadHtml, /request access from your registered email/i);
  assert.match(downloadHtml, /clinical access remains unavailable until professional profile review and administrator approval/i);
});

test("clears recovery token state and resets the widget after each completed recovery request", () => {
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