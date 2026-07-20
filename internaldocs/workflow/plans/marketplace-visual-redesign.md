<!-- Section: PRODUCT — Tier 2 (marketplace UX shell alignment) -->

# Marketplace — Visual Redesign (align with app design system)

## Goal

Rebuild the public Marketplace browse/detail surfaces to use the same shell, components, and visual grammar as the
module/rack/patch browsers, removing the ad-hoc dark-boxed custom styling that currently makes `/marketplace` look
like a foreign app.

## Problem statement (verified via screenshots, 2026-07-19)

Snapshot comparison of `/marketplace` vs `/modules` (dev server, `agent-snapshot.mjs`) shows:

1. **No app shell toolbar.** `/marketplace` is missing from the `supportsEmbeddedShell` allowlist in
   `src/app/app.component.ts`, so the page renders without `app-wide-shell-toolbar` — no top navigation at all.
   `getShellArea` also has no marketplace mapping, so no `app-shell--area-*` tint applies.
2. **Hardcoded dark theme on a light app.** 46 hardcoded `rgba(10, 13, 17, .94)` / white-on-dark rules across
   `marketplace-browser.component.scss`, `marketplace-detail.component.scss`, and
   `marketplace-listing-card.component.scss`. The hero and filter rail are near-black boxes pasted onto the light
   page background — violates DESIGN_LANGUAGE.md ("restrained, purposeful surface layers"; changes must relate to
   adjacent elements).
3. **Native form controls instead of the app's form system.** Filters use raw `<select>`/`<input>` with bespoke CSS.
   Every other browser (module/rack/patch/manufacturer) uses `lib-mat-form-entity` + a fields factory
   (see `module-browser-fields.factory.ts`) inside the shared `sidebar-layout` / `filter-sidebar` /
   `browser-content-area` classes from `tools-utilities.scss`.
4. **No `lib-hero-content-card` page header.** The custom black hero (with its own clamp() display type) replaces the
   standard `titleBig` hero pattern + per-area `*BG` gradient class from `brand-globals.scss`.
5. **Custom chips/buttons.** Active-filter chips, reset, and "Load more" are hand-rolled bordered buttons instead of
   `mat-chip-set`, `app-browser-reset-filters-button`, and `mat-stroked-button`.
6. Listing cards and detail page follow the same foreign dark idiom instead of the light card grammar used by
   module lists.

Reference implementations to mirror: `module-browser-root` (hero + filter rail + grid),
`rack-browser-root` / `patch-browser-root` (same skeleton), `module-list` cards.

## Layers

### MVP (structural correctness)

- [x] Shell integration: add `/marketplace` to `supportsEmbeddedShell` in `app.component.ts`; add a marketplace case in
      `getShellArea` (new `marketplace` area) + `app-shell--area-marketplace` class in `app.component.html`.
- [x] Add `.marketplaceBG` gradient to `brand-globals.scss` (same 135deg formula; pick an unused hue —
      storefront amber/green family, distinct from `manufacturersBG` orange).
- [x] Rebuild `marketplace-browser.component.html`: wrap in `lib-hero-content-card` (`titleBig="Marketplace"`,
      description, `class="marketplaceBG"`), keep `sidebar-layout`/`filter-sidebar`/`browser-content-area`
      without dark overrides.
- [x] Replace native filter controls with `lib-mat-form-entity` fields (text search, selects for
      manufacturer/condition/currency/ships-from/shipping-option/sort, number inputs for price range) via a
      `marketplace-browser-fields.factory.ts`, driven from the existing data service filter subjects.
- [x] Replace custom chips/reset/load-more with `mat-chip-set`, `app-browser-reset-filters-button`,
      `mat-stroked-button`.
- [x] Strip all hardcoded dark rgba colors from the three marketplace SCSS files; inherit app theme.

### Structural (visual coherence)

- [x] Restyle `marketplace-listing-card` to the light card grammar used by module list cards (border-driven, tight
      type scale, tabular figures for price, Material elevation rules per DESIGN_LANGUAGE.md — no decorative shadow).
- [x] Rebuild `marketplace-detail` layout on the same shell: hero/heading treatment consistent with module detail,
      `dl` facts with the app's label style, Material CTAs; keep gallery behavior (keyboard nav, thumbs).
- [x] Mobile filter disclosure: reuse the module-browser mobile filter toggle pattern instead of the custom bar.

### Polish

- [x] Density/spacing pass with `tools.scss` scale only (gap0–gap3); no ad-hoc values.
- [x] Breakpoint verification: desktop 1440 + mobile 420 snapshots verified (mobile filter disclosure + floating CTA behave like module browser).
- [x] Before/after snapshots via `scripts/dev/agent-snapshot.mjs` for `/marketplace` (anonymous + authenticated); grammar matches `/modules`.

## Validation

- Update `marketplace-browser.component.spec.ts`, `marketplace-detail.component.spec.ts`,
  `marketplace-listing-card.component.spec.ts` for the new DOM (keep `data-testid` hooks stable where possible).
