<!-- Section: INFRA (independent; pick any time a product task is blocked) -->

# Bug — Rack module sizing and analysis-overlay regressions

## Status

Open. Backlog intake from feature-notetaker. Reported as production-visible
regressions around rack module sizing and analysis-only visual state:

1. A freshly added 3U module (e.g. a 6 HP utility next to a 15 HP "shard")
   renders ~2x its natural height when it sits in a row whose visual shell is
   taller than a single 3U slot.
2. Quick blank creation chooses a 3U blank in a predominantly 1U row; it should
   choose the blank format by the majority module standard in the target row.
3. With analysis mode off and editing mode on, analysis-only opacity
   highlighting and per-module HP badges are still visible. Those overlays
   should only apply while layout analysis is active.

## User intent

> "New modules should not be stretched, even if they are positioned in a 3U
> or other standards row. On production right now this is not happening, so
> we should add a regression test as well."
>
> "The quick blank creator should create blanks for the appropriate size. Right
> here I have only 1U modules, so the blank should be 1U as well... If the
> major proportion, like more than 50 percent of modules are 1U, make 1U blank.
> If 3U make 3U blank and so on."
>
> "If I am in analysis mode off and the editing mode on, I should not have this
> conditional opacity highlighting. Also remove the HP sizing for each module
> as well. This is a regression because this logic should only apply to the
> layout analysis, which now works fine."

Restated: a module's panel must always render at the natural geometry for its
own `standard` (3U → 25.4 rem tall, Intellijel 1U → 7.84 rem, Pulp Logic 1U →
8.54 rem) regardless of what other modules share the same row; blank creation
must match the dominant standard of the row it fills; and analysis overlays
must not leak into normal editing. The fix is a two-part contract —
(1) production code stops the regressions, (2) regression tests pin the
contracts so they cannot silently regress again.

## Product / roadmap fit

