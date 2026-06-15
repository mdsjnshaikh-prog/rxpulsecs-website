# Phase — Public Website Interactive UI/UX Report

**Date:** 2026-06-15
**Layer:** Public website repo (`mdsjnshaikh-prog/rxpulsecs-website`) / Cloudflare Pages
**Input ZIP:** `rxpulsecs-website-phase5g-doctor-portfolio-route.zip`
**Output ZIP:** `rxpulsecs-website-interactive-uiux.zip`
**Cache-bust version applied to changed assets:** `20260615-uiux1`

This patch is limited to **public website static files only**. It does **not** modify the main app repo, the live Supabase backend, Edge Functions, DNS, email, or Cloudflare settings. The strict signup, email verification, signup completion, and password reset flows are preserved exactly. No service-role keys or secrets were added.

The site is a **pure static HTML/CSS/JS site** (no React/Vite, no `package.json`, no build step). All changes are plain ES5/ES6-compatible JavaScript and CSS that Cloudflare Pages serves as-is.

---

## 1. Files inspected

Every file in the package was inspected:

| File | Inspected | Notes |
|---|---|---|
| `index.html` | ✅ | Home page; CTAs are internal links (no JS action needed) |
| `features.html` | ✅ | Static content; no interactive actions |
| `workflow.html` | ✅ | Static content; no interactive actions |
| `pricing.html` | ✅ | Static content; no unsupported pricing claims added |
| `download.html` | ✅ | Has `mailto:` "Request early testing" button |
| `support.html` | ✅ | Has `mailto:` "Send email" button |
| `doctor-signup.html` | ✅ | Signup-start form (email + Turnstile) |
| `complete-signup.html` | ✅ | Set-password form (token-gated) |
| `forgot-password.html` | ✅ | Reset-request form (email + Turnstile) |
| `reset-password.html` | ✅ | New-password form (Supabase recovery session) |
| `signup-success.html` | ✅ | Email-confirmed landing; already has error-state JS |
| `doctors.html` | ✅ | Public doctor portfolio route shell |
| `privacy.html` / `terms.html` | ✅ | Legal pages; static |
| `404.html` | ✅ | Not-found page |
| `script.js` | ✅ | Language toggle, mobile nav, active-link |
| `auth-runtime.js` | ✅ | Signup / complete / forgot / reset handlers |
| `doctor-profile.js` | ✅ | Portfolio route logic (Phase 5G) |
| `supabase-config.js` | ✅ | Public config; verified anon key only |
| `styles.css` | ✅ | Full stylesheet (design tokens, components, states) |
| `_headers` | ✅ | CSP and security headers |
| `_redirects` | ✅ | `/doctors/*` and `/u/*` SPA rewrites |
| `robots.txt` / `sitemap.xml` / `.nojekyll` | ✅ | Static config; unchanged |

---

## 2. Files changed

### Substantive logic / style changes (4 files)
- **`doctor-profile.js`** — `+145 / −11` lines. Fetch timeout, retry button, explicit loading state, copy-profile-link with feedback.
- **`auth-runtime.js`** — `+39 / −12` lines. On-button busy states ("Sending…", "Creating account…", "Updating…") for all four auth flows, with label restore.
- **`script.js`** — `+38 / −0` lines. `mailto:` "opening email app" toast hint; language-toggle flash confirmation.
- **`styles.css`** — `+89 / −0` lines. Styles for share bar / copy feedback, mailto toast, language flash, and a `prefers-reduced-motion` block.

### Mechanical change (15 files)
- **All `*.html`** — one-line cache-bust version bump on the changed assets:
  - `styles.css` → `styles.css?v=20260615-uiux1`
  - `script.js` → `script.js?v=20260615-uiux1`
  - `auth-runtime.js?v=…` → `?v=20260615-uiux1`
  - `doctor-profile.js?v=…` → `?v=20260615-uiux1`
  - `supabase-config.js` was **left unchanged** (it was not modified, so its version is untouched).

