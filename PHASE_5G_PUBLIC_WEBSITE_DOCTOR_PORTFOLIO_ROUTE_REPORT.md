# Phase 5G — Public Website Doctor Portfolio Route Patch Report

**Date:** 2026-06-15  
**Layer:** Public website repo / Cloudflare Pages  
**Input ZIP:** `rxpulsecs-website-main (6).zip`  
**Output ZIP:** `rxpulsecs-website-phase5g-doctor-portfolio-route.zip`

## 1. Scope
Implemented the missing public website route for published doctor portfolio pages:

```text
https://www.rxpulsecs.com/doctors/idDxxxxx/name-slug
```

This patch is limited to the public website static files. It does not modify the main app repo, live Supabase backend, Edge Functions, auth/signup/reset flows, pricing, support, legal pages, patient/prescription logic, or subscription logic.

## 2. Files changed

### Added
- `_redirects`
- `doctors.html`
- `doctor-profile.js`
- `PHASE_5G_PUBLIC_WEBSITE_DOCTOR_PORTFOLIO_ROUTE_REPORT.md`

### Modified
- `_headers`
- `styles.css`

## 3. Route behavior
Added Cloudflare Pages rewrite rules:

```text
/doctors/* /doctors.html 200
/u/* /doctors.html 200
```

This allows direct public URLs such as:

```text
/doctors/idD93138/md-masud-hasan
```

to load `doctors.html` while preserving the browser URL.

## 4. Supabase access model
The public website uses only the public Supabase URL and anon key already present in `supabase-config.js`.

No service-role key is used.

The public profile loader uses Supabase REST with anon headers and relies on live RLS policies. If the profile is not approved, the doctor account is not approved, or there is no active current subscription without grace, RLS should prevent the data from appearing.

Tables read by the public page:
- `publicProfiles`
- `doctor_chambers`
- `doctor_chamber_schedule`
- `doctor_chamber_availability_overrides`

## 5. Public visibility behavior
If profile data is not returned or not approved, the page shows a safe generic hidden/not-available message:

```text
Profile not available
This doctor profile is not public right now. It may be awaiting approval or hidden because the subscription is not active.
```

The message does not reveal whether the doctor/profile exists.

## 6. Template behavior
The public website now supports the same five template IDs:

- `template1` — Minimal Professional
- `template2` — Modern Glass
- `template3` — Premium Hospital
- `template4` — Personal Branding
- `template5` — Mobile Friendly

All five template styles render the same information contract:
- doctor name
- profile photo or fallback initial
- qualifications
- specialties
- designation/workplace
- bio
- expertise list
- dynamic chamber widget
- weekly schedule
- current active chamber override/status
- phone/call buttons
- safe map link

The templates differ by styling only. No hardcoded publications, hardcoded consultation hours, tracking counters, or appointment request form were added.

## 7. Chamber and schedule behavior
`doctor-profile.js` loads all active chambers for the doctor, sorted by `display_order`.

For each chamber, it displays:
- chamber name
- address
- safe Google/map link only if it starts with `http://` or `https://`
- primary and alternative phone call buttons
- instruction note
- weekly schedule
- current active override/status

Override filtering matches the main app logic:
- disabled overrides are hidden
- `manual` is active while enabled
- `today` is active only today
- `tomorrow` is active only tomorrow
- `date` and `date_range` are active only within their effective dates
- expired overrides are hidden

## 8. Security/CSP
`_headers` was updated only to allow remote profile/chamber images:

```text
img-src 'self' data: https:;
```

Existing Supabase `connect-src` is preserved. Scripts remain self-hosted except existing allowed sources. No inline JavaScript was added.

## 9. Tracking removal
No visit tracking, call-click tracking, analytics counter display, or request tracking was added to the public website route.

## 10. Validation performed
- `node --check doctor-profile.js` passed.
- Basic HTML parser check passed for `doctors.html`, `404.html`, and `index.html`.
- Grep confirmed no `Visits`, `Call Clicks`, or `analytics` strings in the new doctor route files.

No live Cloudflare deployment was performed here.

## 11. Deployment steps
1. Upload/deploy `rxpulsecs-website-phase5g-doctor-portfolio-route.zip` to Cloudflare Pages.
2. After deployment, test the direct URL:

```text
https://www.rxpulsecs.com/doctors/idD93138/md-masud-hasan
```

3. If the profile is approved and the doctor has an active current subscription, the profile should load.
4. If the profile is not approved or subscription is inactive, the hidden/not-available page should appear.

## 12. Smoke test checklist
- [ ] `/doctors/idD93138/md-masud-hasan` no longer shows Cloudflare/static 404.
- [ ] Approved + active doctor profile loads publicly.
- [ ] Not approved profile shows generic hidden/not-available page.
- [ ] Expired/no active subscription profile shows generic hidden/not-available page.
- [ ] Chamber schedule appears correctly.
- [ ] Current override appears only if active.
- [ ] Expired/disabled override is hidden.
- [ ] Map link works only for `http://` or `https://` URL.
- [ ] No analytics/tracking counters appear.
- [ ] Header/footer/signup/reset/support/legal pages still load.

## 13. Unresolved concerns
- This patch cannot verify live public rendering until Cloudflare Pages is redeployed.
- If live RLS blocks chamber tables more strictly than expected, the profile may load but chamber data may be empty. In that case, inspect Supabase RLS for the public chamber tables.
- Existing public pages still include `pricing.html` in the ZIP because this patch did not change unrelated site content.