- **Tier 0, solo-core hardening.** Rack accuracy is part of Patcher's
  solo-tool foundation (see `product/PRINCIPLES.md` → "Solo core must never
  regress"). Visually misrepresenting a module's panel breaks the implicit
  promise that the rack view is a faithful representation of the real
  hardware.
- **Compounding principle (ROADMAP.md).** Multiple downstream features —
  rack image preview/share, rack comparison, balance/function analysis
  overlays, marketplace listing thumbnails, and the docs screenshot
  pipeline — all consume the same `app-module-realistic` host. A stretched
  module or leaked analysis overlay pollutes every one of those surfaces.
- **Trust layer for community share.** Once public profiles / shared racks
  ship, an incorrectly proportioned panel becomes the first thing other users
  see, which directly contradicts the "global catalogue data is a shared
  resource" stance in PRINCIPLES.

This is the third "wrong module proportions" bug in the recent past
(`bug-1u-module-placeholder-wrong-aspect-ratio`, the rack-detail 1U height
fix in CHANGELOG, and now this one). The recurrence pattern itself argues
for an explicit, named regression suite around module-vs-row geometry.

## Current system analysis

Confirmed by inspection:

- `app-module-realistic` sets its host size with two `@HostBinding` styles
  (`module-realistic.component.ts`):

  ```ts
  @HostBinding('style.width.rem')  get hostWidthRem()  { return this.data?.hp ?? 0; }
  @HostBinding('style.height.rem') get hostHeightRem() { return getModuleHeightForStandard(this.data?.standard); }
  ```

- The host SCSS declares `:host { display: block; flex: 0 0 auto; }`.
- The row container is `.rackRow { display: flex; width: 100%; }`
  (`rack-visual-model.component.scss`). It does **not** set
  `align-items`, so flex defaults to `align-items: stretch`.

When the flex parent is `stretch` and the child sets only `style.height.rem`
**but no `align-self`**, browsers in some layout contexts (notably when the
row is also constrained by a taller sibling element or by a parent column
container without an explicit cross-axis size) will treat the rem height as a
preferred size and still stretch the child to the row's content height. This
matches the visual evidence in the attached screenshot: the entire bottom
row is taller than the top row, and both modules in the bottom row are
stretched to that row height — proportional to each other but inflated.

Other likely contributing factors to verify during implementation:

1. The host height binding uses **rem** (size units), while the row's
   tallest sibling may be a 1U/utility module that has a sticky overlay or
   blank-strip pushing the row's content box height beyond 3U.
2. `module-realistic.component.scss` `.root { height: 100% !important; }`
   makes the inner panel surface follow whatever the host stretches to. If
   the host stretches, the panel image stretches with it.
3. Panel image rendering (`module-part-image.component`) further uses
   `object-fit: fill` in `surface` mode, which means a stretched container
   distorts the panel art rather than letterboxing.
4. `app-module-realistic` is rendered from three call sites — rack visual
   model, patch editor, and the in-component preview. Any fix must hold in
   all three.

Additional regression surfaces from follow-up screenshots:

1. Quick blank creation currently appears to select a generic/3U blank even
   when the target row is mostly 1U modules. The algorithm should infer the
   target blank `standard` from the row population: if more than 50 percent of
   occupied modules in that row are Intellijel 1U, create an Intellijel 1U
   blank; if more than 50 percent are 3U, create a 3U blank; and so on for
   other supported standards. Ties or empty rows need an explicit fallback
   decision.
2. The rack view has two independent state toggles: editing mode and analysis
   mode. Conditional opacity highlighting, de-emphasized non-selected modules,
   and per-module HP labels are layout-analysis affordances. They should be
   rendered only when layout analysis is active, not merely because the rack is
   editable or a module is selected/hovered.

Geometry source of truth is already centralised in
`module-format-geometry.constants.ts` and exposed via
`getModuleHeightForStandard()` — the fix should reinforce that source, not
duplicate it.

## Future strategy

- Treat module panel geometry as a **hard invariant**, not a layout hint.
  A module of standard `S` and width `HP` must always be exactly
  `HP rem × heightRemFor(S)` regardless of context. Code should be
  defensive on both the producing side (`app-module-realistic` host) and
  the consuming side (rack row, patch editor, future preview surfaces).
- Establish a small, named "module geometry regression" test cluster so the
  invariant is checked once for every relevant surface. Future surfaces
  (marketplace thumbnails, comparison view, share-card renderer) plug into
  the same suite.
- Once the underlying lock-in is in place, the same approach can later
  remove a few `!important` rules that exist today only because the host
  isn't reliably sized.
- Treat analysis overlays as a separate presentation layer gated by the
  analysis state, not by editability. Editing affordances and analysis
  affordances should be independently testable.

## Goals

1. A 3U / 1U / tile module placed in **any** row never renders taller (or
   wider) than its natural geometry as defined in
   `module-format-geometry.constants.ts`.
2. Rows of mixed format (3U + 1U + tile) lay their children out at the
   children's natural heights — vertical alignment within the row is
   product-decided polish, not an emergent flex side-effect.
3. A regression test pins the invariant for the rack visual model, the
   patch editor, and `app-module-realistic` in isolation, so a future
   layout refactor cannot reintroduce the bug silently.
4. Quick blank creation chooses a blank module standard from the majority
   standard of modules in the target row when a majority exceeds 50 percent.
5. When analysis mode is off, normal editing mode shows modules at normal
   opacity and hides analysis-only HP badges / sizing labels.

## Non-goals

- Redesigning vertical alignment of mixed-format rows (e.g. whether a 1U
  strip should sit above, below, or centered next to a 3U module). That is
  a separate UX decision — this bug only requires that no module is
  stretched.
- Changing the geometry constants themselves or introducing a new format.
- Adding new visual treatments for "wrong format in row" states.
- Reworking the layout-analysis feature itself; layout analysis currently
  works and should keep its opacity / HP-size affordances while active.
- Migrating off Angular FlexLayout (out of scope; only required if the
  root cause is flex-specific and unfixable).

## Assumptions

- The screenshot is accurate and the regression is currently on production
  `production` (per the user). Verification belongs in the implementation
  phase, not in this plan.
- `module-format-geometry.constants.ts` heights are correct (validated by
  the recent 1U placeholder fix and existing ratio specs); the bug is in
  enforcement, not in the constants.
- The fix is CSS / template-level. No backend, schema, or data-model
  change is expected for the stretch / overlay bugs.
- The blank variants for 1U and 3U already exist, per the user. If an expected
  blank variant is missing, implementation should surface that explicitly
  rather than silently falling back to the wrong format.
- `pnpm test-headless --include="**/rack-visual-model.component.spec.ts"`
  and the existing `module-realistic.component.spec.ts` are the right
  homes for the regression test.

## Dependencies and sequencing

- **No external dependencies.** Self-contained UI fix.
- Lands cleanly alongside existing rack-editor work; do not bundle with
  any layout / remix refactor in flight.
- Should land **before** the docs screenshot pipeline refresh
  (`docs-screenshot-pipeline-refresh.md`) so refreshed screenshots
  capture correct geometry.

## MVP layer

- Inspect the live behaviour: load a rack that mixes a 15 HP 3U module and
  a 6 HP 3U module in a row that also contains a different-format module
  (or any other element that inflates the row's content height). Capture
  the actual rendered host height of the offending `app-module-realistic`.
- Add the missing layout constraint that prevents flex stretching:
  - First-choice fix: set `align-items: flex-start` (or `flex-end`,
    decided in implementation) on `.rackRow`, and `align-self: flex-start`
    on `app-module-realistic`'s `:host`, so the host's explicit
    `style.height.rem` is treated as a final size.
  - Confirm with DOM inspection that the rendered `clientHeight` matches
    `getModuleHeightForStandard(standard) * 16` px (assuming 1 rem = 16
    px in the test viewport).
- Repeat the same fix at the second call site (`patch-editor.component.html`)
  and the in-template preview.
- Update quick blank creation so the selected blank standard is derived from
  the target row's occupied modules:
  - More than 50 percent Intellijel 1U modules → create/use a 1U blank.
  - More than 50 percent 3U modules → create/use a 3U blank.
  - More than 50 percent Pulp Logic 1U modules → create/use a Pulp Logic blank
    if available.
  - No majority / empty row → use the current explicit row standard if one is
    available; otherwise keep the existing default and log the decision.
- Gate conditional opacity classes and HP-size labels behind the layout
  analysis active state. Editing mode alone must not enable those visual
  treatments.

## Structural layer

- Add a named regression test:
  - In `rack-visual-model.component.spec.ts`, render a row that contains
    one 15 HP 3U module **plus** one element that would have stretched
    the row in the broken state (e.g. a 1U strip via the existing test
    rack fixture, or a tall blank). Assert that
    `app-module-realistic[data-rack-module-key="…"]` has
    `getBoundingClientRect().height` equal to
    `VISUAL_3U_MODULE_HEIGHT_REM * 16` within a 1-px tolerance.
  - In `module-realistic.component.spec.ts`, add an isolated test that
    wraps the component in a `display: flex; align-items: stretch;
    height: 50rem;` parent and asserts the host's actual rendered height
    still equals `getModuleHeightForStandard(standard)` rem for each of
    {3U, Intellijel 1U, Pulp Logic 1U}. This is the layout-context
    regression guard.
- Optionally extract a tiny test helper
  `expectModuleHostNaturalHeight(fixture, key, standardId)` so future
  surfaces can reuse it.
- Add quick blank selection tests with row fixtures for:
  - mostly 1U modules → 1U blank,
  - mostly 3U modules → 3U blank,
  - no >50 percent majority → documented fallback.
- Add rack visual state tests proving:
  - analysis off + editing on does not apply conditional opacity highlighting,
  - analysis off + editing on does not render per-module HP badges,
  - analysis on still renders the opacity / HP-size affordances used by layout
   analysis.

## Polish layer

- Sweep `module-realistic.component.scss` and remove any `!important`
  rules that exist solely to defend against host stretch (only after the
  structural fix is proven safe).
- Add a short comment block above the host bindings in
  `module-realistic.component.ts` documenting the invariant and linking
  to the regression test, so the next reader understands why the host
  must never be stretched.
- Consider documenting "module geometry is a hard invariant" in
  `internaldocs/patterns/UI_PATTERNS.md` (one short paragraph).

## File / surface map

- **Production code (likely touch):**
  - `src/app/components/rack-parts/rack-editor/rack-visual-model/rack-visual-model.component.scss` — `.rackRow` cross-axis alignment.
  - `src/app/components/module-parts/module-realistic/module-realistic.component.scss` — `:host` `align-self`.
  - `src/app/components/module-parts/module-realistic/module-realistic.component.ts` — invariant comment above host bindings.
  - `src/app/components/patch-parts/patch-editor/patch-editor.component.html` — verify same protection (no stretch in patch-editor rows).
- **Tests (must touch):**
  - `src/app/components/rack-parts/rack-editor/rack-visual-model/rack-visual-model.component.spec.ts` — mixed-row regression.
  - `src/app/components/module-parts/module-realistic/module-realistic.component.spec.ts` — isolated stretch guard.
  - Existing quick-blank creation spec or nearest rack-editor data-service spec — majority-standard blank selection.
  - Existing layout-analysis / rack visual model spec — analysis-only opacity and HP-badge gating.
- **Reference (read, don't touch):**
  - `src/app/components/module-parts/module-format-geometry.constants.ts`
  - `src/app/components/module-parts/get-module-height-for-standard.pipe.ts`
- **Docs (optional touch):**
  - `internaldocs/patterns/UI_PATTERNS.md` — short invariant note.

## Acceptance criteria

1. Loading the rack from the reproduction screenshot in dev shows the 6 HP
   module and the 15 HP "shard" module at standard 3U height — visually
   identical in height to the modules in the top row.
2. `pnpm test-headless --include="**/rack-visual-model.component.spec.ts"`
   includes a passing test that fails on `production`'s current behaviour
   if reverted (verified by temporarily backing out the SCSS fix during
   development).
3. `pnpm test-headless --include="**/module-realistic.component.spec.ts"`
   includes a passing isolated-stretch test for all three supported
   standards (3U, Intellijel 1U, Pulp Logic 1U).
4. Quick blank creation in a row where more than 50 percent of occupied
   modules are 1U creates a 1U blank; the same majority rule is covered for
   3U and any other supported blank standard.
5. With analysis mode off and editing mode on, rack modules render at normal
   opacity and do not show analysis HP badges / size labels.
6. With layout analysis active, the existing opacity highlighting and HP-size
   labels still appear and layout analysis still behaves as before.
7. `pnpm lint` passes (no new lint debt, especially around `px-ok` /
   layering baselines).
8. A Playwright snapshot of a representative mixed-format rack confirms
   no module is stretched, per the `patcher-ui-debug` workflow in
   AGENTS §12.

## Validation strategy

1. **Repro first.** Use `scripts/dev/agent-snapshot.mjs` against the rack
   in the screenshot (or a synthetic equivalent) to capture the broken
   state before any change.
2. **Apply MVP fix.** Re-snapshot and DOM-inspect host height.
3. **Add regression tests.** Confirm new tests fail without the fix and
   pass with it (commit the fix-out / fix-in toggle proof in the decision
   log).
4. **Regression-cover quick blanks.** Use a mostly-1U row fixture and assert
   that the created blank standard is 1U; include mostly-3U and no-majority
   cases.
5. **Regression-cover analysis gating.** Toggle analysis off/editing on and
   assert no opacity-dimming or HP labels; toggle analysis on and assert the
   analysis visuals still appear.
6. **Smoke the other surfaces.** Manually open `patch-editor`, the rack
   preview generator, and the module browser cards — confirm no
   side-effects.
7. **Run** `pnpm lint && pnpm test-headless --include="**/rack-visual-model.component.spec.ts" --include="**/module-realistic.component.spec.ts"`.
8. **Capture an after-screenshot** and attach to the PR for reviewer
   sanity check.

## Risks and open questions

1. **Cross-axis decision.** Should mixed-format rows align modules at the
   top of the row, the bottom (rail-mounted look), or centered?
   Implementation should pick a sensible default and call it out in the
   decision log; UX can refine later.
2. **Snapshot drift.** If the docs screenshot pipeline runs before this
   fix lands, its outputs will look stretched. Coordinate ordering so the
   pipeline refresh consumes the fixed view.
3. **`!important` audit.** Removing defensive `!important` rules in
   `module-realistic.component.scss` is polish-layer only — if it
   uncovers a different stretch path, fall back to keeping them and log
   the finding.
4. **Other surfaces.** Rack preview image generation, rack comparison,
   and any future thumbnail render path should be confirmed not to bypass
   `app-module-realistic`. If any of them render modules differently, the
   invariant must also be wired there or the bug will resurface.
5. **Test 1 rem ≠ 16 px assumption.** If the test environment ever
   changes root font size, the regression tests should derive expected
   px height from `getComputedStyle(document.documentElement).fontSize`
   rather than hard-coding 16.
6. **Blank fallback policy.** The user gave a clear >50 percent rule, but
   no-majority rows still need a deterministic fallback. Prefer the row's
   declared standard if present; otherwise keep existing default behaviour and
   document it in the decision log.
7. **Overlay state ownership.** If opacity / HP badges are currently driven by
   a shared "selected" or "editable" state, implementation should split or
   rename the state rather than layering another boolean check over ambiguous
   naming.

## Coordinator-loop handoff

- This plan is **ready** for `coordinator-loop` to pick up directly. No
  prerequisite plans need to land first.
- Suggested execution slice for the loop:
  1. Reproduce on a synthetic rack fixture and capture broken snapshot.
  2. MVP-layer SCSS / template fix.
  3. Quick-blank majority-standard fix and tests.
  4. Analysis-overlay gating fix and tests.
  5. Structural-layer regression tests (rack visual model + isolated
     module-realistic).
  6. Polish sweep (only if quick and clearly safe).
  7. `pnpm lint && pnpm test-headless` of the affected specs +
     `agent-snapshot` confirmation.
- Reviewer expectation: visual diff in the PR description (before / after
  screenshots) and one paragraph confirming the new tests fail without
  the production fix.

## Decision log

- 2026-06-18 — Plan created by feature-notetaker from a user screenshot
  showing a 15 HP "shard" and a 6 HP module stretched ~2× tall in a
  mixed-format row on production. Routed to INFRA (matches prior
  `bug-*` plan placement) at HIGH priority because (a) the regression is
  live on `production`, (b) it falsifies the rack-faithfulness promise
  that underpins multiple Tier 0/2 features, and (c) recurrence of
  module-geometry bugs argues for a named regression test, not just a
  one-shot fix.
- 2026-06-18 — Expanded the plan with two follow-up production regressions
  from user screenshots: quick blank creation should choose 1U/3U/other blank
  format by the >50 percent majority standard in the target row, and
  layout-analysis opacity / HP-size overlays must be hidden when analysis is
  off even if editing mode is on. Kept this as one HIGH infra bug plan because
  all three issues share the rack visual geometry / analysis presentation
  surface and need coordinated regression coverage.
