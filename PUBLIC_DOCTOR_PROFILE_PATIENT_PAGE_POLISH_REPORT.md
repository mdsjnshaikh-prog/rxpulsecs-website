# Public Doctor Profile Patient Page Polish Report

**Date:** 2026-06-15  
**Layer:** Public website repo (`rxpulsecs-website`)  
**Scope:** Doctor public portfolio page only

## Summary
This patch improves the patient-facing doctor public profile page without changing Supabase schema, approval logic, subscription logic, or the main app repo.

## Files Changed
- `doctors.html`
- `doctor-profile.js`
- `styles.css`

## Changes Made

### 1. Patient-specific header
The generic marketing navigation on the doctor profile page was replaced with a simpler patient-focused header:
- RxPulse / Doctor Profile brand
- Support link
- Language toggle

This removes the full marketing menu from the doctor profile page so patients can focus on doctor/chamber information.

### 2. Patient-specific footer
The generic public website footer was replaced on `doctors.html` with a compact doctor-profile footer:
- brief explanation that the page is a doctor-shared public profile
- instruction to call the chamber number for serial/visit information
- minimal links: Support, Privacy, Home

### 3. Doctor photo support fixed
Live Supabase inspection showed the profile photo is stored in `publicProfiles.profilePhotoUrl` as a `data:image/jpeg;base64,...` data URL.

Previously the website only allowed `http://` and `https://` image URLs, so this valid uploaded image was rejected and the page showed the fallback initial `D`.

The patch adds safe image handling for:
- `http://` URLs
- `https://` URLs
- base64 image data URLs only for these MIME types: `png`, `jpg`, `jpeg`, `webp`, `gif`

A safe image error fallback remains, so broken image links still show the initial placeholder.

### 4. Chamber schedule redesign
The weekly chamber schedule was redesigned from a plain list into prominent patient-friendly cards:
- highlighted schedule container
- open-day count pill
- separate day cards
- green styling for open days
- amber styling for limited days
- red/pink styling for closed/cancelled days
- stronger typography for time ranges
- mobile-first single-column layout
- desktop/tablet two-column layout

### 5. Chamber notice improved
The instruction note now has a more visible alert-card design with icon marker, better spacing, and stronger contrast.

### 6. Internal prompt-text guard
The current live profile bio contains internal implementation/report text. This is profile content and should be corrected from the doctor portfolio setup page.

As a safety guard, the public website now hides obvious internal prompt/report-like bio text containing markers such as:
- `Do not apply any changes`
- `Markdown report`
- `DoctorPortfolio.tsx`
- `PHASE_5`
- `CLAUDE_FINAL`

This does not edit database content. Please still replace the doctor bio from the app with proper patient-facing text.

## What Was Not Changed
- No Supabase schema changes
- No RLS changes
- No database data edits
- No main app repo edits
- No approval/subscription logic changes
- No analytics/tracking added
- No public signup/reset flow changes
- No clean-route Cloudflare rewrite changes

## Deployment Notes
Deploy this ZIP to Cloudflare Pages or commit/extract these files to the public website repo root if automatic GitHub deployment is enabled.

After deployment, test:

```text
https://www.rxpulsecs.com/doctors.html?slug=idD93138%2Fmd-masud-hasan
```

Expected:
- doctor photo appears instead of `D`
- header/footer are patient-focused
- internal report-like bio is hidden
- chamber schedule is more prominent and card-based
- call and map links still work

## Long-term Recommendation
The current profile photo is stored as a large base64 value in the database. It works after this patch, but the better long-term design is to store doctor photos in Supabase Storage and save a public/signed URL in `profilePhotoUrl`.
