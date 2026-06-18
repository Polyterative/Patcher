# Bug — Comments composer "Add a comment" input is narrow inside a wide card

## Status

`[x]` Implemented — visual / layout polish on a live core surface, pending coordinator review.
No data, schema, or RLS work. Pure component-level SCSS (and possibly
shared `lib-mat-form-entity` host display) fix with regression coverage.

## User intent

> "Another bug — the input here should not have limited width. Doesn't look right."

User-supplied screenshot of the **COMMENTS** section on (most likely) a module
or rack detail page shows:

- A wide white card (`lib-hero-content-card` with the centred
  `.commentsRoot__rail`) hosting the empty state ("No comments yet — Be the
  first to share your thoughts!").
- Below it, the **"Add a comment"** Material form-field (textarea variant)
  rendered at a fixed intrinsic-ish width (~50% of the rail) anchored to the
  left edge with the trailing `×` clear button visible inside it.
- A right-aligned **POST COMMENT** button on its own row with "Ctrl + Enter
  to post" on the left.

The composer field's narrow box visually conflicts with the surrounding
full-width card and with the empty-state and "POST COMMENT" row above and
below it. The user wants the textarea to occupy the same horizontal extent
as the rest of the composer column.

## Product / roadmap fit

- Comments are an **explicit live, load-bearing community surface** per
  [`internaldocs/product/PRINCIPLES.md`](../../../product/PRINCIPLES.md):
  "Comments are in scope — on content, not on people. … Comments on
  patches, racks, and modules already exist and are a live feature."
- The same doc lists "future direction for comments: keep evolving them as
  a utility layer" — this polish bug directly supports that direction by
  making the composer feel like a credible utility, not a half-broken form.
- Visual coherence on every public-content detail page (module, rack,
  patch) protects the trust dividend the marketplace and price-hub features
  in [`internaldocs/product/ROADMAP.md`](../../../product/ROADMAP.md) will
  rely on.
- Aligns with [`internaldocs/DESIGN_LANGUAGE.md`](../../../DESIGN_LANGUAGE.md):
  "1px off is 1px wrong" / "every element on screen must earn its place".
  A narrow textarea inside a wide card is a precision regression — the
  rail's geometry says "this is the writable column"; the input must honour
  that geometry.

## Current system analysis

### Surfaces affected

`app-comments-root` is reused on every comment-bearing detail page:

- [`src/app/features/module-browser/module-browser-detail/module-browser-detail.component.html`](../../../../src/app/features/module-browser/module-browser-detail/module-browser-detail.component.html) (module detail)
- [`src/app/features/routes/rack/rack-browser-detail/rack-browser-detail-view.component.html`](../../../../src/app/features/routes/rack/rack-browser-detail/rack-browser-detail-view.component.html) (rack detail)
- [`src/app/features/patch-browser/patch-composite/patch-composite.component.html`](../../../../src/app/features/patch-browser/patch-composite/patch-composite.component.html) (patch detail)

Fixing the composer once in `app-comments-root` repairs all three.

### Layout chain

`app-comments-root` template
([`comments-root.component.html`](../../../../src/app/components/shared-atoms/comments/comments-root/comments-root.component.html)):

```text
lib-hero-content-card.comments-root-card
└─ div.col.gap2.commentsRoot
   └─ div.commentsRoot__rail   (width:100%; max-inline-size:var(--app-readable-section-max-width); margin-inline:auto)
      ├─ div.commentsRoot__list      (full rail width, white card with the empty state)
      └─ div.commentsRoot__composer  (display:grid; gap:.75rem; padding-block:1rem)
         ├─ div.commentsRoot__composerField   (min-width:0;  block-level grid child → 100% of rail)
         │   └─ lib-mat-form-entity
         │       └─ mat-form-field.layout-flex-full   ← suspect
         │           └─ textarea[cdkTextareaAutosize][matInput]
         └─ div.submit-row    (display:flex; justify-content:space-between → "Ctrl + Enter to post" / "POST COMMENT")
```

Relevant CSS already in place:

- `--app-readable-section-max-width: 49.3rem` (set in
  [`src/styles.scss`](../../../../src/styles.scss)) — sets the rail's maximum
  inline size to ~789 px, so the composer column is bounded but still wide
  enough to need a full-width textarea.
- `.commentsRoot__rail { max-inline-size: var(--app-readable-section-max-width); margin-inline: auto; }`
  ([`comments-root.component.scss`](../../../../src/app/components/shared-atoms/comments/comments-root/comments-root.component.scss)).
- `.commentsRoot__composer { display: grid; gap: 0.75rem; padding-block: 1rem; }` — single-column
  grid; every grid item should naturally stretch to the rail's inline size.
- `.commentsRoot__composerField { min-width: 0; }` — block-level grid child,
  no width constraint of its own.
- `.layout-flex-full { flex: 1 1 100%; max-width: 100%; }`
  ([`src/app/style/tools-utilities.scss`](../../../../src/app/style/tools-utilities.scss))
  applied to `mat-form-field` inside `lib-mat-form-entity`'s template
  ([`mat-form-entity.component.html`](../../../../src/app/shared-interproject/components/@smart/mat-form-entity/mat-form-entity.component.html)).

### Root-cause hypotheses (in order of likelihood)

1. **Primary: `mat-form-field` defaults to `display: inline-block`.**
   - `.layout-flex-full` only meaningfully applies when the parent is a
     flex container. `.commentsRoot__composerField` is a plain `div`
     (block-level grid child), so `flex: 1 1 100%` is inert.
   - The result is that `mat-form-field` shrinks to its intrinsic
     `inline-block` width (≈textarea's default ~20–25em), anchored to the
     left of the grid cell — exactly what the screenshot shows.
   - **Likely fix:** make `lib-mat-form-entity` (host) and/or the nested
     `mat-form-field` `display: block; width: 100%` inside
     `.commentsRoot__composer` (or globally on `lib-mat-form-entity` host
     if no regressions elsewhere — see Risks).
2. **Secondary: `lib-mat-form-entity` host has no `display` rule.**
   - `mat-form-entity.component.scss` only sets a CSS custom property on
     `:host`; the host element therefore inherits its display from the
     consumer context. In a flex container it stretches; in a block /
     grid context it acts as `inline`.
   - Adding `:host { display: block; width: 100%; }` (or using a more
     scoped wrapper in the composer) would resolve this without touching
     every consumer.
3. **Tertiary: the textarea has an implicit `cols` (~20) intrinsic width.**
   - Even with the form-field block-level, the textarea's intrinsic
     width can leak through if the `mat-form-field-infix` doesn't stretch.
     If `(1)` and `(2)` don't fully expand the field, an additional
     `::ng-deep .commentsRoot__composer .mat-mdc-form-field { width: 100%; }`
     (scoped to the composer) and/or `cols="1"` on the textarea may be
     needed as a belt-and-braces fix.

The implementing agent must verify which combination is sufficient via the
patcher-ui-debug snapshot before committing.

### What the screenshot is *not* telling us

- We do not have the viewport width annotated. The snapshot looks like
  ≥1280 px (the rail appears centred in a wider card chrome). Mobile
  (`<36rem`) is unverified; the responsive `@media (max-width: 48rem)`
  branch in `.submit-row` shows mobile was considered but the composer
  field width itself is not media-conditional.
- We do not see the field in a filled / multi-line state. The
  `cdkTextareaAutosize` directive handles vertical growth, not horizontal
  expansion, so vertical autosize is unrelated to this bug but must be
  preserved by the fix.

## Future strategy

Per [`internaldocs/product/PRINCIPLES.md`](../../../product/PRINCIPLES.md) the
comment composer is going to keep accumulating utility-layer upgrades
(realtime refresh, short edit window, reporting, possibly reply threads).
Each of those will hang UI off the same composer. Fixing the geometry now
— so the composer occupies the full writable column with predictable
gutters — turns it into a stable mounting surface for those future
upgrades instead of a brittle one that needs re-fitting every time.

Strategy:

- Treat `.commentsRoot__rail` as the single canonical "writable column"
  inside the comments surface; every interactive child (list, composer,
  load-more, future reply form) renders at full rail width with consistent
  inline padding.
- Treat `lib-mat-form-entity` as a **block-level** form primitive going
  forward. Its current "stretches in flex, collapses in block" behaviour
  is a footgun for any future card-style form layout, not just this one.

## Goals

- The **Add a comment** textarea's outer `mat-form-field` occupies the
  same inline extent as the comment list / empty-state card above it (i.e.
  the full `.commentsRoot__rail` width minus any deliberate gutter).
- Visual rhythm of the composer matches the rest of the card: the
  composer field, the "Ctrl + Enter to post" hint, and the
  POST COMMENT button align to the same left / right edges.
- Behaviour holds across the three current consumers (module detail, rack
  detail, patch detail) without per-consumer overrides.
- Responsive behaviour is preserved at narrow widths: no horizontal
  overflow, no scrollbar leakage, no truncation of the floating label.
- `cdkTextareaAutosize` continues to grow the textarea vertically as the
  user types.

## Non-goals

- No redesign of the comment list, empty state, load-more button, or
  POST COMMENT button.
- No change to comment max-length, validation, or submit semantics.
- No change to `--app-readable-section-max-width`; the existing rail
  geometry is correct, only the field inside it needs to honour it.
- No global rewrite of `.layout-flex-full`. It can stay; it just is not
  the right primitive in a non-flex parent.
- No change to `lib-hero-content-card` chrome.
- No new dependencies, no Angular Material upgrade, no schema changes.
- No autonomous Supabase / RLS / data work (`AGENTS.md §5`).

## Assumptions

- The screenshot is the live tip-of-`develop` behaviour, not a stale
  build; the implementing agent will re-snapshot before changing code.
- `--app-readable-section-max-width` (49.3 rem) is intentional and
  correct for both prose readability and composer width.
- `lib-mat-form-entity` is consumed in many places (the
  `mat-form-entity` filename appears across the codebase). Any change to
  its `:host` display must be regression-checked against at least the
  flex-parent consumers (forms in `module-browser`, login, etc.).
- The fix can be expressed as a small, additive SCSS change without
  touching `mat-form-entity.component.ts` logic.
- Existing co-located spec
  ([`comments-root.component.spec.ts`](../../../../src/app/components/shared-atoms/comments/comments-root/comments-root.component.spec.ts))
  is the right home for a regression assertion; an additional Playwright
  visual snapshot covers the rendered geometry.

## Dependencies and sequencing

- **Hard dependency:** none — the layout primitives, rail variable, and
  consumer surfaces all already exist.
- **Soft dependency:** any in-flight refactor of `lib-mat-form-entity` or
  the comments composer (the implementing agent should
  `git log -- src/app/components/shared-atoms/comments` and
  `git log -- src/app/shared-interproject/components/@smart/mat-form-entity`
  before changing the host display rule).

Sequence:

1. Reproduce on `develop` via patcher-ui-debug snapshot of the comments
   composer on a wide viewport on at least one of: module detail, rack
   detail, patch detail.
2. Diagnose: confirm which of the three root-cause hypotheses applies
   (devtools-inspect the `mat-form-field`'s computed `display` and
   `width`).
3. Implement the **smallest scoped fix** first (composer-scoped
   `width: 100%; display: block;` rules on the form-field). Snapshot.
4. Only if step 3 is insufficient or visually messy, escalate to
   `:host { display: block; width: 100%; }` on `lib-mat-form-entity`
   itself; if so, regression-check at least one form-heavy consumer
   surface (e.g. `module-adder`, login form) via snapshot.
5. Add or extend regression coverage (unit spec assertion + snapshot
   guard — see Validation).
6. Run `pnpm lint`, targeted `pnpm test-headless`, and
   `node scripts/checks/check-docs.cjs`.

## MVP layer

The minimum that resolves the user's reported bug:

- A scoped SCSS rule in
  [`comments-root.component.scss`](../../../../src/app/components/shared-atoms/comments/comments-root/comments-root.component.scss)
  that forces `lib-mat-form-entity` and its inner `mat-form-field` to
  block-level full width inside `.commentsRoot__composerField`, e.g.
  (illustrative — implementing agent picks the exact selectors):

  ```scss
  .commentsRoot__composerField {
    min-width: 0;
    display: block;

    lib-mat-form-entity,
    ::ng-deep .mat-mdc-form-field {
      display: block;
      width: 100%;
    }
  }
  ```

- Patcher-ui-debug snapshot before/after on at least one comment-bearing
  detail page at desktop width (≥1280 px) confirming the textarea now
  spans the rail.
- An assertion in
  [`comments-root.component.spec.ts`](../../../../src/app/components/shared-atoms/comments/comments-root/comments-root.component.spec.ts)
  that the composer field element's `getBoundingClientRect().width`
  equals (within a tolerance) the rail's inline width when both are
  rendered in the same fixture.

## Structural layer

If the MVP scoped fix has to escalate to a global change:

- Add `:host { display: block; width: 100%; }` (or `inline-size: 100%;`)
  to
  [`mat-form-entity.component.scss`](../../../../src/app/shared-interproject/components/@smart/mat-form-entity/mat-form-entity.component.scss).
- Document the change in
  [`internaldocs/patterns/UI_PATTERNS.md`](../../../patterns/UI_PATTERNS.md)
  (or the closest existing UI primitive doc) so future authors know
  `lib-mat-form-entity` is a block-level form primitive.
- Snapshot a sampling of consumer surfaces (one form-in-flex, one
  form-in-grid, one form-in-block) to confirm no regressions.

If the MVP fix is enough, skip this layer entirely — keep the change
local to the comments composer.

## Polish layer

- Add a tiny inline gutter (e.g. `padding-inline: 0.25rem` on
  `.commentsRoot__composer`) only if the field's outline visually kisses
  the rail edges and looks pinched against the surrounding card chrome.
  Decide empirically from the post-fix snapshot.
- Verify that the `×` clear button (`matSuffix mat-icon-button` from
  `mat-form-entity.component.html`) still aligns naturally inside the
  full-width field. If the suffix looks marooned at the far right when
  the field is empty, no change is needed — that is intended Material
  behaviour and matches the wider field geometry.
- Confirm the floating-label position (the red "Add a comment" label
  in the screenshot is the focus / error state colour, not a bug; the
  fix should not alter label colour or position).
- Cross-check the textarea autosize minimum row count
  (`cdkAutosizeMinRows="1"` in
  [`mat-form-entity.component.html`](../../../../src/app/shared-interproject/components/@smart/mat-form-entity/mat-form-entity.component.html))
  still renders at a sensible idle height after the width fix.

## File / surface map

Read-only inspection (implementing agent must read):

- [`src/app/components/shared-atoms/comments/comments-root/comments-root.component.html`](../../../../src/app/components/shared-atoms/comments/comments-root/comments-root.component.html)
- [`src/app/components/shared-atoms/comments/comments-root/comments-root.component.scss`](../../../../src/app/components/shared-atoms/comments/comments-root/comments-root.component.scss)
- [`src/app/components/shared-atoms/comments/comments-root/comments-root.component.spec.ts`](../../../../src/app/components/shared-atoms/comments/comments-root/comments-root.component.spec.ts)
- [`src/app/shared-interproject/components/@smart/mat-form-entity/mat-form-entity.component.html`](../../../../src/app/shared-interproject/components/@smart/mat-form-entity/mat-form-entity.component.html)
- [`src/app/shared-interproject/components/@smart/mat-form-entity/mat-form-entity.component.scss`](../../../../src/app/shared-interproject/components/@smart/mat-form-entity/mat-form-entity.component.scss)
- [`src/app/style/tools-utilities.scss`](../../../../src/app/style/tools-utilities.scss) (definition of `.layout-flex-full`)
- [`src/styles.scss`](../../../../src/styles.scss) (definition of `--app-readable-section-max-width`)
- [`internaldocs/DESIGN_LANGUAGE.md`](../../../DESIGN_LANGUAGE.md)
- The three consumer pages listed under **Surfaces affected**.

Likely write targets (MVP path):

- `src/app/components/shared-atoms/comments/comments-root/comments-root.component.scss` (scoped width fix).
- `src/app/components/shared-atoms/comments/comments-root/comments-root.component.spec.ts` (regression assertion).

Conditional write target (Structural path, only if MVP path proves
insufficient):

- `src/app/shared-interproject/components/@smart/mat-form-entity/mat-form-entity.component.scss` (`:host` block-display rule).
- `internaldocs/patterns/UI_PATTERNS.md` (one-line note documenting
  `lib-mat-form-entity` as block-level).

## Acceptance criteria

1. **Visual:** in the patcher-ui-debug snapshot of the comments composer
   on a desktop viewport (≥1280 px) on at least one comment-bearing
   detail page, the `mat-form-field` containing the "Add a comment"
   textarea has the same left and right edges as the comment list card
   above it (allowing only any deliberate gutter applied uniformly).
2. **No overflow:** in a snapshot at ≤480 px viewport, the composer
   field stays within the rail with no horizontal scrollbar on
   `<body>`, `.commentsRoot__rail`, or `.commentsRoot__composer`.
3. **Submit row preserved:** the "Ctrl + Enter to post" hint and the
   POST COMMENT button remain on the same row at desktop and stack /
   right-align per the existing `@media (max-width: 48rem)` rule at
   narrow widths.
4. **Behaviour preserved:** typing in the textarea grows it vertically
   via `cdkTextareaAutosize`; the `×` clear button still empties the
   control; `Ctrl + Enter` still calls `dataService.submitComment$.next`.
5. **Regression test added:** a new assertion in
   `comments-root.component.spec.ts` fails on the pre-fix code and
   passes on the post-fix code, anchoring the composer field's rendered
   width to the rail's rendered width (or asserting computed
   `display: block` and `width >= rail width * tolerance` on
   `mat-form-field`).
6. **No spec regressions:** existing assertions in
   `comments-root.component.spec.ts` continue to pass.
7. **No layering or lint regressions:** `pnpm lint` clean; if any custom
   check in
   [`scripts/checks/`](../../../../scripts/checks/) baseline was modified,
   justification recorded in `Decision log` per `AGENTS.md §11`.
8. **No backend touch:** no migration, no RLS change, no Supabase write
   in the diff.
9. **Three consumers visually confirmed:** module detail, rack detail,
   patch detail comment sections all render the composer at full rail
   width (one snapshot per page acceptable, or one snapshot plus visual
   inspection of the other two).

## Validation strategy

- **Reproduction snapshot:** `node scripts/dev/agent-snapshot.mjs` via
  the [`patcher-ui-debug` skill](../../../../.github/skills/patcher-ui-debug/SKILL.md)
  on `/module/<id>` (or `/rack/<id>` / `/patch/<id>`) at desktop width
  before any change, capturing the narrow-field bug.
- **Fix snapshot:** repeat the same snapshot after the fix to confirm
  full-rail width. Capture both desktop (≥1280 px) and mobile (≤480 px)
  viewports.
- **Unit regression:** extend
  [`comments-root.component.spec.ts`](../../../../src/app/components/shared-atoms/comments/comments-root/comments-root.component.spec.ts)
  with one assertion that the composer field's rendered width meets or
  exceeds the rail's rendered width (allowing for sub-pixel rounding).
  Run via `pnpm test-headless --include="**/comments-root.component.spec.ts"`.
- **Layering / lint:** `pnpm lint` (runs the layering, route-module, and
  px-in-ts checks per `AGENTS.md §11`).
- **Docs check:** `node scripts/checks/check-docs.cjs` after editing this
  plan and adding the index line — required for this intake task.
- **Optional e2e visual guard:** if the project already has a Playwright
  visual baseline for any of the three detail pages, refresh that
  baseline; otherwise do not introduce a new visual-snapshot test as
  part of this bug fix (out of scope unless `coordinator-loop` decides
  the surface is high-value enough to warrant one).
- **Manual cross-consumer check:** dev-server load the three consumer
  pages and visually confirm the composer is consistent (no per-page
  override is leaking through).

## Risks and open questions

- **Risk: global `lib-mat-form-entity` host change.** If the implementing
  agent escalates to the Structural layer and adds
  `:host { display: block; width: 100%; }` globally, several existing
  flex-row forms (login form, module-adder rows, search bars) may
  unexpectedly stretch to 100% and break tight inline layouts. Mitigation:
  start with the scoped MVP fix; only escalate after snapshotting at
  least one of each layout family (flex row, grid column, block) and
  confirming no regression.
- **Risk: `::ng-deep` rule fragility.** Angular's `::ng-deep` is
  deprecated; the existing `comments-root.component.scss` already uses
  it (lines 44–62), so the fix can follow the same pattern without
  worsening the technical debt. Worth noting in `Decision log` if any
  new `::ng-deep` rules are added.
- **Risk: post-fix idle height looks too tall.** Forcing the textarea to
  full width may visually amplify the empty single-row textarea. If so,
  consider whether `cdkAutosizeMinRows` should be raised to `2` for the
  composer specifically (composer-scoped, not global). Decide
  empirically from the snapshot.
- **Risk: focus / label colour misread.** The red label / outline in the
  screenshot is the Material focus or error state, not a colour bug.
  The fix must not change the colour theme; agents must verify the
  `mat-form-field` still uses the same `appearance` and `floatLabel`
  values from `lib-mat-form-entity`.
- **Open question: composer gutter.** Should the full-width composer
  field sit flush with the rail edges, or should the composer get a
  small inner gutter (e.g. `padding-inline: 0.5rem`) to mirror the
  comment list's `padding: 1rem`? Default answer: match the comment
  list's inline padding so the composer field's outline aligns with the
  list's inner content edge — but confirm visually.
- **Open question: textarea minimum rows.** If single-row looks too
  flat at full width, raise `cdkAutosizeMinRows` to `2` via a composer
  override or a new input on `lib-mat-form-entity`. Out of scope unless
  the snapshot shows it.
- **Open question: do we need a Playwright visual baseline?** Comments
  sit on three load-bearing detail pages; a visual baseline would catch
  future regressions cheaply, but adding one is a separate task scope.
  Recommendation: log a follow-up note only, do not add a baseline as
  part of this bug.

## Coordinator-loop handoff

When `coordinator-loop` picks this task it must:

1. Re-snapshot the bug on a comment-bearing detail page on `develop`
   first; record viewport width in `Decision log`.
2. Prefer the **MVP scoped SCSS fix** in
   `comments-root.component.scss`. Only escalate to a global
   `lib-mat-form-entity` host change after confirming the scoped fix is
   visually insufficient or structurally ugly.
3. If escalating, snapshot at least one flex-row consumer and one
   grid/block consumer of `lib-mat-form-entity` before and after.
4. Add the regression assertion to
   `comments-root.component.spec.ts` and run
   `pnpm test-headless --include="**/comments-root.component.spec.ts"`.
5. Run `pnpm lint` and `node scripts/checks/check-docs.cjs`.
6. Capture the before/after snapshot paths and the diagnosis in
   `Decision log` before committing.
7. Do **not** touch backend, RLS, migrations, or any data
   (`AGENTS.md §5`). Do **not** modify
   `--app-readable-section-max-width`.
8. On completion, move this plan to `done/`, add a one-line entry to
   `internaldocs/workflow/COMPLETED.md` with the date, and remove the
   thin-index line from `internaldocs/workflow/TODO.md` per
   `internaldocs/workflow/TODO.md` rules.

## Decision log

- 2026-06-18T14:51+02:00 — Plan created by `feature-notetaker` from a
  user-supplied screenshot of the COMMENTS section showing a narrow
  "Add a comment" textarea inside a wide hero-content-card on a detail
  page. Root-cause hypothesis recorded: `mat-form-field` is
  `display: inline-block` by default and `.layout-flex-full` is inert
  in a non-flex parent (`.commentsRoot__composerField` is a block-level
  grid child), so the field collapses to its intrinsic width inside the
  rail. Prioritised **MEDIUM** because comments are an explicit live
  community surface per `internaldocs/product/PRINCIPLES.md` but the
  bug is cosmetic / layout-only with no data, behavioural, or security
  impact, sitting alongside the existing MEDIUM tag-taxonomy bug rather
  than the HIGH rack-sizing bugs in `TODO.md`. No code, schema, or data
  changes during intake.
- 2026-06-18T18:10+02:00 — Frontend executor used the scoped MVP path in
  `comments-root.component.scss`: `.commentsRoot__composerField` now makes
  the `lib-mat-form-entity` host block/full-width, and a composer-scoped
  `::ng-deep` rule makes the nested `.mat-mdc-form-field` block/full-width.
  This preserves the shared `lib-mat-form-entity` host behavior elsewhere.
- 2026-06-18T18:12+02:00 — Runtime snapshot on the running dev server used
  authenticated `/modules/details/1734` at 1440×900 and 480×900. Measured
  rail/composer/form-field widths matched exactly (desktop: 605.44 px;
  mobile: 428.81 px) with `bodyOverflow: 0`; submit row remained flex and
  full rail width. Snapshot files were written under `.agent-snapshots/` for
  inspection and removed before handoff per coordinator instruction.
