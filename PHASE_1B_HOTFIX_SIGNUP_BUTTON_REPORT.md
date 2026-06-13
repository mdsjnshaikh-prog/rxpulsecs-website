# Phase 1B Hotfix Report — Public Signup Button No-Response

## Layer
Public website repo / Cloudflare Pages ZIP only.

## Problem observed
On `rxpulsecs.com/doctor-signup`, tapping **Send verification email** showed no visible message and did not appear to send a request.

## Live backend verification
Supabase Edge Function logs showed no request reaching the new `public-doctor-signup-start` endpoint during the attempted tap. Therefore this was treated as a public website JavaScript submit/caching problem, not an email-delivery backend problem.

## Most likely cause
Mobile browser / Cloudflare cache could keep an older `/auth-runtime.js` while the HTML was already updated. The old JavaScript may not bind correctly to the new email-only signup form, causing the visible button to appear inactive.

## Files changed
- `auth-runtime.js`
- `doctor-signup.html`
- `complete-signup.html`
- `forgot-password.html`
- `reset-password.html`
- `signup-success.html`

## Exact changes
1. Added cache-busting query string to auth scripts:
   - `/supabase-config.js?v=20260613-phase1b2`
   - `/auth-runtime.js?v=20260613-phase1b2`

2. Strengthened signup submit handling in `auth-runtime.js`:
   - The form `submit` event still works.
   - The visible `Send verification email` button now also has a guarded direct `click` listener.
   - Both call the same single guarded request function.
   - Duplicate double-submit is prevented with a local `signupSubmitting` lock.
   - If signup endpoint is not configured, a visible error is shown.
   - The user should now see one of:
     - `Sending verification email...`
     - success message
     - Turnstile/security error
     - backend error

## Validation completed
- `node --check auth-runtime.js` passed.
- `doctor-signup.html` now references cache-busted scripts.
- Main app repo was not touched.
- Live Supabase backend was not changed in this hotfix.

## Deployment instructions
Upload/commit this ZIP to the public website repo and redeploy Cloudflare Pages.

After deploy:
1. Open the page in incognito/private mode, or clear browser cache.
2. Visit `https://rxpulsecs.com/doctor-signup`.
3. Complete Turnstile.
4. Tap **Send verification email**.
5. You should immediately see `Sending verification email...`.
6. Check Supabase Edge Function logs for `public-doctor-signup-start`.

## If still no visible change
Open mobile Chrome menu → refresh the page once after deployment, or use incognito. If there is still no message, capture browser console/network logs or send another screenshot.
