# Current Feature / AI RAM

> **Rules for AI agents:**
> 1. Read this file at the start of every session.
> 2. Keep it updated — check off steps, add discoveries.
> 3. One feature at a time — archive to [COMPLETED.md](./COMPLETED.md) when done, then reset.
> 4. This file owns implementation detail; `TODO.md` owns the backlog.
> 5. **Every feature uses three layers** (MVP → Structural → Polish). Define all three before coding. Complete each layer before starting the next. Layout before interactions.

---

## Active: Homepage Redesign (Striking + Effective)

Goal: replace the current homepage with a clearer, more distinctive landing experience that sells Patcher’s core value
quickly (digital twin workflow for modular musicians), while keeping implementation maintainable and mostly based on
Angular Material + existing shared primitives.

Status: **Planning complete, awaiting explicit approval to execute Layer 1.**

---

## 1) Context Snapshot

Project/product signals from `README.md` and internal docs:

- Patcher’s core promise is the full modular workflow: modules + patches + racks in one workspace.
- Home should act as high-impact orientation + conversion surface (sign up / login), not a deep feature playground.
- Existing home currently embeds real detail components (patch/module/rack) and timed data loading; this adds complexity
  and visual noise for first-touch visitors.

User direction for this feature:

- “Plan a new, striking, effective homepage.”
- “Work in layers… execute layer 1.”
- “Use existing or Material components, reduce custom components.”
- Existing homepage can be replaced entirely.

---

## 2) Design Direction

Desired homepage posture:

- Bold first impression with strong typographic hero and clear value proposition.
- Fast scan path: **what it is**, **what you can do**, **how to start**.
- Conversion-focused CTAs near top and bottom.
- Mobile and desktop friendly with deliberate spacing and hierarchy.

Implementation posture:

- Prefer Material structure (`mat-card`, `mat-icon`, `mat-divider`) plus existing button/wrapper primitives.
- Remove dependency on embedded “real-life demo” detail components for layer 1.
- Keep SCSS manageable and local to `home.component.scss`.

---

## 3) Three-Layer Plan

### Layer 1 (MVP) — New homepage skeleton + visual direction

Deliverable: a fully replaced homepage with striking hero, concise value architecture, and clear CTAs.

Planned changes:

- [x] Replace current home template with a new sectioned structure:
  - Hero (headline, subcopy, primary + secondary CTA)
  - Value pillars (Modules, Patches, Racks)
  - Workflow strip (“discover → design → document/share”)
  - Final CTA panel
- [x] Remove embedded patch/module/rack detail demo components from homepage.
- [x] Simplify `home.component.ts` by removing delayed demo-data loads and unused demo view configs.
- [x] Keep/update SEO text to match the new homepage message.
- [x] Implement a distinct but manageable SCSS theme:
  - Local CSS variables for palette
  - Layered background/shape treatment
  - Clear card hierarchy and responsive behavior
- [x] Use mostly Material + existing shared components (no new custom component creation in layer 1).

Acceptance criteria:

- Homepage is visually and structurally replaced (old version no longer present).
- First viewport communicates product + CTA within ~5 seconds of scanning.
- No embedded live detail demos remain on homepage.
- Layout works on desktop + mobile without overlap or collapsed hierarchy.

---

### Layer 2 (Structural) — Trust + navigation depth

Deliverable: homepage improves decision confidence and cross-route discoverability.

Planned additions:

- Add lightweight trust blocks (community/open data/privacy cues).
- Add clearer route-driven entry points (browse modules, explore patches, view racks).
- Tighten section order based on narrative flow and conversion intent.

Gate:

- Visual/content review confirms clearer “why use this now” story than layer 1.

---

### Layer 3 (Polish) — Motion, accessibility, and copy refinement

Deliverable: premium finish without adding structural complexity.

Planned additions:

- Refine animations/transitions (subtle staged entrance, hover behavior).
- Accessibility pass for contrast/focus/heading semantics.
- Copy compression and final typography tuning.

