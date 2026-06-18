<!-- Section: INFRA (independent; pick any time a product task is blocked) -->

# Bug — Rack layout arrangement count is sometimes negative / overflowed

## Status

Open. Backlog intake from feature-notetaker. Reported as a production-visible
regression in the Rack Editor's floating **Layout analysis** panel: the
"sampled valid arrangements" line periodically renders a *negative*
integer (e.g. `-1,139,371,499,222 sampled valid arrangements.`), even though
the layout above it correctly reports as valid with leftover HP. A negative
count is mathematically impossible for an arrangement enumeration and
silently destroys user trust in every other number the analysis panel
shows.

Reference: user-supplied screenshot dated 2026-06-18 showing the literal
text "Valid layout with 10HP spare across the current rows." immediately
followed by "−1,139,371,499,222 sampled valid arrangements."

## User intent

> "This is another bug that needs fixing. The combination count is often
> wrong."

Restated: the **arrangement / combination count** shown in the floating
Layout analysis panel must always be a non-negative integer, must be
honest about whether it is *exact* or *sampled / estimated*, and must
remain stable and readable for the high-cardinality racks that real
users build (≥ 60 modules across many rows). Today the same panel that
correctly tells the user their layout fits also tells them there are
roughly minus a trillion arrangements of it; that combination undermines
the analysis surface as a whole.

## Product / roadmap fit

- **Tier 0, solo-core hardening.** The Rack Editor and its analysis
  panel are part of the solo-tool foundation (see
  `product/PRINCIPLES.md` → *"Solo core must never regress"*). A
  visibly wrong number on a feature that was specifically introduced
  to give users confidence in their rack layout is a direct regression
  of that promise.
- **Compounding principle (`ROADMAP.md`).** The same
  `computeLayoutAnalysis()` powers multiple downstream surfaces and
  upcoming work: Remix / auto-arrange (already shipped), Layout panel
  scope selector, the eventual Shuffle action, and later confidence
  intervals. Every consumer inherits this overflow / sign bug
  unchanged — fixing it once benefits all of them.
- **Trust layer for community share.** Once public profiles and shared
  racks ship, the analysis panel becomes a visible artefact when other
  users open someone else's published rack. Negative arrangement counts
  there read as "this app is broken", which is far more damaging on a
  public surface than in the solo editor.
- **Backlog precedent.** Sits alongside the existing
  [`bug-new-modules-stretched-vertically-in-mixed-format-row.md`](./bug-new-modules-stretched-vertically-in-mixed-format-row.md)
  rack regression bundle — both are INFRA / HIGH and both demand
  regression tests as part of the fix because the surface has now
  regressed visibly more than once.

This is **not** a roadmap-extending feature; it is hardening of the
already-shipped Rack Editor Remix layout optimizer (see
[`plans/done/rack-editor-remix-layout-optimizer.md`](./done/rack-editor-remix-layout-optimizer.md)).

## Current system analysis

Pure analysis lives in
[`src/app/components/rack-parts/rack-layout-analysis.utils.ts`](../../../src/app/components/rack-parts/rack-layout-analysis.utils.ts).
The display layer is in
[`src/app/components/rack-parts/rack-editor/rack-editor.component.ts`](../../../src/app/components/rack-parts/rack-editor/rack-editor.component.ts)
(`layoutArrangementSummary()` + `formatArrangementCount()`).

Key shape of the computation today:

1. `computeLayoutAnalysis()` partitions modules by physical standard
   into "format groups". Each group is counted independently and the
   per-group counts are multiplied together:

   ```ts
   formatGroups.reduce(
     (product, group) => product * countExactArrangements(group.modules, rackHp, group.rowIndexes.length),
     1
   )
   ```

   and similarly for the `estimate` branch with `countEstimatedArrangements`.

2. `countExactArrangements()` runs a memoised recursive sum over
   `(moduleIndex, remainingHpByRow)` states. Counts accumulate as plain
   JavaScript `number` values via `count += countFrom(...)`. For a
   bounded module count (`group.modules.length ≤ 20`) gated by
   `MAX_EXACT_ARRANGEMENT_STATES = 100_000` row-state combinations.

