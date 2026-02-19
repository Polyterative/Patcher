# Module Instance Scenarios

> **Purpose:** Exhaustive scenario list for multi-module patching. Use as basis for tests.
> **Related feature:** [CURRENT_FEATURE.md](../CURRENT_FEATURE.md)

---

## Context

- **Collection modules** = the user's module library, always visible in the patch editor.
- **Instances** = DB rows in `patch_module_instances`, tracking copies of a module within a patch.
- **`instance_id`** on a connection = optional. `undefined` for single-copy modules, set for multi-copy.
- `buildEditorCards` merges collection + instances: 0–1 instances → 1 card, N≥2 → N cards with labels.

---

## Scenario A — "Add Copy" from 0 instances ✅ FIXED

| Step | Action                              | State                                                                           | Visible                  |
|------|-------------------------------------|---------------------------------------------------------------------------------|--------------------------|
| 1    | Editor open, module has 0 instances | `patchModuleInstances$`: none for this module                                   | 1 card, no label         |
| 2    | Click "Add Copy"                    | `addModuleInstance$` → `sameModuleCount = 0` → creates 2 instances via forkJoin | 2 cards: "(1)" and "(2)" |

**Was:** Bug — created 1 instance, `buildEditorCards` treated 1 same as 0 → user saw no change.
**Fix:** When `sameModuleCount === 0`, create **two** instances ("(1)" + "(2)") so count jumps to 2.

---

## Scenario B — "Add Copy" from 1 instance ✅

| Step | Action                                                   | State                                        | Visible                  |
|------|----------------------------------------------------------|----------------------------------------------|--------------------------|
| 1    | Module has 1 instance (from lazy CV click or from bug A) | 1 instance, no label shown                   | 1 card                   |
| 2    | Click "Add Copy"                                         | Relabels existing → "(1)", creates new "(2)" | 2 cards: "(1)" and "(2)" |

---

## Scenario C — "Add Copy" from 2+ instances ✅

| Step | Action                 | State                   | Visible   |
|------|------------------------|-------------------------|-----------|
| 1    | Module has N instances | N instances with labels | N cards   |
| 2    | Click "Add Copy"       | Creates "(N+1)"         | N+1 cards |

---

## Scenario D — "Remove Copy" from 2 → 1 ✅

| Step | Action                 | State                              | Visible          |
|------|------------------------|------------------------------------|------------------|
| 1    | Module has 2 instances | 2 cards with labels                | 2 cards          |
| 2    | Click "Remove" on one  | Deletes DB row, 1 instance remains | 1 card, no label |

⚠️ Minor: surviving instance keeps its label in DB (hidden in UI, harmless).

---

## Scenario E — Remove then re-add (2 → 1 → 2) ✅

| Step | Action                                        | State                                               | Visible |
|------|-----------------------------------------------|-----------------------------------------------------|---------|
| 1    | After Scenario D: 1 instance with label "(1)" | 1 instance                                          | 1 card  |
| 2    | Click "Add Copy"                              | `sameModuleCount = 1`, relabel no-op, creates "(2)" | 2 cards |

---

## Scenario F — Simple patch, no instances ✅

| Step | Action                                   | State                                                               | Visible            |
|------|------------------------------------------|---------------------------------------------------------------------|--------------------|
| 1    | User clicks CV on Module A (0 instances) | `ensureModuleInstance$` creates 1 silently                          | 1 card (unchanged) |
| 2    | User clicks CV on Module B (0 instances) | Same                                                                | 1 card             |
| 3    | Connection confirmed                     | `instance_id_a` and `instance_id_b` set from lazy-created instances | Connection saved   |

No labels, no extra cards. Behaves like pre-instance patching.

---

## Scenario G — Mixed: some single-copy, some multi-copy ✅

| Step | Action                                          | State                                              | Visible                      |
|------|-------------------------------------------------|----------------------------------------------------|------------------------------|
| 1    | Osc has 0 instances, VCA has 0 instances        | —                                                  | 1 card each                  |
| 2    | Click "Add Copy" on VCA (Scenario A fix needed) | VCA gets 2 instances                               | Osc: 1 card, VCA: 2 cards    |
| 3    | Wire Osc → VCA (1)                              | Osc lazy-creates instance, VCA (1) already has one | Connection with instance_ids |
| 4    | Wire Osc → VCA (2)                              | Osc instance reused, VCA (2) has its own           | Second connection            |

---

## Scenario H — Reload patch with existing instances ✅

| Step | Action                                         | State                                                            | Visible                              |
|------|------------------------------------------------|------------------------------------------------------------------|--------------------------------------|
| 1    | Patch saved with 2 VCA instances + connections | DB has rows                                                      | —                                    |
| 2    | Reopen patch editor                            | `GET.patchModuleInstances` loads, `GET.currentUserModules` loads | 2 VCA cards, 1 card per other module |
| 3    | Connections list shows existing connections    | `editorConnections$` populated                                   | Connections visible                  |