### Files NOT changed
`supabase-config.js`, `_headers`, `_redirects`, `robots.txt`, `sitemap.xml`, `.nojekyll`, `README.md`, all prior phase reports, `INSTALLER_RELEASE_PLAN.md`. No files were deleted.

---

## 3. Summary of UI/UX improvements

The site was previously "static-feeling": tapping a button often gave no visible confirmation that anything was happening. The improvements add **clear feedback at every important interaction point** without large rewrites:

1. **On-button progress** — auth buttons now visibly change to "Sending…" / "Creating account…" / "Updating…" and back, so users on slow connections see the action is running (not just a small message box).
2. **Portfolio loading clarity** — the portfolio route now shows a spinner state at the start of every load attempt, including on retry.
3. **Network resilience** — a 15-second request timeout converts a hanging page into a clear, recoverable "Connection problem → Try again" state (critical for unstable Bangladeshi internet).
4. **Retry without reload** — failed portfolio loads offer a **Try again** button that re-runs the fetch in place.
5. **Copy / share feedback** — the portfolio page has a **Copy profile link** button with explicit "Link copied!" / "Copy failed" feedback (Clipboard API + legacy fallback).
6. **Email-app guidance** — tapping any `mailto:` link shows a brief "Opening your email app… if nothing opens, email support@rxpulsecs.com" toast, so low-tech users aren't confused when their mail client launches.
7. **Language-toggle confirmation** — a subtle flash confirms the language actually switched.
8. **Accessibility / motion** — `aria-busy` on submitting buttons, `aria-live` on feedback, and a `prefers-reduced-motion` block that disables the spinner animation and hover lift for motion-sensitive users.

All new user-facing text is **bilingual (English + Bangla)**, following the existing `data-en` / `data-bn` and `text(en, bn)` conventions already in the codebase.

---

## 4. Signup / reset / download / support action feedback improvements

### Doctor signup start (`doctor-signup.html` + `auth-runtime.js`)
- Button now shows **"Sending…" / "পাঠানো হচ্ছে…"** while the request is in flight, then restores its label.
- Message box updated to **"Sending verification email… Please wait."**
- Existing behavior preserved: double-submit guard (`signupSubmitting`), email validation, Turnstile-required check, success message, error-code branching (`account_exists`, `signup_verification_cooldown`, `account_admin_deleted`, `legacy_unconfirmed_auth_user`, `turnstile_failed`, `email_send_failed`), Turnstile reset on completion, and the click+submit dual handler for cached-mobile safety.

### Complete signup (`complete-signup.html` + `auth-runtime.js`)
- Button now shows **"Creating account…" / "অ্যাকাউন্ট তৈরি হচ্ছে…"**.
- Message updated to **"Creating your RxPulse account… Please wait."**
- Preserved: token presence/length guard (permanent disable on invalid/missing token), password length (8–128) and match validation, success redirect to `app.rxpulsecs.com`, and error-code branching.

### Forgot password (`forgot-password.html` + `auth-runtime.js`)
- Button shows **"Sending…"**; message updated to **"Sending reset link… Please wait."**
- Preserved: email validation, Turnstile-required check, neutral success message (no account enumeration), Turnstile reset.

### Reset password (`reset-password.html` + `auth-runtime.js`)
- Button shows **"Updating…"**; message updated to **"Updating password… Please wait."**
- Preserved: Supabase recovery-session detection (`PASSWORD_RECOVERY` / `exchangeCodeForSession` / `getSession`), the "checking reset link" → "session not found" timeout flow, password validation, `signOut()` after update, and the anon-key configuration guard.

### Download page (`download.html`)
- "Request early testing" `mailto:` button now triggers the **"Opening your email app…"** toast.
- "Create account first" CTA unchanged (internal link).

### Support page (`support.html`)
- "Send email" `mailto:` button now triggers the **"Opening your email app…"** toast.
- "Reset password" / "See how it works" CTAs unchanged (internal links).

> **No form values are lost on a recoverable error.** `form.reset()` is only called on the success path in all four flows; on error the user's input remains so they can correct and resubmit.

