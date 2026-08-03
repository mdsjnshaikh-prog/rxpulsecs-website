# RxPulse Public Website

Complete static public website package for `rxpulsecs.com`.

## Included pages

- `index.html`
- `features.html`
- `workflow.html`
- `download.html`
- `support.html`
- `doctor-signup.html`
- `forgot-password.html`
- `reset-password.html`
- `signup-success.html`
- `privacy.html`
- `terms.html`
- `404.html`

## Included runtime files

- `design-tokens.css` (design tokens)
- `ui-components.css` (button, card, section-head, step, toast)
- `styles.css`
- `script.js`
- `auth-runtime.js`
- `supabase-config.js`
- `_headers`
- `robots.txt`
- `sitemap.xml`
- `.nojekyll`

## Important security notes

- `_redirects` is intentionally not included because previous clean URL routing caused Cloudflare Pages redirect loops.
- All internal page navigation uses `.html` pages.
- Public browser doctor signup is retired; account creation happens inside the RxPulse Windows app.
- The public website must not collect signup emails, signup passwords, verification codes, or signup tokens.
- BMDC and professional approval details are completed inside the RxPulse app and submitted for administrator approval.

## Required before upload

Open `supabase-config.js` and replace:

`PASTE_SUPABASE_ANON_PUBLIC_KEY_HERE`

with the Supabase public anon key:

`Supabase Dashboard → Project Settings → API → Project API keys → anon public`

Do not paste the service-role key.

## Turnstile

Configured public site key:

`0x4AAAAAADh1hSwbScv1YXhK`

The private `TURNSTILE_SECRET_KEY` must stay in Supabase Edge Function secrets only.