---

## Scenario I — "Remove Copy" from 3 → 2 ✅

| Step | Action                 | State              | Visible             |
|------|------------------------|--------------------|---------------------|
| 1    | Module has 3 instances | 3 cards            | 3 cards             |
| 2    | Remove one             | 2 instances remain | 2 cards with labels |

Labels may be non-sequential (e.g. "(1)" and "(3)") — **this is a bug, see Scenario M.**

---

## Scenario J — Connect first, add instances later ✅ VERIFIED

> **User story:** "I wired Osc → Filter with single copies. Later I realize I need two Filters. I click 'Add Copy' on
> Filter. My existing connection should still work and belong to Filter (1)."

| Step | Action                                        | State                                                                                        | Visible                                             |
|------|-----------------------------------------------|----------------------------------------------------------------------------------------------|-----------------------------------------------------|
| 1    | Wire Module A out → Module B in (0 instances) | `ensureModuleInstance$` lazy-creates 1 instance per module. Connection saved with those IDs. | 1 card each, connection visible                     |
| 2    | Click "Add Copy" on Module B                  | `sameModuleCount = 1` → relabels existing to "(1)", creates "(2)". Instance ID unchanged.    | Module B splits into 2 cards: "(1)" and "(2)"       |
| 3    | Check existing connection                     | Connection's `instance_id_b` still points to original instance (now labeled "(1)").          | Connection should still be listed and usable        |
| 4    | Save and reload                               | `buildPatchConnectionInserter` writes `instance_id_b` = original ID. DB FK valid.            | Connection survives reload, associated with B "(1)" |

**Expected behavior:** The original connection keeps working because the instance ID is stable — only its label changes
from `null` to "(1)". The connection belongs to the first copy.

**Risks to verify:**

- ✅ Instance ID is stable across relabel (only `instance_label` column changes, not `id`).
- ⚠️ In-memory `editorConnections$` holds old `instance_id` — must confirm the save path handles this correctly.
- ⚠️ The connection list UI must still display the connection correctly after the module splits into 2 cards.
- ⚠️ If `ensureModuleInstance$` was never called (e.g., connection created before the instance feature existed),
  `instance_id_a/b` are `null`. "Add Copy" creates new instances, but the old connection has `null` — it should still
  work (nullable FK).

---

## Scenario K — Delete an instance that has connections ✅ FIXED

> **User story:** "I have 2 VCAs wired up. I delete VCA (2). Connections to VCA (2) should degrade gracefully, not
> crash."

| Step | Action                                    | State                                                                                         | Visible                                              |
|------|-------------------------------------------|-----------------------------------------------------------------------------------------------|------------------------------------------------------|
| 1    | Module B has 2 instances: "(1)" and "(2)" | 2 connections: A→B(1), A→B(2)                                                                 | 2 cards, 2 connections                               |
| 2    | Click "Remove" on B "(2)"                 | DB: instance row deleted. `ON DELETE SET NULL` → connection's `instance_id_b` becomes `null`. | 1 card (B, no label). Connection list needs refresh. |
| 3    | In-memory state after removal             | `patchModuleInstances$` updated (removed). But `editorConnections$` still holds old ID.       | ⚠️ Connection list shows stale `instance_id_b`       |
| 4    | User clicks Save                          | `buildPatchConnectionInserter` writes `instance_id_b: <deleted_id>` → **FK violation risk!**  | ⚠️ Save may fail silently or throw error             |
| 5    | If user reloads instead of saving         | DB already SET NULL via FK cascade. Connections load with `instance_id_b = null`.             | Connection survives, just loses instance association |

**Known risks:**

- ⚠️ **FK violation on save:** The in-memory `editorConnections$` holds a stale `instance_id` pointing to a deleted
  instance. When `buildPatchConnectionInserter` inserts the connection rows, the FK constraint will reject the deleted
  ID. **This is a bug that needs fixing.**
- ⚠️ **Stale UI:** After removing an instance, the connection list may still display it as belonging to the now-deleted
  instance. The UI should reflect the degradation.
- ✅ **Graceful degradation on reload:** `ON DELETE SET NULL` on the FK means the DB handles deletion automatically —
  connection rows survive with `null` instance IDs. After reload, everything works.

**Required fix (for Step 18 or later):**
When `removeModuleInstance$` fires, also scrub `editorConnections$` in memory: set any `instance_id_a` or
`instance_id_b` matching the deleted instance's ID to `undefined`. This keeps in-memory state consistent with what the
DB did via `ON DELETE SET NULL`.

