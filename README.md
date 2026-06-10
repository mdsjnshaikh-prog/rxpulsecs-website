# RxPulse Clinician Suite Website

Static marketing and legal website for RxPulse Clinician Suite.

## Files

- `index.html` — landing page
- `download.html` — installer / early testing page
- `privacy.html` — privacy policy
- `terms.html` — terms and conditions
- `styles.css` — shared responsive styling
- `script.js` — mobile menu and English/Bangla language toggle
- `_headers` — basic security headers for static hosting

## Notes

The refund page link has intentionally been removed. The current Windows installer is marked as coming soon until public release.


Step 10 update: Added support.html and improved early tester/support mailto templates.


## Public auth placeholder pages

This static website includes placeholder UI pages for:
- `/doctor-signup`
- `/forgot-password`
- `/reset-password`

These pages are intentionally not connected to Supabase yet. Keep them as UI/safe support pages until the exact app-compatible doctor signup and password reset backend flow is verified.

## Cloudflare Pages routing note

This version intentionally does not include a `_redirects` file. Cloudflare Pages was producing redirect loops on extensionless paths such as `/download` and `/support` when `_redirects` rewrites were present.

Internal navigation uses explicit `.html` pages such as `/download.html` and `/support.html` to avoid redirect loops. If clean extensionless URLs are needed later, test them after deployment before reintroducing `_redirects`.
