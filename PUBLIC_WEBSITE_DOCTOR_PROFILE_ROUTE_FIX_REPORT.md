# PUBLIC_WEBSITE_DOCTOR_PROFILE_ROUTE_FIX_REPORT.md

## Task Name
Fix Public Website Doctor Portfolio Route

## Layer
Public website repository ZIP (`rxpulsecs-website`), deployed through Cloudflare Pages.

## Files Inspected
- `doctors.html`
- `doctor-profile.js`
- `supabase-config.js`
- `_redirects`
- `styles.css`
- `404.html`

## Files Changed
- `doctor-profile.js`
- `doctors.html`
- `_redirects`

## Exact Changes Made

### 1. `doctor-profile.js`
- Added `normalizeSlug(value)` so the public profile loader can safely handle clean paths, full copied URLs, query-string fallback values, `/doctors/...`, and `/u/...` style inputs.
- Improved `currentSlugFromPath()` so it supports:
  - `/doctors/idD93138/md-masud-hasan`
  - `/doctors/idD93138`
  - `/doctors.html?slug=idD93138/md-masud-hasan`
  - `/u/<slug>`
- Added a fallback lookup by doctor code. If exact slug lookup fails for `idD93138/md-masud-hasan`, the loader now tries `slug=like.idD93138/*` to survive a name-slug mismatch while still using the same approved public profile row.
- Improved the missing-slug message so bare `/doctors` explains that the full doctor link is required.
- Updated patient-facing status labels:
  - `Available` display: `Open` / `চেম্বার খোলা`
  - `Limited` display: `Limited hours` / `সীমিত সময়`
- Did not change any database stored values.

### 2. `doctors.html`
- Updated static asset query strings for `styles.css`, `script.js`, and `doctor-profile.js` to force browsers/Cloudflare to load the patched route script after deployment.

### 3. `_redirects`
- Added explicit rewrites for:
  - `/doctors /doctors.html 200`
  - `/doctors/ /doctors.html 200`
- Kept existing rewrites:
  - `/doctors/* /doctors.html 200`
  - `/u/* /doctors.html 200`

## Backend Verification Facts Used
Live Supabase verification showed that the tested profile exists and is publicly visible:
- slug: `idD93138/md-masud-hasan`
- doctor name: `Dr. Md Masud Hasan`
- `isApproved = true`
- `approvalStatus = approved`
- public visibility function returns true
- at least one active chamber exists

## What Was Intentionally Not Changed
- No live Supabase backend changes.
- No schema/migration changes.
- No public profile approval/subscription logic changes.
- No analytics/tracking added.
- No appointment features added.
- No unrelated marketing pages changed.

## Verification Performed
- Ran `node --check doctor-profile.js` successfully.
- Confirmed `_redirects` contains bare and nested doctor route rewrites.
- Confirmed the patched loader supports the intended clean URL format.

## Deployment Instructions
Upload/deploy the patched website folder to Cloudflare Pages. After deployment, test:

1. `https://www.rxpulsecs.com/doctors/idD93138/md-masud-hasan`
2. `https://www.rxpulsecs.com/doctors/idD93138`
3. `https://www.rxpulsecs.com/doctors.html?slug=idD93138/md-masud-hasan`
4. `https://www.rxpulsecs.com/doctors`

Expected:
- #1 should load the doctor profile.
- #2 should load the same doctor profile through doctor-code fallback.
- #3 should load the doctor profile through query fallback.
- #4 should show a clear incomplete-link message, not the doctor profile.
