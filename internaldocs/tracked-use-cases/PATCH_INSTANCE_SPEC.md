# Patch Instance Behavior Spec

> Stable expected behavior for multi-instance patch editing. Use this as the canonical reference for implementation and
> tests.

---

## Context

- **Collection modules** = the user's module library, always visible in the patch editor.
- **Instances** = DB rows in `patch_module_instances`, tracking copies of a module within a patch.
- **`instance_id`** on a connection = optional. `undefined` for single-copy modules, set for multi-copy.
- `buildEditorCards` merges collection + instances: 0–1 instances → 1 card, N≥2 → N cards with labels.

---

## Instance Creation and Display

### Add Copy from 0 instances

- Starting state: the module is visible as one unlabeled card and has no `patch_module_instances` rows.
- Action: user clicks **Add Copy**.
- Expected result: create **two** instances so the UI visibly becomes `(1)` and `(2)`.

### Add Copy from 1 instance

- Starting state: one instance exists and the UI still shows one unlabeled card.
- Action: user clicks **Add Copy**.
- Expected result: relabel the existing instance as `(1)` and create `(2)`.

### Add Copy from 2+ instances

- Starting state: instances already exist with visible labels.
- Action: user clicks **Add Copy**.
- Expected result: add one more instance and keep the card set consistent.

### Remove Copy from 2 to 1

- Starting state: two visible labeled cards.
- Action: user deletes one instance.
- Expected result: one card remains and the UI returns to the unlabeled single-card presentation.

### Remove then re-add

- Starting state: a module has been reduced from 2 copies back to 1.
- Action: user clicks **Add Copy** again.
- Expected result: the original instance becomes `(1)` and a new `(2)` is created.

### Label policy

- Labels are presentation only; stable identity lives in `instance.id`.
- After add/remove operations, labels should remain predictable and collision-free.
- Preferred behavior: labels are sequential for the visible set of instances.

---

## Connection Behavior

### Simple patch with no explicit copies

- Wiring two single-copy modules should silently create internal instances as needed.
- The user still sees the same one-card-per-module UI.
- Saved connections may carry instance IDs even when the UI shows no labels.

### Reloading a patch with existing instances

- Existing instance rows and existing connections must round-trip cleanly.
- Multi-copy modules re-open as multiple cards with labels.
- Single-copy modules still appear as one unlabeled card.

### Connect first, add instances later

- If a connection already exists for a module before the module is split into multiple visible copies, the original
  connection should remain attached to the original stable `instance.id`.
- The connection must survive save and reload without reassignment errors.

### Delete an instance that has connections

- Deleting an instance must degrade existing connections gracefully rather than break persistence.
- Any in-memory references to the deleted instance must be scrubbed the same way the DB treats deleted instance IDs.
- Connections may survive with `instance_id = null` if the underlying module/cable relationship is still valid.

### Delete confirmation for connected instances

- If an instance has one or more connections, the user should get a confirmation dialog before deletion.
- If an instance has no connections, delete can proceed immediately.

### Connection count indicator

- Each visible instance card should expose its connection count.
- Counts should help users identify which copies are safe to remove.

---

## Same-Module / Cross-Instance Cases

### Self-connection on the same instance

- A module may connect one of its outputs to one of its own inputs on the same instance.
- This must be treated as a valid feedback-loop case, not rejected as a duplicate.

### Same module, different instances

- One instance of a module may connect to a different instance of the same module.
- Direction still matters because outputs and inputs are distinct endpoints.

### Duplicate detection

- Exact duplicates should be rejected.
- Reverse direction should not be treated as the same connection.
- Different CV endpoints on the same pair of instances should remain valid if they are genuinely different connections.

---

## Persistence Rules

- `instance.id` is the stable identity; labels may change.
- UI relabeling must never invalidate stored connections.
- Deleting an instance must not leave stale in-memory IDs that fail later on save.
- Legacy connections with `null` instance IDs must remain loadable and saveable.