3. `countEstimatedArrangements()` does a deterministic 1024-sample
   Monte-Carlo using an inline LCG (`(seed * 1664525 + 1013904223) >>> 0`).
   It then scales `(validSamples / sampleCount) * totalAssignments` where:

   ```ts
   const totalAssignments = Math.pow(targetRowCount, moduleHp.length);
   ```

   and finally returns `Math.max(1, Math.round(estimate))`.

4. `formatArrangementCount()` in the editor only guards
   `Number.isFinite(count)` and otherwise pipes through
   `count.toLocaleString()`. There is **no** sign guard, no clamp to
   `[0, Number.MAX_SAFE_INTEGER]`, and no display ceiling.

Why a negative number can show up despite Monte-Carlo sampling being
mathematically non-negative — root-cause hypotheses to investigate
(implementation must confirm the actual one before fixing):

- **H1 — float-precision corruption past `Number.MAX_SAFE_INTEGER`.**
  `Math.pow(rowCount, moduleHp.length)` for realistic racks
  (e.g. 8 rows × 60 modules) is `8^60 ≈ 1.77 × 10⁵⁴`, far above
  `2⁵³`. Once `totalAssignments` is no longer integer-representable,
  multiplications and `Math.round` produce values whose displayed
  digits are nonsense. While IEEE-754 multiplication does not produce
  negatives from positive inputs, the *product* across multiple
  format groups can pass through `Number.MAX_VALUE` and become
  `Infinity` or `NaN` in adjacent code paths.
- **H2 — accidental signed-32-bit truncation.** A bitwise operator
  (`| 0`, `<< 0`, `>>> 0`, `Math.imul`, or a similar coercion) applied
  anywhere along the count pipeline silently converts a 53-bit float
  to a 32-bit signed int, producing values in `[-2³¹, 2³¹ - 1]`. The
  reported magnitude `1.14 × 10¹²` is *outside* the signed-32-bit
  range, so direct truncation alone does not explain it — but a
  combination of float overflow plus a downstream signed coercion
  could.
- **H3 — multiplicative cancellation across groups.** The per-group
  reduce multiplies float64 estimates whose individual magnitudes can
  exceed safe-integer range; the resulting product may be `NaN` from
  `0 * Infinity` paths and then re-coerced by a caller that does not
  match the `Number.isFinite` guard.
- **H4 — LCG seed wraparound interacting with `% targetRowCount`.**
  `(seed * 1664525)` for a 32-bit `seed` reaches `~7.15 × 10¹⁵`, which
  is *below* `2⁵³`, so `>>> 0` does the right thing in isolation. But
  any future refactor that changed `>>> 0` to `| 0` would produce
  negative seeds. This is a maintenance-time landmine even if it is
  not the active cause.
- **H5 — data-side negatives.** A `module.hp` value that is `< 0` (bad
  catalogue data) would bypass `?? 0` and propagate into
  `totalAssignments` and the sampler. Lower likelihood, but cheap to
  defensively guard.

The implementing agent should reproduce the negative output first
(using the rack size class hinted at by the screenshot: a near-full
rack with ~30–80 modules where the sampled branch is taken), confirm
which hypothesis fires, and **then** pick the fix.

User-facing copy today:

- Exact branch: `"<N> valid arrangement[s] fit the current rows."`
- Sampled branch: `"~<N> sampled valid arrangements."`
- Empty: `"Add modules to estimate valid arrangements."`
- No-solution: `"No valid arrangement fits the current row set."`

The `~` prefix is the *only* signal that the number is estimated. The
word "sampled" is the second signal. There is no copy variant that
expresses "this is an extremely large number we are showing as an
order of magnitude" — which is what the underlying maths is silently
producing on real racks.

## Future strategy

Three layered concerns, in order of decreasing user-visible severity:

1. **Correctness floor — never display a negative or `NaN` arrangement
   count.** The estimator and the formatter must both refuse to emit
   anything outside `[0, …]`. This is the regression guard the user is
   asking for.
2. **Precision floor — extreme racks should be expressed honestly.**
   Once a count is beyond a reasonable display threshold (well below
   `Number.MAX_SAFE_INTEGER`) the panel should switch to either
   scientific notation (e.g. `~1.8 × 10⁵⁴`), an order-of-magnitude
   summary (e.g. `~10⁵⁴`), or a bounded "10⁵³+" capped form. Either
   way, the user must be told this is *order-of-magnitude information*,
   not a literal count.
