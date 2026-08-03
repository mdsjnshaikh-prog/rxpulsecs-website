# RxPulse CS — Dedicated design tokens + component library

## Layer

Public website repo only: `mdsjnshaikh-prog/rxpulsecs-website`.

## Task Summary

Introduced a dedicated design-token layer and a reusable UI component library for **button**, **card**, **section-head**, **step**, and **toast**, without changing public page behavior or markup contracts.

## Files Added

- `design-tokens.css` — color, type, space, radius, shadow, motion, z-index tokens; legacy CSS variable aliases preserved (`--primary`, `--bg`, …).
- `ui-components.css` — formal component styles for the five primitives above.
- `docs/reports/REPORT_design_tokens_component_library.md` — this report.

## Files Updated

- All public HTML pages — load order:

  1. `design-tokens.css`
  2. `ui-components.css`
  3. `styles.css`
  4. `styles-enhancements.css` (where present)
  5. `script.js`

## Component contracts (unchanged markup)

| Component | Classes | Notes |
|-----------|---------|--------|
| Button | `.button` + `.primary` / `.secondary` / `.full-width` / `.is-loading` | Also accepts `.button--primary` / `.button--secondary` / `.button--full` |
| Card | `.card`, `.feature-card`, `.ui-card`, … | Shared surface, padding, hover lift |
| Section head | `.section-head` + `.eyebrow` | Centered on desktop; left-aligned ≤1024px |
| Step | `.step-list`, `.timeline-item`, `.onboarding-path`, `.ui-step` | Numbered gradient badge + body |
| Toast | `.rxpulse-toast-stack`, `.rxpulse-toast` | Driven by `window.rxpulseShowToast` in `script.js` |

## Behavior preservation

- No HTML content/copy changes required for existing pages.
- Toast runtime in `script.js` unchanged.
- Supabase, auth, redirects, and doctor portfolio JS untouched.

## Verification

- Token aliases map to previous values so existing `styles.css` rules keep working.
- Load order ensures tokens resolve before components and page CSS.
