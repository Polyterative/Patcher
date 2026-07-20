# Current Feature / AI RAM

> **Rules for AI agents:**
> 1. Read this file when the task is about the active in-flight feature or explicitly references the current plan.
> 2. Keep it updated — check off steps, add discoveries.
> 3. One feature at a time — archive to [COMPLETED.md](./COMPLETED.md) when done, then reset.
> 4. This file owns implementation detail; `TODO.md` owns the backlog index **and the Approvals
>    ledger** (standing approvals, pending questions, denials), `plans/` owns per-task detail.
>    Do not keep an approval queue here — register gates in the TODO Approvals ledger.
> 5. **Every feature uses three layers** (MVP → Structural → Polish). Define all three before coding. Complete each layer before starting the next. Layout before interactions.
> 6. **Append to the Decision log** for any non-obvious choice (library pick, data shape, fallback policy, scope cut). Future agents read this to avoid relitigating settled questions.

---

## Active

_No active feature._

Status: Product work is approval-gated (see the **Approvals ledger** in [TODO.md](./TODO.md)).
Until gates clear, coordinators must pick from the **fallback work queue** in
[`../agents/coordinator-loop.md`](../agents/coordinator-loop.md) instead of idling.
Updated: 2026-07-20

Recent completed checkpoints are archived in [COMPLETED.md](./COMPLETED.md); their validation
notes and decisions live in the matching plan files (e.g.
[`plans/marketplace-shipping-address-book.md`](./plans/marketplace-shipping-address-book.md),
[`plans/module-cool-appreciation-button.md`](./plans/module-cool-appreciation-button.md)).

## Empty template

Copy this skeleton when a new feature becomes active; keep all three layers defined before coding.

```markdown
### <Feature name> (from plans/<slug>.md)

#### Layer 1 — MVP

- [ ] ...

#### Layer 2 — Structural

- [ ] ...

#### Layer 3 — Polish

- [ ] ...

#### Validation notes

#### Decision log
```