3. **Truthfulness floor — exact vs estimate must be unambiguous.** The
   `~` prefix is easy to miss; the copy should make the *kind* of
   number explicit ("≈ N (sampled)" vs "exactly N", or equivalent)
   so the user is not misled into trusting an estimate as a literal
   count.

Out of scope for this fix (left to follow-up plans):

- Adding statistical confidence intervals to the estimate (already
  explicitly deferred in
  [`done/rack-editor-remix-layout-optimizer.md`](./done/rack-editor-remix-layout-optimizer.md)).
- Replacing the Monte-Carlo sampler with a smarter estimator.
- Showing arrangement counts on shared / public rack views.

## Goals

- The displayed arrangement / combination count is **never negative**,
  **never `NaN`**, and **never `Infinity`** under any input the
  Rack Editor can produce.
- For inputs that exceed safe-integer range, the panel renders an
  intentionally-bounded value (scientific notation, capped display,
  or an "order of magnitude" form) with copy that distinguishes
  *exact* from *sampled / estimated* counts.
- Implementation uses `bigint`, an intentional cap, or an approximation
  scheme — chosen deliberately and documented in the Decision log —
  never silently relying on float64 integer behaviour past `2⁵³`.
- Regression tests cover the three classes of inputs that previously
  produced wrong output: (a) high-cardinality racks whose estimate
  branch previously emitted a negative number, (b) zero / no-solution
  cases, (c) normal small racks where exact counts are still correct.

## Non-goals

- Changing the analysis algorithm itself (FFD, bitmask-style DP,
  Monte-Carlo sampling) beyond the minimum needed to make output
  numerically honest.
- Adding confidence intervals or any other new statistical metric.
- Any backend, schema, RLS, or migration change. This is a pure
  frontend numeric / display fix.
- Restyling the floating Layout analysis panel beyond the copy
  changes that are part of "honest exact vs sampled" presentation.
- Replacing the existing `~` prefix convention across other panels.

## Assumptions

- The bug is reproducible from the user's reported rack class (a
  realistic rack with enough modules per format group to force the
  `'estimated'` branch — typically `group.modules.length > 20` or
  enough rows × modules that `estimateExactArrangementStates` returns
  `Infinity`).
- The fix can live entirely in
  `rack-layout-analysis.utils.ts` plus the editor's
  `formatArrangementCount()` / `layoutArrangementSummary()`. No new
  data services, no backend, no schema.
- `bigint` is acceptable inside the analysis utility; if it crosses
  the boundary into the template, it is converted back to a
  display-only string at the formatter layer.
- Existing consumers of `RackLayoutAnalysisResult.validArrangementCount`
  (currently `number | 'estimated'`) and `estimate?: number` may
  need a typed widening (e.g. `bigint`, or a tagged display shape
  like `{ kind: 'exact' | 'estimate' | 'capped'; value: ... }`) — the
  implementing agent must verify each call site.

## Dependencies and sequencing

- **Hard dependency:** none. Pure frontend, no schema, no backend, no
  RLS. Can be picked up at any time.
- **Soft dependency:** the existing rack regression bundle
  [`bug-new-modules-stretched-vertically-in-mixed-format-row.md`](./bug-new-modules-stretched-vertically-in-mixed-format-row.md)
  also expands the rack analysis regression-test suite — if it is
  scheduled at the same time, both fixes should land their regression
  tests next to each other so the test file does not get split twice.
- **Touches:** the `Layout` analysis-mode floating panel that is
  visible in both the user's solo editor and (eventually) shared rack
  views.

## MVP layer

The smallest set of changes that makes the production-visible bug
disappear *and* prevents it from re-appearing.

- Reproduce the bug locally with a fixture that mirrors the user's
  rack class — enough modules per format group to force the
  estimate branch, with `targetRowCount` ≥ 4. Lock the seed sequence
  in the test so the failure is deterministic.
- In `countEstimatedArrangements()`:
  - Replace `Math.pow(targetRowCount, moduleHp.length)` with either
    `bigint` arithmetic or a guarded check that early-returns a
    sentinel "too large to count" value before any float overflow.
  - Ensure `(validSamples / sampleCount) * totalAssignments` never
    produces `NaN` / `Infinity` / a negative value on the way out.
  - Guard module HP at the input boundary
    (`Math.max(0, module.module.hp ?? 0)`).
