<!-- Auto-split from TODO.md by scripts/dev/split-todo.cjs. -->
<!-- Section: INFRA (independent; pick any time a product task is blocked) -->

#### BUG: Rack editor — name field empty when entering edit mode

**What happens:** When the user clicks "Edit rack" (i.e. unlocks a locked rack), the "Rack name"
input renders visually empty even though `singleRackData$.value.name` holds the correct value.
The user must retype the name or it gets overwritten with an empty/invalid value on auto-save.

**What has been tried:**
- `requestRackEditableStatusChange$` handler now calls `formData.name.control.reset(rack.name, {emitEvent: false})`
  *before* emitting `isCurrentRackEditable$.next(true)`. This is in place but does not fully fix the issue.
- The `singleRackData$` subscription at service init already calls the same `reset()`, so the control
  should hold the name. Root cause likely involves `ChangeDetectionStrategy.OnPush` on `rack-minimal.component`
  (and/or `lib-mat-form-entity`) not propagating the native input value after `reset({emitEvent:false})`
  because no CD cycle is triggered.

**Reproduction:** E2E test at `e2e/auth-rack-name-prefill.spec.ts` reliably reproduces the bug —
run `pnpm test:e2e:auth` and it will fail on "name input is pre-filled immediately when entering edit mode".

**Suspected fix directions:**
- Call `reset()` *with* `emitEvent: true` (or follow with an explicit `markAsDirty()` / `updateValueAndValidity()`)
  so Angular's CD is triggered and `lib-mat-form-entity` (OnPush) re-renders.
- Or call `changeDetectorRef.markForCheck()` on `rack-minimal` after the reset.
- Or switch the `reset` call to `setValue` which always emits.

- [x] Identify whether the issue is CD (OnPush not picking up `{emitEvent:false}` reset) or timing
      (form rendered before `reset()` fires).
- [x] Apply fix and verify `e2e/auth-rack-name-prefill.spec.ts` turns green.
- [x] Keep the E2E test as a permanent regression guard.

---

---

## Decision log

<!-- Append timestamped one-liners as the plan progresses. -->

- 2026-06-14 — Root cause confirmed in shared `lib-mat-form-entity`: Material autocomplete `displayWith` must pass through primitive string/number values from programmatic control resets instead of treating them as selectable objects. Current HEAD already contains the primitive-safe `presetDisplayFunction`; this pass added a rendered-input regression test and verified the authenticated rack-name E2E.
