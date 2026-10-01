# Immediate UI feedback — synchronous pending ack without pipe changes

<!-- Section: INFRA (independent; pick any time a product task is blocked) -->

Goal: give synchronous UI ack on click-triggered backend pipes via pending flags + disabled/spinner, without changing backend mapping logic.

Status: Open on `develop`, frontend-only. No schema/migration/RLS/RPC change. No production/release/push.

## Layer 1 — MVP (pending flags + template ack)

- [x] Module collection: `isCollectionActionPending$` in `module-detail-data.service.ts` for `addModuleToCollection$` / `removeModuleFromCollection$` / `setModulePossession$`; `tap(true)` before `exhaustMap`, clear in `finalize`; template disables possession button + shows busy
- [x] Rack rows: `rowLayoutActionInProgress$` in `rack-detail-data.service.ts` + context for `requestAddNewRow$` / `requestRemoveRow$` / `requestMoveRow$` / `requestDeleteRow$` / `requestClearRow$`; template disables Add/Remove row buttons + `aria-busy`
- [x] Patch linked rack: `linkedRackSaving$` in `patch-detail-data.service.ts` + `bindLinkedRackPersistence`; disable linked-rack control while saving + `Saving…` hint; rollback stays via existing `syncLinkedRackControl`
- [x] Patch instances: fix `addingCopy` latch on error + `removingInstanceId$` pending for `removeModuleInstance$`; add-button already disables via `addingCopy.has()`, remove button shows spinner/disabled

## Layer 2 — Structural (guards + regression specs)

- [x] Double-submit guards reuse existing shapes (`duplicateRowInProgress$`, `layoutVariantActionInProgress$`): pending flags block re-entry, always clear on success AND error/rollback
- [x] New reactive specs: pending true synchronously on `next()`, false after backend resolve, false after backend error; seeded-state rollback where applicable
- [x] Targeted suites green + `pnpm lint` green, no pipe body changes (only `tap`/`finalize` + flag + template)

## Layer 3 — Polish (CSS-only ack)

- [x] `aria-busy` / `aria-disabled` + tooltip copy (`Adding…`, `Saving…`, `Removing…`) consistent with `DESIGN_LANGUAGE.md` short intentional motion (<150ms)
- [ ] `:active` pressed state + focus-visible ring on module cards, rack modules, CV jacks, pending buttons (deferred: needs `designer` placement brief per AGENTS.md §5)

## Decision log

- 2026-09-30: Scope is UI-ack only; no `switchMap`/`exhaustMap`/backend mapping changes, so no `backend-plan-reviewer` gate and no RLS/operator window needed.
- 2026-09-30: Egress overquota plan stays open (dashboard verification is user-side); this plan takes `CURRENT_FEATURE` pointer while egress waits.
- 2026-09-30: `addingCopy` latch (stays in set on backend error because `connectEditorCards` only clears on instances change) is in scope as a pending-ack correctness fix.
- 2026-09-30: Destructive actions (`deleteModule$`, `deleteRack$`, `mergeIntoTargetModule$`, `duplicateRack$`) get pending-disabled only, never optimistic list removal or navigation.
- 2026-10-01: Layers 1-2 implemented + validated (44 + 81 + 20 + 48 targeted specs green; eslint 0 errors; layering + docs checks exit 0); inner `finalize` + guarded `EMPTY.pipe(finalize)` used throughout because outer `finalize` only fires on teardown and would latch; confirm-cancel clears `removingInstanceId$` explicitly; Layer 3 `:active`/focus-ring deferred to `designer` brief.

## Documentation impact

- Classification: public-behavioral
- Production visibility: immediate
- Public docs paths: none
- Screenshot targets: none
- Changelog summary: Buttons and selectors show immediate busy state while saves finish.
