# Current Feature / AI RAM

> **Rules for AI agents:**
> 1. Read this file when the task is about the active in-flight feature or explicitly references the current plan.
> 2. This file owns **only** the pointer to the active plan file and the live layer checklist.
>    Every durable fact — validation notes, decisions, discoveries, acceptance evidence — goes
>    directly into the linked `plans/<slug>.md`, so nothing needs migrating at archive time.
> 3. One feature at a time — when done, add one line to [COMPLETED.md](./COMPLETED.md), move the
>    plan to `plans/done/`, and reset this file to `_No active feature._` (bump `Updated:`).
> 4. `TODO.md` owns the backlog index **and the Approvals ledger** (standing approvals, pending
>    questions, denials). Do not keep an approval queue here — register gates there.
> 5. **Every feature uses three layers** (MVP → Structural → Polish). Define all three before coding. Complete each layer before starting the next. Layout before interactions.
> 6. **Append non-obvious choices to the plan file's Decision log** (library pick, data shape, fallback policy, scope cut) — not to this file.
> 7. Bump the `Updated:` date whenever you touch this file. A stale date is lint-flagged.

---

## Active

### Immediate UI feedback — plan: [plans/immediate-ui-feedback-pending-ack.md](./plans/immediate-ui-feedback-pending-ack.md)

#### Layer 1 — MVP (pending flags + template ack)

- [x] Module collection pending flag + button busy state
- [x] Rack row layout pending flag + Add/Remove disabled
- [x] Patch linked-rack saving flag + control disabled + Saving hint
- [x] Patch instance add latch fix + remove pending

#### Layer 2 — Structural (guards + regression specs)

- [x] Pending set/clear on success + error specs for all four tracks
- [x] Double-submit guards, no pipe body changes, lint green

#### Layer 3 — Polish (CSS-only ack)

- [x] aria-busy + tooltip copy per DESIGN_LANGUAGE
- [ ] :active + focus ring (deferred to designer brief)

> Egress overquota plan stays open in `plans/supabase-cached-egress-overquota.md`, paused on user-side dashboard verification.

Updated: 2026-10-01

Recent completed checkpoints are archived in [COMPLETED.md](./COMPLETED.md); their validation
notes and decisions live in the matching plan files (e.g.
[GitHub issue #140](https://github.com/Polyterative/Patcher/issues/140),
[GitHub issue #152](https://github.com/Polyterative/Patcher/issues/152)).

## Empty template

Copy this skeleton when a new feature becomes active; keep all three layers defined before coding.
Validation notes and the Decision log live in the linked plan file, not here.

```markdown
### <Feature name> — plan: [plans/<slug>.md](./plans/<slug>.md)

#### Layer 1 — MVP

- [ ] ...

#### Layer 2 — Structural

- [ ] ...

#### Layer 3 — Polish

- [ ] ...
```
