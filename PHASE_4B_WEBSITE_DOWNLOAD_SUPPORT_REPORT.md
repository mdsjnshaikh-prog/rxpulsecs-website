# Phase 4B — Website Download + Support Update Report

## Layer
Layer 3: Public Website Repo

## Repository
`mdsjnshaikh-prog/rxpulsecs-website`

## Files Inspected
- `download.html`
- `support.html`

## Files Changed
- `download.html`
- `support.html`
- `PHASE_4B_WEBSITE_DOWNLOAD_SUPPORT_REPORT.md`

## Download Mode
- Public direct download
- Reason: Windows installer was built, corrected, tested to open, connected to Supabase, and reached the doctor dashboard. A stable GitHub Release asset URL was provided.

## Installer Link
- URL added: yes
- URL: `https://github.com/mdsjnshaikh-prog/Rxpulse_CS_app/releases/download/v1.2.0-beta/RxPulse-Clinician-Suite-1.2.0-Setup-x64.exe`
- Filename: `RxPulse-Clinician-Suite-1.2.0-Setup-x64.exe`
- Version: `1.2.0 desktop beta`
- SHA-256: `31ab210247271fcb4f32bace6f3c1db3cb67bc397228dfba04b2d89d937fe29c`
- Size: about 116 MiB
- Release date: 24 June 2026

## Website Content Changes

### `download.html`
- Replaced the old "Windows installer is not released yet" state with a Windows Desktop Beta download section.
- Added direct installer download button.
- Added GitHub Release link.
- Added SHA-256 checksum display.
- Added install notes for first login, cloud sync, weak-internet/offline workflow, Windows SmartScreen, uninstall/reinstall sync, and one doctor per Windows user/device workspace.
- Kept WebApp information available.
- Added patient-data support safety wording.

### `support.html`
- Added Windows desktop beta support section.
- Added guidance for SmartScreen warning, installer download, login, sync, offline workflow, and support messages.
- Added guidance to include registered email, doctor name, Windows version, app version, sync status, and a short issue description.
- Reinforced patient-identifying data masking before sending screenshots or backups.

## Safety Wording
Confirmed:
- No claim that all local clinical data is fully encrypted at rest.
- No auto-update claim.
- One doctor per Windows user/device workspace guidance added.
- Sync before uninstall/reinstall guidance added.
- No patient-identifying screenshots/backups guidance added.
- First login and cloud sync require internet.
- Offline-first/weak-internet wording is limited to after prior login.

## Build / Validation Results
- Static website files updated by inspection.
- No installer binary committed to website repo.
- No live Supabase backend change.
- No Edge Function deploy.
- No main app repo change.
- No Project Map update.

## Boundary Confirmation
- Main app repo not changed.
- Live Supabase backend not changed.
- Edge Functions not deployed.
- Installer binary not committed to website repo.
- Project Map not touched.

## Remaining Risks
- Windows installer is still beta.
- Code signing is pending; Windows SmartScreen warnings may appear.
- Auto-update is not implemented.
- Broad public release should still depend on real doctor smoke testing.

## Next Step
Proceed to Phase 4C final doctor usability smoke-test and release decision.