Gate:

- UX pass and quick manual accessibility sanity check complete.

---

## 4) Layer 1 Execution Checklist

Target files (expected):

- `src/app/features/backbone/home/home.component.html`
- `src/app/features/backbone/home/home.component.scss`
- `src/app/features/backbone/home/home.component.ts`
- `src/app/features/backbone/home/home.module.ts` (import cleanup if demo components/modules are removed)

Verification plan for layer 1:

- [x] Run at least one repo-approved verification command after implementation.
- [x] Smoke-check homepage rendering at desktop and mobile widths.

Risks/notes:

- Removing demo embeds may require pruning module imports to avoid dead dependencies.
- `HomeModule` still imports `UserDataHandlerModule` to preserve existing app compilation in this routing setup (
  transitive dependency currently relied on outside home templates).
- Keep route/toolbar expectations intact (`/home` remains unchanged).

---

## 5) Layer 1 Revision: Character + Visual Flair (2026-02-23)

Objective:

- Keep the new structure from layer 1, but add stronger visual personality so the homepage feels aligned with Patcher's
  brand character.

Completed in this revision:

- [x] Added image-driven hero composition using existing local assets (`patcher_seo_hero` + promo screenshots).
- [x] Introduced a bolder visual language (multi-accent gradients, grid texture, floating preview cards, expressive CTA
  framing).
- [x] Added a compact “energy strip” to communicate product momentum and make the page feel less static.
- [x] Preserved implementation constraints: no new custom components, Material/shared primitives only.
- [x] Build smoke check passes (`npx ng serve --port 5560`).

---

## 6) Layer 1 Revision: README Principle Alignment (2026-02-23)

Objective:

- Re-anchor homepage content in the exact product value statements and principles from `README.md`, while preserving
  visual energy.

Completed in this revision:

- [x] Rewrote homepage narrative to foreground core utility claims:
  - digital twin of real rig,
  - fast rack planning,
  - app-wide auto-save,
  - instance-aware patching,
  - live connection-derived patch stats.
- [x] Added explicit “Practical benefits” and “Open data with clear boundaries” sections to reflect project principles (
  free public browsing + privacy boundary for non-public data).
- [x] Added a dedicated recent-improvements block aligned with v5.1 messaging.
- [x] Updated homepage SEO copy to match the revised product emphasis.
- [x] Compile smoke check passes (`npx ng serve --port 5560`).

---

## 7) Layer 1 Revision: Changelog Impact + Modular Creativity (2026-02-23)

Objective:

- Strengthen homepage with high-impact, user-facing features from `CHANGELOG.md`, explicit open-source/open-data calls,
  and a more music-native creative identity.

Completed in this revision:

- [x] Added a modular-inspired “Signal flow” section (Source → Shape → Route → Perform) to align page storytelling with
  Eurorack/music concepts.
- [x] Added a dedicated “High-impact capabilities” section grounded in recent releases:
  - app-wide auto-save,
  - instance-aware patching,
  - connection-driven patch stats,
  - privacy controls,
  - accent-insensitive search,
  - graph stability/performance improvements.
- [x] Strengthened open-data principle framing and private-data boundary messaging.
- [x] Added explicit open-source pathways with direct links to GitHub repository and full changelog.
- [x] Added persistent “View source” call-to-action in final CTA area.
- [x] Enhanced principle cards with icon-led headers, visual badges, and richer resource link styling for better
  scanability.
- [x] Added a dedicated “What makes this system different” section to foreground differentiation beyond data depth (
  performance, modern UX, workflow reliability, open development).
- [x] Reduced “all-card” visual density with section-level visual bands, larger vertical rhythm, and less blocky
  impact/difference presentation.
- [x] Updated SEO metadata to include open-source/open-data + high-impact feature language.
- [x] Compile smoke check passes (`npx ng serve --port 5560`).