---

## Scenario L — Legacy connections (pre-instance) + adding instances ⚠️ NEEDS VERIFICATION

> **User story:** "I have a patch from before the instance feature existed. All connections have `instance_id = null`.
> Now I add copies."

| Step | Action                                           | State                                                                          | Visible                                            |
|------|--------------------------------------------------|--------------------------------------------------------------------------------|----------------------------------------------------|
| 1    | Open old patch. Connections exist with null IDs. | `patchModuleInstances$` is empty (no instances in DB). Connections have nulls. | Modules shown as 1 card each. Connections visible. |
| 2    | Click "Add Copy" on Module B                     | `sameModuleCount = 0` → jumpstart creates B(1) and B(2).                       | B splits into 2 cards                              |
| 3    | Existing connections have `instance_id_b = null` | No instance is associated with the existing connections.                       | Connections still listed, but unassociated         |
| 4    | Save                                             | Connections saved with `instance_id_b = null`. FK allows null. Valid.          | ✅ Save succeeds                                    |

**Expected behavior:** Legacy connections with `null` instance IDs continue to work. They are not retroactively assigned
to an instance. This is acceptable — the user can delete and re-wire if they want to associate with a specific copy.

**Risks to verify:**

- ⚠️ UI should not crash or show confusing state when connections have `null` instance IDs alongside modules that now
  have multiple instances.

---

## Scenario M — Duplicate labels after delete + re-add ✅ FIXED

> **User story:** "I have 4 copies: (1), (2), (3), (4). I delete (2). Now I click 'Add Copy' and get a second (4)
> instead of a new (5) or a renumbered sequence."

| Step | Action                                     | State                                                               | Visible                               |
|------|--------------------------------------------|---------------------------------------------------------------------|---------------------------------------|
| 1    | Module has 4 instances: (1), (2), (3), (4) | `patchModuleInstances$` has 4 entries                               | 4 cards                               |
| 2    | Delete instance (2)                        | 3 instances remain: (1), (3), (4). `sameModuleCount = 3`.           | 3 cards: (1), (3), (4)                |
| 3    | Click "Add Copy"                           | `newLabel = \`(${3 + 1})\`` → "(4)". **Duplicate of existing (4)!** | 4 cards: (1), (3), (4), (4) ← **BUG** |

**Root cause:** `addModuleInstance$` uses `sameModuleCount + 1` for the new label. This is the count of instances, not
the max existing label number. After a gap, count + 1 can collide with an existing label.

**Design decision — always renumber sequentially.** Instead of trying to find the next unused number:

1. After **any add or remove** of instances for a module, **renumber all instances** of that module sequentially: (1), (
   2), (3), …
2. This keeps labels clean and predictable.
3. The renumber should update labels in DB (batch update) and in local `patchModuleInstances$`.
4. Connections are unaffected — they reference `instance.id` (stable), not labels.

---

## Scenario N — Delete instance that has connections: confirmation dialog ✅ FIXED

> **User story:** "I'm about to delete an instance that has wired connections. I should be warned before the connections
> are lost."

| Step | Action                                      | Current behavior                                    | Expected behavior                                                                                              |
|------|---------------------------------------------|-----------------------------------------------------|----------------------------------------------------------------------------------------------------------------|
| 1    | Instance B(2) has 2 connections wired to it | Delete button visible, no indication of connections | A **connection count badge** should be visible on the card (e.g. "2 connections")                              |
| 2    | Click "Remove" on B(2)                      | Immediately deletes, scrubs connections silently    | Show a **confirmation dialog**: "This copy has 2 connections. Removing it will disconnect them. Are you sure?" |
| 3    | User confirms                               | (same as current)                                   | Proceed with delete + scrub                                                                                    |
| 4    | User cancels                                | N/A                                                 | No action taken                                                                                                |

**Implementation notes:**

- Count connections for an instance: filter `editorConnections$` where `instance_id_a === instance.id` OR
  `instance_id_b === instance.id`.
- If count > 0, open `ConfirmDialogComponent` before proceeding.
- If count === 0, delete immediately (no dialog needed).

---

## Scenario O — Connection count indicator on instance cards ✅ FIXED

> **User story:** "I want to see at a glance how many connections each instance has, so I know which ones are safe to
> delete."

| Step | Action                                      | Current behavior          | Expected behavior                                                  |
|------|---------------------------------------------|---------------------------|--------------------------------------------------------------------|
| 1    | Instance B(1) has 3 connections, B(2) has 0 | Both cards look identical | B(1) shows a badge/chip "3 connections", B(2) shows nothing or "0" |

**Implementation notes:**

