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

Status: **Creator-first homepage iteration implemented (2026-02-23), awaiting review.**

---

## 10) Ad-hoc Quality Task: Unit Coverage Uplift to 75% (2026-02-23)

Objective:

- Increase overall unit-test coverage to at least 75% by adding meaningful tests for high-impact low-coverage files.

Current baseline (from `yarn test:ci` on 2026-02-23):

- Statements: 56.79% (1521/2678)
- Branches: 55.22% (486/880)
- Functions: 51.36% (547/1065)
- Lines: 56.88% (1442/2535)

Three-layer execution plan:

### Layer 1 (MVP): Cover largest low-coverage services first

- Add unit tests for:
  - `src/app/components/rack-parts/rack-detail-data.service.ts`
  - `src/app/components/module-parts/module-detail-data.service.ts`
  - `src/app/features/routes/user-area/user-area-data.service.ts`
- Focus on reactive pipelines, action subjects, and deterministic helper methods.

Acceptance:

- Coverage moves materially upward and tests pass in `yarn test:ci`.

### Layer 2 (Structural): Fill remaining high-yield gaps

- Add tests for next low-coverage but smaller files (for example:
  `rack-module-adder-dialog.component.ts`, `rack-creator.component.ts`, and/or equivalent top uncovered targets).
- Prioritize behavior-level tests that validate user-visible outcomes and backend interaction wiring.

Acceptance:

- Coverage reaches or exceeds 75% (statements/lines) with green suite.

### Layer 3 (Polish): Stabilize and document

- Remove brittle assertions, tighten test names, and ensure mocks are minimal/maintainable.
- Re-run full repo-approved unit command and record final numbers.

Acceptance:

- Final run is stable and repeatable at or above target.

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
- [x] Reduced “all-card” visual density with section-level visual bands, larger vertical rhythm, and less blocky
  impact/difference presentation.
- [x] Reduced large outer rounding to better match modular panel aesthetics (squarer section shells and container
  edges).
- [x] Added a top-level real-world use-cases section focused on key differentiators (drag-and-drop rack editing,
  visual signal-route graphing, precision-first data handling).
- [x] Removed the standalone “What makes this system different” section after overlap review, keeping real-world use
  cases as the primary differentiator block.
- [x] Updated SEO metadata to include open-source/open-data + high-impact feature language.
- [x] Compile smoke check passes (`npx ng serve --port 5560`).

---

## 8) Research Snapshot: Famous Music Software Landing Pages (2026-02-23)

Sources reviewed:

- Ableton Live: https://www.ableton.com/en/live/
- Splice: https://splice.com/
- FL Studio: https://www.image-line.com/
- Bitwig Studio: https://www.bitwig.com/
- Reason Studios: https://www.reasonstudios.com/reason
- Native Instruments (Komplete): https://www.native-instruments.com/en/products/komplete/bundles/komplete-15-select/

Common patterns to borrow:

- Hero copy is short and identity-led (often 1 line + 1 support line), not feature-dump heavy.
- Feature sections are clustered into 3-5 scannable cards/strips with bold headings and very short descriptions.
- Action loops are repeated often (`Try`, `Buy`, `Download`) at hero, mid-page, and footer CTA.
- Creator/community language is direct and human ("for producers", "for music makers", "community", "artists"), with low
  corporate phrasing.
- Visual hierarchy is image-first and rhythm-driven; text rides on top of strong screenshots, motion bars, and graphic
  motifs.
- Trust proof appears as social/artist/community references rather than enterprise claims.

Observed risk in current homepage:

- Current page has strong visual work but too many dense sections and long descriptive text blocks, which can read as
  product
  documentation instead of a fast emotional landing experience.

---

## 9) Executed Iteration: Less Corporate, More Creator Character (2026-02-23)

Objective:

- Keep order and clarity, but compress text and make tone feel closer to musicians/producers who reject "enterprise"
  language.

Execution summary:

- [x] Reduced section density by removing overlapping long sections and keeping a tighter flow:
  - Hero
  - Quick value strip
  - Workflow strip
  - Community/open strip
  - Final CTA
- [x] Rewrote homepage copy to be shorter and creator-first (less enterprise phrasing, fewer long paragraphs).
- [x] Preserved and reused existing shared/Material components (`lib-screen-wrapper`, `mat-card`, `mat-icon`,
  `app-brand-primary-button`).
- [x] Updated homepage SCSS to keep visual character with clearer scan rhythm and reduced dense card treatments.
- [x] Updated homepage SEO metadata to align with the concise narrative.
- [x] Removed unused `MatDividerModule` import from `home.module.ts`.
- [x] Verification: `yarn test-headless --watch=false` passed (`622 SUCCESS`).

Implementation plan (three layers):

### Layer 1 (MVP): Copy compression + section simplification

Planned changes:

- Reduce homepage section count by merging overlapping narrative blocks.
- Keep this structure:
  - Hero
  - Quick value strip (3 cards)
  - Workflow section
  - Social-proof/community strip
  - Final CTA
- Replace long body paragraphs with 1-2 sentence max blocks.
- Rewrite copy in creator-first language (plain, direct, less formal/corporate).
- Preserve existing reusable components (`lib-screen-wrapper`, `mat-card`, `mat-icon`, `app-brand-primary-button`).

Acceptance criteria:

- Homepage reads in under ~45 seconds from top to final CTA.
- No section contains long-form paragraph blocks.
- Visual hierarchy remains clear on mobile and desktop.

### Layer 2 (Structural): Personality and trust without bloat

Planned changes:

- Add compact "who this is for" cues (producers/live performers/patch nerds) as short chips.
- Add one lightweight community/social proof band (contributors/open-source activity/community language).
- Tighten CTA rhythm so primary action appears at least 3 times on page.

Acceptance criteria:

- Page feels community/creator-forward while preserving navigation clarity.
- No new custom components introduced.

### Layer 3 (Polish): Tone and visual energy refinement

Planned changes:

- Increase expressive visual character in hero and transitions (without adding heavy custom animation complexity).
- Tune typography rhythm to reduce "corporate brochure" feel (larger headings, shorter scan lines, punchier labels).
- Final SEO copy update to align with revised concise narrative.

Acceptance criteria:

- Homepage feels distinctly "music tool for makers" rather than generic SaaS.
- Accessibility baseline preserved (contrast, semantic headings, reduced-motion fallback).

Execution target files:

- `src/app/features/backbone/home/home.component.html`
- `src/app/features/backbone/home/home.component.scss`
- `src/app/features/backbone/home/home.component.ts` (SEO copy only, if needed)
- `src/app/features/backbone/home/home.module.ts` (only if import cleanup needed)
