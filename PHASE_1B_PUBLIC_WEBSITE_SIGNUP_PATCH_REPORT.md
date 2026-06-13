# Phase 1B Public Website Signup Patch Report

## Task Name
Phase 1B — Public Website Strict Doctor Signup Flow

## Files Changed
- `supabase-config.js`
- `auth-runtime.js`
- `doctor-signup.html`
- `complete-signup.html` (new)
- `sitemap.xml`

## Behavior Changed
- Doctor signup page now asks for email only.
- Password is collected only after the doctor opens the verification email link.
- Public signup now calls `public-doctor-signup-start`.
- Complete signup page calls `public-doctor-signup-complete`.
- Signup verification link validity is controlled by backend at 5 minutes.
- Same-email retry cooldown is controlled by backend at 5 minutes.

## Safety Confirmations
- Main app repo `mdsjnshaikh-prog/Rxpulse_CS_app` was not modified.
- Existing live old `public-doctor-signup` remains available but this website patch uses the new start/complete endpoints.
- No service-role key or private secret was added to website files.
- Public website still uses only public Supabase URL/function URLs and anon key for reset-password page.

## Deployment Required
Deploy this patched public website folder/ZIP to Cloudflare Pages.

## Manual Test Checklist
1. Open `/doctor-signup.html`. It should show only email + Turnstile.
2. Submit a new email. It should show verification email sent.
3. Before clicking email link, verify no Auth user exists for that email.
4. Click verification email link. It should open `/complete-signup.html?token=...`.
5. Set password. It should create the account and redirect to `https://app.rxpulsecs.com/#/login`.
6. Verify Auth user and `app_users` row exist after completion.
7. Retry same email before 5 minutes and confirm cooldown message.
8. Try an expired link and confirm it asks to start signup again.

## Next Step
After successful website test, prepare Google AI Studio prompt to sync `Rxpulse_CS_app` repo with the live backend migration and Edge Function source.