---

## 5. Public doctor portfolio route improvements (`/doctors/idDxxxxx/name-slug`)

All data is still fetched **only through the Supabase REST endpoint using the public anon key** (RLS-enforced). No service role, no write operations, no appointment form, no tracking/click counters.

- **Loading state** — `renderLoading()` shows a spinner + "Loading doctor profile… / ডাক্তারের প্রোফাইল লোড হচ্ছে…" at the start of every attempt (and on retry).
- **Request timeout** — `restFetch` now wraps `fetch` in an `AbortController` with a 15s timeout. Aborted/timed-out requests are tagged `isNetwork` so the UI can offer retry instead of hanging.
- **Network-aware error state** — connectivity/timeout failures render a **"Connection problem → Please check your internet and try again"** state with a **Try again** button; other failures render a generic error, also with retry. Both keep the **Contact support** secondary action.
- **Not-found / hidden** — preserved and clear: missing slug → "Profile not found"; unapproved/hidden/inactive-subscription → "Profile not available" with the existing explanatory bilingual copy. Profiles are only shown when `isApproved === true && approvalStatus === "approved"`.
- **Copy profile link** — new **Copy profile link / প্রোফাইল লিংক কপি করুন** button in the profile hero, using the Clipboard API with a hidden-`textarea` + `execCommand('copy')` fallback for older mobile browsers. Shows **"Link copied!"** or, if blocked, **"Copy failed. Please copy from the address bar."**
- **Dynamic chamber data preserved** — multi-chamber rendering, per-chamber weekly schedule, and active availability overrides (`today` / `tomorrow` / `date` / `date_range` / `manual`) continue to render unchanged. `display_order` sorting and chamber-specific vs. doctor-wide schedule fallback are intact.
- **5 template styles preserved** — `template1`–`template5` (Minimal Professional, Modern Glass, Premium Hospital, Personal Branding, Mobile Friendly) all render the **same information with different styles**; the new share bar appears in all five.
- **Safe links only** — `safeHttpUrl()` still restricts map links and photo URLs to `http://` / `https://`; `tel:` numbers are sanitized via `safeTel()`. All dynamic values pass through `escapeHtml` / `escapeAttr` (no raw HTML injection).

---

## 6. Mobile / responsive improvements

- **Reduced-motion support** added: spinner stops animating and button hover-lift is disabled for users with `prefers-reduced-motion: reduce`.
- **Share bar** uses `flex-wrap` so the copy button and feedback text stack gracefully on narrow phones.
- **Mailto toast** is width-constrained (`min(92vw, 460px)`), centered, fixed to the bottom, and wraps long bilingual text — readable on small phone widths.
- **Copy feedback** has a reserved `min-height` so its appearance does not cause layout shift.
- Existing responsive behavior was **not disturbed**: mobile header, hamburger menu (with close-on-navigation and Escape-to-close), cards, forms, footer, long-Bangla-text handling, long qualification/address wrapping, and the portfolio's mobile-first grid all remain as before. The version-bump-only HTML edits do not affect layout.

---

## 7. Accessibility / safety improvements

- **`aria-busy="true"`** is set on submitting auth buttons and removed when done.
- **`role="status"` + `aria-live="polite"`** on the new copy-link feedback and the mailto toast, so screen readers announce results. (Existing form-message regions already use `aria-live`.)
- **Keyboard-friendly**: the new Copy and Try-again controls are real `<button>` elements (focusable, Enter/Space activatable).
- **External links** on the portfolio (map links) keep `target="_blank" rel="noopener noreferrer"`.
- **No raw HTML injection**: all dynamic profile/chamber data continues to be escaped; the only `innerHTML` blocks use fully controlled, non-user strings.
- **No secrets / service-role keys** introduced (see §8).
- **No dangerous redirects**: the only client redirect is the existing post-signup-completion redirect to `https://app.rxpulsecs.com/#/login`, unchanged.
- **CSP unchanged and still sufficient**: the portfolio REST calls go to the already-allowlisted `connect-src https://szlmjdamoupuugldnkda.supabase.co`. The new features add **no** external scripts, styles, fonts, or network destinations, so `_headers` did not need editing.