- In `countExactArrangements()`:
  - If using float arithmetic, assert the running total stays within
    `Number.MAX_SAFE_INTEGER`; if it would not, switch to `bigint`
    or return the sentinel.
- In `computeLayoutAnalysis()`:
  - Widen the result type so callers can tell "exact" from "estimate"
    from "capped / too large" without overloading a number to mean
    all three.
- In `rack-editor.component.ts` `layoutArrangementSummary()` /
  `formatArrangementCount()`:
  - Refuse to render any non-finite or negative input — surface the
    capped form ("more than 10⁵³", "≥ 9 × 10¹⁵", or similar) instead.
  - Update the user-visible copy so *exact* vs *sampled* is
    unambiguous even for users who miss the `~` prefix.

## Structural layer

Changes that prevent the same class of bug from recurring under future
refactors.

- Introduce a typed shape for arrangement counts (e.g.
  `RackArrangementCount = { kind: 'exact'; value: bigint } | { kind: 'estimate'; value: bigint; capped: boolean } | { kind: 'impossible' } | { kind: 'unknown' }`)
  so the difference between "exact 12" and "sampled estimate" and
  "above display cap" is encoded in the type system, not in
  `number | 'estimated'`.
- Centralise the format / cap rules in a single
  `formatArrangementCount(count: RackArrangementCount): string` so
  the rule "must never be negative / NaN / Infinity" is enforced in
  exactly one place that has a focused unit test.
- Add a lint-style fixture test that asserts
  `formatArrangementCount(...)` over a battery of pathological inputs
  (`-1`, `NaN`, `Infinity`, `-Infinity`, `Number.MAX_SAFE_INTEGER + 1`,
  `0n`, `(2n ** 200n)`, `1`, `12`) always returns a non-negative
  human-readable string.

## Polish layer

Optional improvements once the correctness floor is in place.

- Tooltip / info icon on the arrangement-count line explaining
  exact-vs-estimate and the cap.
- Localisable copy strings for the cap form
  ("more than ~10⁵³ arrangements") so future i18n work does not have
  to retrofit them.
- Telemetry / Sentry breadcrumb when the analysis pipeline trips the
  "too large to count" branch in real user sessions, so we have
  evidence for whether the cap is ever hit on real racks.

## File / surface map

Surfaces likely to change (final list confirmed during implementation):

- `src/app/components/rack-parts/rack-layout-analysis.utils.ts`
  - `countExactArrangements`
  - `countEstimatedArrangements`
  - `estimateExactArrangementStates`
  - `RackLayoutAnalysisResult` type (potentially widened)
  - `computeLayoutAnalysis` return shape
- `src/app/components/rack-parts/rack-layout-analysis.utils.spec.ts`
  - New deterministic fixtures for the negative / overflow regression.
- `src/app/components/rack-parts/rack-editor/rack-editor.component.ts`
  - `layoutArrangementSummary`
  - `formatArrangementCount`
- `src/app/components/rack-parts/rack-editor/rack-editor.component.spec.ts`
  - New assertions on summary copy for the four classes: exact,
    sampled, no-solution, capped / too-large.

Surfaces explicitly *not* touched (write this into the Decision log
on completion):

- `RackDetailDataService` and its `layoutScope$` (this is purely a
  consumer of the analysis result).
- The Layout panel template wiring beyond the copy strings.
- Any Supabase / RLS / migration / RPC code path.

## Acceptance criteria

- The Rack Editor's Layout analysis panel never displays a negative
  arrangement count for any rack the editor can build.
- The Layout analysis panel never displays `NaN`, `Infinity`,
  `-Infinity`, or a malformed numeric literal.
- For racks whose true arrangement count exceeds the chosen safe
  display ceiling, the panel renders an intentional capped /
  scientific / order-of-magnitude form, accompanied by copy that
  identifies it as an estimate or upper-bounded value.
