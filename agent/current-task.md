# Current Task

## Title
UI Consistency Pass 2 — Auth page form element smoke tests + user-area spacing

## Source
UI_CONSISTENCY_AUDIT.md §3 (Buttons/Links) + §5 (Authenticated editing cleanup) — improve consistency in auth pages and user-area surfaces.

## Goal
Add targeted E2E smoke tests for the auth pages (form elements, sign-up/login flow basics without actual credentials) and apply spacing corrections to user-area-root where non-scale values degrade the spacing system enforcement.

## Acceptance criteria
- Auth page smoke tests: login form fields are present and accessible; signup form renders
- user-area-root utility search gap/padding aligned to scale

## Affected files
- e2e/auth-pages-smoke.spec.ts (new)
- src/app/features/routes/user-area/user-area-root/user-area-root.component.scss (spacing)
- playwright.config.ts (testMatch)

## Out of scope
- Actual authentication flow (requires credentials)
- Button/link hierarchy refactor (larger scope, needs planning)
- Backend RLS/auth config

## Risk notes
Unauthenticated auth page tests: low risk. SCSS changes: user-area-root is auth-gated so cannot visually verify without a running instance — make only clearly safe, unambiguous changes.