---

## 8. Confirmation: no service-role keys / secrets were added

- Repo-wide scan for `service_role`, `service-role`, `SUPABASE_SERVICE`, `secret_key`, `TURNSTILE_SECRET`, `sk_live`, `sk_test`, `private_key`, and PEM private-key markers returned **only the two pre-existing warning comments** in `supabase-config.js` (which instruct *not* to paste such keys) — **no actual secrets**.
- `supabase-config.js` was **not modified** by this patch.
- The only Supabase key present is the **public anon JWT**; decoding its payload confirms `"role": "anon"` (not `service_role`).
- The Turnstile **site key** (public) remains in the HTML; the Turnstile **secret** is not present and must stay in Supabase Edge Function secrets only.

✅ **Confirmed: no service-role keys, API secrets, or private keys were added.**

---

## 9. Confirmation: signup / reset flows were preserved

- **Endpoints unchanged**: START / COMPLETE / FORGOT function URLs and the Supabase REST base are untouched.
- **Flow logic unchanged**: validation rules, double-submit guards, Turnstile requirement and reset, error-code branching, neutral (non-enumerating) forgot-password response, recovery-session handling, and the post-completion redirect all remain exactly as before.
- **Only additive**: the changes wrap the existing disable/enable points in a `setButtonBusy()` helper that *also* shows a label and `aria-busy`, then restores the original label. The previously permanent guard-clause disables (invalid/missing signup token, unconfigured endpoint) remain permanent.
- **Form data preserved** on recoverable errors (reset only on success).

✅ **Confirmed: public signup, email verification, signup completion, and forgot/reset flows are intact.**

---

## 10. Build / lint / typecheck results

This is a static site with **no `package.json` and no build step**, so `npm install` / `npm run build` / `npm run lint` are **not applicable** and were not run (documented per instructions). The following validations were run instead:

| Check | Tool | Result |
|---|---|---|
| JS syntax — `auth-runtime.js` | `node --check` (Node v22) | ✅ Pass |
| JS syntax — `doctor-profile.js` | `node --check` | ✅ Pass |
| JS syntax — `script.js` | `node --check` | ✅ Pass |
| JS syntax — `supabase-config.js` | `node --check` | ✅ Pass |
| HTML parse — all 15 pages | `html5lib` (Python) | ✅ All clean, 0 hard errors |
| CSS brace balance | static count | ✅ 575 `{` / 575 `}` |
| Secret/service-role scan | `grep` | ✅ None found |
| Anon-key role check | JWT decode | ✅ `role: anon` |

> No TypeScript in the project, so typecheck is N/A.

---

## 11. Manual testing checklist

Run these after deploying to a Cloudflare Pages preview (or `npx serve` locally):

**Signup start (`/doctor-signup.html`)**
- [ ] Submit with empty/invalid email → inline "valid email" error, no request sent.
- [ ] Submit without completing Turnstile → "complete the security verification".
- [ ] Valid email + Turnstile → button shows "Sending…", then success message; form clears; Turnstile resets.
- [ ] Trigger a known error code (e.g., existing account) → correct message; **email value preserved**.
- [ ] Button returns to "Send verification email" after completion.

**Complete signup (`/complete-signup.html?token=…`)**
- [ ] No/short token → error shown, button permanently disabled.
- [ ] Valid token, mismatched passwords → "Passwords do not match".
- [ ] Valid → "Creating account…" then success → redirect to app login.

**Forgot / reset**
- [ ] Forgot: valid email + Turnstile → "Sending…" → neutral success message.
- [ ] Reset: open from a real recovery email → "Reset link verified"; set new password → "Updating…" → success.
- [ ] Reset opened directly (no session) → "session not found" message after ~1.6s.

**Download / Support `mailto:`**
- [ ] Tap "Request early testing" / "Send email" → "Opening your email app…" toast appears for ~5s.