- Exact counts (today's "12 valid arrangements fit the current rows.")
  remain unchanged in form for the small-rack cases that already work.
- The user-visible distinction between *exact* and *sampled / estimated*
  counts is preserved or strengthened — never weakened.
- Existing passing tests in
  `rack-layout-analysis.utils.spec.ts` and
  `rack-editor.component.spec.ts` continue to pass without
  modification of their original assertions (regression-only test
  additions are allowed; rewriting existing assertions requires a
  Decision-log entry).
- New regression tests in `rack-layout-analysis.utils.spec.ts` cover
  at minimum: (a) the high-cardinality rack class that produced the
  reported negative value, (b) the zero / no-solution case, (c) the
  small-rack exact case, (d) a deterministic huge-count case that
  proves the capped / scientific form is reached.
- No production change to backend, schema, RLS, RPCs, edge functions,
  generated types, or migrations.

## Validation strategy

- `pnpm test-headless --include="**/rack-layout-analysis.utils.spec.ts"`
- `pnpm test-headless --include="**/rack-editor.component.spec.ts"`
- `pnpm lint`
- Manual visual smoke against a reproducer rack (steps captured in
  the Decision log when reproducing). For UI / visual confirmation,
  follow the [`patcher-ui-debug`](../../../.github/skills/patcher-ui-debug/SKILL.md)
  snapshot flow — open a rack matching the reported class and capture
  the Layout analysis panel after at least one module add / remove
  toggle.
- For the docs-only intake itself, validation is
  `node scripts/checks/check-docs.cjs`.

## Risks and open questions

- **Risk:** widening `RackLayoutAnalysisResult.validArrangementCount`
  from `number | 'estimated'` to a tagged union touches every caller
  in the editor; the LSP `findReferences` sweep must cover all
  `validArrangementCount` and `estimate` consumers before the type
  change lands.
- **Risk:** introducing `bigint` past the utility boundary can break
  Angular template binding (templates handle `bigint` poorly). The
  formatter must convert to `string` before the value reaches the
  template.
- **Risk:** changing the user-visible copy ("X valid arrangement[s]")
  may affect existing snapshot / e2e assertions; sweep with `grep`
  for the literal copy strings before edits.
- **Open question:** what is the right display cap? Candidate
  thresholds: `Number.MAX_SAFE_INTEGER` (most defensible), `10¹⁵`
  (clean decimal cap), `10⁹` (the point at which the digit grid is
  no longer scannable). The implementing agent should propose one
  and record the decision.
- **Open question:** should the cap form be presented as scientific
  notation (`~1.8 × 10⁵⁴`), an order-of-magnitude bound
  (`> 10⁵³ arrangements`), or a single word ("many"), or three
  separate forms based on which threshold is tripped? Designer-style
  preference: lean on the existing voice in
  [`DESIGN_LANGUAGE.md`](../../DESIGN_LANGUAGE.md).
- **Open question:** is the negative output deterministic on a given
  rack, or does the LCG seed sequence make it intermittent? Lock
  the answer in the regression test.

## Coordinator-loop handoff

- **Priority label:** `HIGH`.
- **TODO section:** `INFRA (independent; pick any time a product task
  is blocked)` — same section as the existing rack-regression bug.
  Frontend-only, no Tier dependencies.
- **Selection note for coordinator-loop:** this plan is *bounded* —
  the entire fix is in two files plus their specs, with no backend
  or schema risk. It is a strong candidate to pick during a window
  when product-tier work is blocked on upstream dependencies.
- **Reproduction note:** the screenshot evidence is in the user's
  attachments; the *rack class* hint is "Valid layout with 10HP
  spare across the current rows." with an estimated count near
  `1.14 × 10¹²`. The implementing agent should first synthesise an
  equivalent rack (≥ 30 modules per format group, all rows near
  capacity) before changing any production code, and pin that
  rack as a regression fixture.
- **Forbidden without explicit approval:** any change to Supabase
  RLS, schema, migrations, RPCs, or generated types. This bug must
  not require any of those.

## Decision log

<!-- Append timestamped one-liners as the plan progresses. -->

- **2026-06-18:** Plan created by feature-notetaker from a single
  reported regression screenshot (negative sampled arrangement count
  on an otherwise-valid rack). Backlog-only intake; no production
  code changed, no commit created, `CURRENT_FEATURE.md` left
  untouched. Filed under `INFRA / HIGH` to mirror the existing
  rack-regression bundle and to match the production-visibility
  threshold used for prior rack accuracy bugs.