- Add a `connectionCount` field to `EditorModuleCard`.
- Compute it in `buildEditorCards` (or a new combineLatest that also includes `editorConnections$`).
- For each card with an instance, count connections where `instance_id_a === instance.id` OR
  `instance_id_b === instance.id`.
- For cards without an instance (0-instance modules), count connections where the module is referenced but `instance_id`
  is null.
- Display as a small `mat-chip` or subtitle text near the delete button.

---

## Scenario P — Self-connection: same module, same instance (feedback loop) ⚠️ NEEDS TEST

> **User story:** "I'm patching a delay module that feeds back into itself. I wire the delay output to its own input on
> the same instance."

| Step | Action                                            | Expected state                                                                  | Expected visible                                |
|------|---------------------------------------------------|---------------------------------------------------------------------------------|-------------------------------------------------|
| 1    | Module A has instance A(1). Click A(1) output CV. | `selectedForConnection$.a` set with `instance_id = A(1).id`                     | Output CV highlighted                           |
| 2    | Click A(1) input CV.                              | `selectedForConnection$.b` set with `instance_id = A(1).id`                     | Both CVs highlighted, connection preview shown  |
| 3    | Confirm connection.                               | `instance_id_a === instance_id_b === A(1).id`. Accepted (not a duplicate).      | Connection appears in list                      |
| 4    | Try to confirm same connection again.             | `isAlreadyInList` → true. Rejected.                                             | "Already in this patch" error                   |
| 5    | Save and reload.                                  | `buildPatchConnectionInserter` writes both instance IDs. DB FK valid.           | Connection survives reload                      |
| 6    | Delete instance A(1).                             | Both `instance_id_a` and `instance_id_b` scrubbed to `undefined`.               | Connection survives, loses instance association |
| 7    | Connection count on card.                         | Self-connection counted once (not twice despite matching both sides of `\|\|`). | Card shows "1 connection"                       |

**Why this must work:** Feedback patching is a fundamental modular synthesis technique — delays, reverbs, and
self-oscillating filters all wire output→input on the same module.

**DB constraints:** `a` FK → `module_outs`, `b` FK → `module_ins`. Different tables, so same-module/same-instance is
structurally valid. No unique constraint prevents `instance_id_a === instance_id_b`.

---

## Scenario Q — Cross-instance connection: same module, different instances ⚠️ NEEDS TEST

> **User story:** "I have two copies of a mixer. I wire Mixer(1) output into Mixer(2) input to cascade them."

| Step | Action                                    | Expected state                                                                          | Expected visible                           |
|------|-------------------------------------------|-----------------------------------------------------------------------------------------|--------------------------------------------|
| 1    | Module A has instances A(1) and A(2).     | 2 cards visible                                                                         | A(1) and A(2) cards                        |
| 2    | Click A(1) output CV, then A(2) input CV. | `instance_id_a = A(1).id`, `instance_id_b = A(2).id`. Different IDs.                    | Connection preview shown                   |
| 3    | Confirm connection.                       | Accepted. `a.id` (out) and `b.id` (in) may match if same CV type, but instances differ. | Connection appears in list                 |
| 4    | Try A(1)→A(2) again.                      | `isAlreadyInList` → true. Rejected.                                                     | "Already in this patch" error              |
| 5    | Try reverse: A(2) output → A(1) input.    | Different `a.id`/`b.id` (different output/input CVs). Accepted.                         | Second connection appears                  |
| 6    | Delete instance A(2).                     | Connections' `instance_id_b` (or `_a` for reverse) scrubbed to `undefined`.             | Connections survive, lose A(2) association |

**Why this must work:** Cascading identical modules (e.g., chaining two mixers, two VCAs) is a common patching pattern.

---

## Scenario R — Cross-instance duplicate detection ⚠️ NEEDS TEST

> **User story:** "I have A(1)→A(2) wired. I try to wire A(1)→A(2) again — it should be rejected. But A(2)→A(1) should
> be accepted because it's a different direction."

| Step | Action                                       | Expected                                                       |
|------|----------------------------------------------|----------------------------------------------------------------|
| 1    | A(1) out → A(2) in exists.                   | 1 connection in list                                           |
| 2    | Try A(1) out → A(2) in again.                | Rejected: same `a.id + b.id + instance_id_a + instance_id_b`   |
| 3    | Try A(2) out → A(1) in.                      | Accepted: different `a.id` (A(2)'s out) and `b.id` (A(1)'s in) |
| 4    | Try A(1) out → A(2) in with *different* CVs. | Accepted: different `a.id` (different output CV of A(1))       |

**Key insight:** `isAlreadyInList` compares the 4-tuple `(a.id, b.id, instance_id_a, instance_id_b)`. Since `a` is
always an output CV and `b` is always an input CV, reversing direction changes both `a.id` and `b.id` — so it's never
a false duplicate.