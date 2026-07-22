import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const signupHtml = read("doctor-signup.html");
const forgotHtml = read("forgot-password.html");
const authRuntime = read("auth-runtime.js");
const portalAdapter = read("password-recovery-portal.js");

test("uses exact Turnstile actions required by the backend", () => {
  assert.match(signupHtml, /data-action="doctor_signup_start"/);
  assert.match(forgotHtml, /data-action="forgot_password"/);
});

test("keeps both public requests bound to their Turnstile tokens", () => {
  assert.match(authRuntime, /turnstileToken:\s*state\.signupTurnstileToken/);
  assert.match(authRuntime, /turnstileToken:\s*state\.forgotTurnstileToken/);
  assert.match(authRuntime, /if \(!state\.signupTurnstileToken\)/);
  assert.match(authRuntime, /if \(!state\.forgotTurnstileToken\)/);
});

test("clears token state and resets the widget after each completed request", () => {
  assert.ok((authRuntime.match(/state\.signupTurnstileToken = "";/g) || []).length >= 3);
  assert.ok((authRuntime.match(/state\.forgotTurnstileToken = "";/g) || []).length >= 4);
  assert.ok((authRuntime.match(/resetTurnstile\(\);/g) || []).length >= 4);
});

test("allows only the exact admin portal query value", () => {
  assert.match(
    portalAdapter,
    /requestedPortal === "admin" \? "admin" : "doctor"/,
  );
  assert.doesNotMatch(portalAdapter, /email/i);
});

test("changes only the forgot-password endpoint JSON request", () => {
  assert.match(portalAdapter, /requestUrl === forgotEndpoint/);
  assert.match(portalAdapter, /typeof init\.body === "string"/);
  assert.match(portalAdapter, /payload\.portal = recoveryPortal/);
  assert.match(portalAdapter, /originalFetch\.call\(this, input, init\)/);
});

test("loads the portal adapter after the existing auth runtime", () => {
  const authRuntimeIndex = forgotHtml.indexOf("/auth-runtime.js?");
  const adapterIndex = forgotHtml.indexOf("/password-recovery-portal.js?");

  assert.ok(authRuntimeIndex >= 0);
  assert.ok(adapterIndex > authRuntimeIndex);
});

test("does not put an account email into the recovery URL", () => {
  assert.doesNotMatch(forgotHtml, /forgot-password\.html\?[^"']*email=/i);
  assert.doesNotMatch(portalAdapter, /searchParams\.set\([^)]*email/i);
});
