<!-- Auto-split from TODO.md by scripts/dev/split-todo.cjs. -->
<!-- Section: INFRA (independent; pick any time a product task is blocked) -->

#### LOW: Module — "Cool" appreciation button

**Why:** Users want a lightweight, low-commitment way to bookmark a module they find
interesting or aesthetically appealing — separate from ownership intent. "I think this is
cool" is not "I want to buy it" and not "I own it". It is a pure appreciation signal,
useful for personal curation and potentially for community interest signals later.

**Product concept:**
- A single tap button on the module card/detail (edit mode not required — visible to any
  logged-in user on any module page).
- Label/icon: something expressive and playful — e.g. a spark/star/flame icon, not a
  thumbs-up (too generic). Animation on tap: small burst/pop effect (similar to the iOS
  like animation pattern).
- Togglable: tap again to un-cool.
- Count visible publicly on the module (e.g. `✦ 42`) so it doubles as a community signal.
- The personal state (did *I* cool this?) is private per user.

**DB approach (minimal schema change):**
Add `COOL` to the existing `"user module possession"` Postgres enum on `user_modules.kind`.
Current enum: `HAS | WANTS | SELLS` → becomes `HAS | WANTS | SELLS | COOL`.
This means a user can have exactly one kind per module row (the PK is `user_id + module_id`).
**Open question:** should a user be able to mark a module as both `COOL` and `WANTS`
simultaneously? With the current single-kind model they cannot. Decide before implementing:
- **Option A (simple):** `COOL` is exclusive like the others — if you mark cool, it replaces
  any existing kind. Simplest, lowest risk.
- **Option B (additive):** `COOL` lives in a separate `user_module_appreciations` table so
  it is independent of possession state. More flexible, requires a new table.
*Recommendation: start with Option A for MVP; migrate to B if the use case demands it.*

**Requires explicit user approval** before any DB enum change or migration (per `AGENTS.md §5`).

**Checklist (do not implement until design questions resolved):**

- [ ] Decide Option A vs B with product owner.
- [ ] If Option A: add `COOL` to the `"user module possession"` enum via migration
      (requires approval). Update `UserModulePossessionKind` type and generated DB types.
- [ ] Add `backend.update.userModulePossession(moduleId, 'COOL' | null)` action (reuses
      existing upsert pattern in `ModuleDetailDataService`).
- [ ] Add the Cool button to `module-minimal` (and/or module detail) alongside the existing
      `HAS | WANTS | SELLS` toggle group — visually distinct (not part of the segmented
      control, separate smaller affordance).
- [ ] Tap animation: CSS keyframe burst or Angular animation on the button icon.
- [ ] Public cool count: aggregate query or cached counter on the module row.
- [ ] Unit-test the toggle action and the count display.

---

## Decision log

<!-- Append timestamped one-liners as the plan progresses. -->

