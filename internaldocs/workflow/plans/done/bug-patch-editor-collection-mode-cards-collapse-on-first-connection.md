<!-- Section: INFRA (independent; pick any time a product task is blocked) -->

#### MAX PRIORITY: Bug — Patch editor collection-mode cards collapse to title-only after first connection

**Symptom:** In the patch editor (collection mode), once the user wires up
the first input/output on a module card, the affected card visually
collapses — only the module title remains visible, and the panel image plus
CV chip rows disappear. Subsequent interactions don't restore the inner
content. Reproduces with a real account that has modules in the collection;
the test/auth fixture used for E2E has an empty collection so Playwright
snapshots cannot reproduce it as-is.

**Status:** ARCHIVED — resolved and verified; see `../COMPLETED.md` for the
final regression summary.

**Context — what already changed (and was not enough):**

1. Restored `<app-module-composite>` rendering by re-importing
   `ModuleBrowserSharedModule` in
   `src/app/components/patch-parts/patch.module.ts` (regression from
   route-leakage lint commit `d67fa68a` which had stripped
   `ModuleBrowserModule`). This fixed an earlier "empty skeleton" symptom
   but is unrelated to the title-only collapse.
2. Stabilised `EditorModuleCard.trackingId` for single-instance cards in
   `src/app/components/patch-parts/patch-editor/patch-editor.component.ts`
   `buildEditorCards()` — changed from `inst?.id ?? -module.id` to
   always `-module.id` when `count <= 1`. Hypothesis was that
   `ensureModuleInstance$` auto-creating an instance on first CV click
   flipped trackingId from `-module.id` → `inst.id`, causing the @for
   loop to destroy + recreate the card subtree. The fix did not resolve
   the user-visible symptom, so this hypothesis is wrong (or incomplete).

**Likely real culprits to investigate (in priority order):**

- `module-cvs` / `module-cvitem` reactive pipelines that re-subscribe on
  `instanceId` changes — when the instance flips from `undefined` →
  defined, the @Input setter pushes to `instanceId$`, but downstream
  observables may complete or emit `[]` and never re-emit the CV list.
  Verify `userModulesList$` / module CV data is still resolved against
  `module.id` (not `instance.id`) and that the inner `combineLatest`
  doesn't gate on a stale value.
- Animation triggers in `module-minimal.component.html`
  (`@moduleDetailFadeEnter` etc.) leaving inner blocks at `opacity: 0`.
  Check whether change-detection after `ensureModuleInstance$` resolves
  triggers `:enter` on already-entered nodes, or whether there's a
  `void → *` mismatch with `BrowserAnimationsModule`. Recent migration
  from `angular-animations` lib (`1a5ee46b`) is suspicious.
- The `ModuleCompositeComponent` projection slot — `<app-module-details>`
  is `ng-content`-projected; if `ChangeDetectionStrategy.OnPush` is on
  the wrapper and the `instanceId` input doesn't propagate as a new
  reference, projected children may not re-render.
- `patchEditingPanelOpenState$` or another global state Subject toggling
  the wrapping container's visibility CSS as a side-effect of the
  connection action.

**Reproduction steps (manual):**

1. Sign in with an account that has ≥1 module in collection.
2. Open a patch in edit mode.
3. Switch to "Collection" view if not default.
4. Click any CV chip on a module card to start a connection.
5. Click another CV chip on a different module to complete it.
6. Observe: at least one of the affected cards now shows only the title;
   image + CV chips disappear.

**Checklist:**

- [ ] Reproduce locally with a real account (test fixture has empty
      collection).
- [ ] Add a Playwright fixture that seeds ≥2 collection modules and
      performs steps 4–5, asserting `app-module-minimal img` and
      `module-cvitem` chips remain visible after the connection.
- [ ] Diagnose the actual cause — instrument `module-cvs` / `module-cvitem`
      reactive pipelines and `module-minimal` animation triggers; capture
      DOM + computed-style snapshots before/after the connection.
- [ ] Fix and verify the projected `app-module-details` content survives
      the 0→1 instance auto-create.
- [ ] Run `pnpm test-headless --include="**/patch-editor*.spec.ts"` and
      `pnpm test:e2e:auth` once a reproducing E2E exists.
- [ ] Revisit the speculative `trackingId: -module.id` change in
      `buildEditorCards()` — if it isn't load-bearing for the real fix,
      consider whether to revert or keep it as a defensive measure.

**Files to start with:**

- `src/app/components/patch-parts/patch-editor/patch-editor.component.{ts,html}`
- `src/app/components/patch-parts/patch-detail-data.service.ts`
  (`ensureModuleInstance$` ~lines 1034–1096)
- `src/app/components/module-parts/module-minimal/module-minimal.component.{ts,html}`
- `src/app/components/module-parts/module-cvs/module-cvs.component.ts`
- `src/app/components/module-parts/module-cvs/module-cvitem.component.ts`
- `src/app/features/module-browser/module-composite/module-composite.component.ts`

---

## Decision log

<!-- Append timestamped one-liners as the plan progresses. -->

- 2026-06-07: Two attempted fixes (ModuleBrowserSharedModule import +
  trackingId stabilisation) did not resolve the symptom. Bug logged here
  at MAX priority for a fresh diagnostic pass with a reproducible
  environment.