- `pnpm lint` (layering, px-in-ts, docs) + targeted `pnpm test-headless --include="**/marketplace-*.spec.ts"`.
- Flag audit stays green: route/toolbar/public-profile gates unchanged; user-area listings + address book now gated
  (see Decision log).

## Feature-flag audit (2026-07-19)

`environment.prod.ts` → `marketplaceEnabled: false`. Gates verified:

| Surface | Gate | Status |
|---|---|---|
| `/marketplace` routes | `app-routing.module.ts` conditional route array | OK |
| Toolbar link | `toolbar-link-data.ts` conditional spread | OK |
| Public profile "For sale" | `public-profile-data.service.ts` + template `@if` | OK |
| User area "My listings" + "Address book" | **was ungated** — fixed by wrapping in `@if (marketplaceEnabled)` in `user-area-root` | FIXED |
| Module detail / possession dialog | only imports pure money-format utils, no UI | OK (no leak) |

## Decision log

- 2026-07-19 — Plan created from screenshot-verified audit; root causes: missing shell allowlist entry + fully custom
  dark-theme SCSS instead of shared browser components.
- 2026-07-19 — Fixed production leak: `app-user-listings` / `app-user-address-book` rendered unconditionally in
  `user-area-root`; now gated on `environment.features.marketplaceEnabled` (pattern copied from
  `public-profile-data.service.ts`). 15/15 user-area-root specs pass.
- 2026-07-19T16:53+02:00 — Chose unused storefront green (`rgb(124, 184, 88)`) for `marketplaceBG` and shell tint to stay distinct from manufacturer orange.
- 2026-07-19T16:53+02:00 — Kept marketplace filters on existing `setFilter$` / `setSort$` subjects; field controls only bridge UI state so filtering pipelines stay intact.
- 2026-07-19T16:53+02:00 — Left breakpoint/snapshot polish unchecked because coordinator owns visual verification after this structural implementation.
- 2026-07-19T17:00+02:00 — Review pass 1 (code): `shareReplay(1)` without refCount in `marketplace-browser-fields.factory.ts` leaked 5 facet streams past component destroy; fixed with `shareReplay({ bufferSize: 1, refCount: true })` (865fcee6).
- 2026-07-19T17:20+02:00 — Review pass 3 (visual, user-reported): price hint bound to both min/max fields overlapped the filter rail — now rendered once as `.marketplace-filter-hint`; inline login link converted to floating `mat-fab extended` copying the module-browser FAB CSS custom-property pattern (496be05f).
- 2026-07-19T17:25+02:00 — Review pass 4 (visual, authenticated snapshot): login FAB rendered for logged-in users — gated on `!(userService.loggedUser$ | async)?.id` matching `module-browser-adder`; spec added for the authenticated case (8c8d87b7). Final validation: 144/144 marketplace+app specs, `pnpm lint` 0 errors, anon/auth/mobile snapshots clean.
- 2026-07-19T17:50+02:00 — Phase 2 (user-area "My listings"): rebuilt fully custom editor with shared grammar — `mat-button-toggle-group` status filters (user-modules pattern), `lib-mat-form-entity` descriptors via new `user-listings-fields.factory.ts`, Material checkboxes/tooltip icon buttons/stroked file-picker button; SCSS 372→143 lines (13ee9447, fe335bbf). ISelectable wrap/unwrap handled via `selectableValue()`/`conditionOption()`/`currencyOption()`.
- 2026-07-19T18:00+02:00 — Review pass 6 (visual, live editor interaction): fixed cramped 4-across field row (`repeat(auto-fit, minmax(12rem, 1fr))`), gated `<small role="alert">` validation on `touched || dirty` via `showFieldError()` (presentation-only; validation$ untouched — save buttons already disabled by canSave$), moved " optional" label suffixes to `lib-mat-form-entity` `[hint]` (aafd5cd9).
- 2026-07-19T18:03+02:00 — Review pass 7 (visual micro-pass): column min 12rem→14rem so "Ships from country" no longer truncates (2-per-row at editor width); grid gap `1rem 0.6rem` for hint breathing room (941c020a). Final: 12/12 user-listings specs, live editor screenshot verified via throwaway Playwright possession-dialog script (data reverted after).
- 2026-07-19T18:25+02:00 — Phase 3 (module panel media, user-requested): listings without photos showed a manufacturer monogram ("SH"). Extended the listing module join additively with `hp`, `standard`, and `panels:module_panels!...(*)`; VM now builds a `MinimalModule` so card + detail render the real faceplate via shared `app-module-part-image` (navigation/tooltip disabled inside the card link), monogram kept as last resort (4140f033). Detail page: placeholder prose ("No description provided" / shipping-notes filler) hidden when empty, added public "View module" stroked button, entity actions grouped right of the back button (291d8a2c). Spec harness needed `provideNoopAnimations()` for the panel component (0085eb98). 159/159 marketplace+listings specs, live anon snapshots verified for browser + detail.