**Portfolio route (`/doctors/idDxxxxx/name-slug`)**
- [ ] Valid approved profile → spinner → profile renders in its template style.
- [ ] **Copy profile link** → "Link copied!"; pasted URL matches the page.
- [ ] Throttle network / go offline mid-load → "Connection problem" + **Try again**; restore network and retry → loads.
- [ ] Unapproved/hidden slug → "Profile not available".
- [ ] Malformed slug → "Profile not found".
- [ ] Multi-chamber doctor → all chambers, schedules, and any active override render; map link opens in a new tab.
- [ ] Verify on a real phone width (≤360px): share bar wraps, toast readable, schedule rows legible.

**Global**
- [ ] Language toggle flips EN/BN everywhere and shows the flash; choice persists on reload.
- [ ] Mobile menu opens, closes on navigation and on Escape.
- [ ] With OS "reduce motion" on, the portfolio spinner does not animate.

---

## 12. Unresolved concerns / notes

- **No live backend access in this environment.** Auth flows and the portfolio REST fetch were validated for syntax, logic, escaping, and CSP compatibility, but a real end-to-end run against Supabase should be done on a Cloudflare Pages preview before promoting to production. Use the §11 checklist.
- **Clipboard API requires a secure context.** `navigator.clipboard.writeText` only works over HTTPS (production is HTTPS, so fine). On non-secure local testing the legacy `execCommand` fallback handles it; if both fail, the user sees the "copy from the address bar" message.
- **Cache propagation.** The version bump (`?v=20260615-uiux1`) forces fresh `styles.css` / `script.js` / `auth-runtime.js` / `doctor-profile.js`. HTML pages themselves may still be edge-cached briefly; if you want instant HTML refresh, purge the Cloudflare cache after deploy (optional).
- **No design/visual regressions expected**, but a quick visual pass on the five portfolio templates is recommended since the new share bar sits in the hero of each.

---

## 13. Deployment instructions (Cloudflare Pages)

> Per instructions, **I did not deploy.** Do this yourself when ready.

**Option A — Direct upload / Git push (recommended)**
1. Confirm `supabase-config.js` still contains only the **public anon key** (it does in this package). Never paste the service-role key.
2. Commit/push the updated files to the public website repo's working branch, or upload the contents of `rxpulsecs-website-interactive-uiux.zip` to your Cloudflare Pages project.
   - Suggested branch name: `feature/interactive-uiux-feedback`
   - Suggested commit message: `Add interactive feedback: button busy states, portfolio retry/timeout/copy-link, mailto toast, a11y`
3. Cloudflare Pages will build the static project (no build command needed — it's plain static files; leave the build command empty and output directory as the repo root).
4. Verify the **preview deployment** using the §11 checklist before promoting to production.
5. Promote to production (`www.rxpulsecs.com`).

**Important Cloudflare/config notes**
- Keep `_redirects` as-is — it provides the `/doctors/*` and `/u/*` → `/doctors.html 200` rewrites that make the portfolio route work. Do **not** add clean-URL redirects (they previously caused redirect loops).
- Keep `_headers` as-is — the CSP already allowlists the Supabase origin needed by the portfolio; no header change was required by this patch.
- After deploy, optionally **purge the Cloudflare cache** so HTML pages pick up the new asset versions immediately.
- Do **not** change DNS, domain, or email settings.

---

### Patch / output summary
- **Output ZIP name:** `rxpulsecs-website-interactive-uiux.zip` (full updated site)
- **Patch file:** `rxpulsecs-uiux.patch` (unified diff vs. the input package, 713 lines)
- **Substantive files changed:** `doctor-profile.js`, `auth-runtime.js`, `script.js`, `styles.css`
- **Mechanical change:** cache-bust version bump in all 15 HTML files
- **Files added:** this report (`PHASE_PUBLIC_WEBSITE_INTERACTIVE_UIUX_REPORT.md`)
- **Files removed:** none
- **Main app repo:** not touched · **Live Supabase:** not touched · **Cloudflare deploy:** not performed
