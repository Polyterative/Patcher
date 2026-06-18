# Current Feature / AI RAM

> **Rules for AI agents:**
> 1. Read this file when the task is about the active in-flight feature or explicitly references the current plan.
> 2. Keep it updated — check off steps, add discoveries.
> 3. One feature at a time — archive to [COMPLETED.md](./COMPLETED.md) when done, then reset.
> 4. This file owns implementation detail; `TODO.md` owns the backlog index, `plans/` owns per-task detail.
> 5. **Every feature uses three layers** (MVP → Structural → Polish). Define all three before coding. Complete each layer before starting the next. Layout before interactions.
> 6. **Append to the Decision log** for any non-obvious choice (library pick, data shape, fallback policy, scope cut). Future agents read this to avoid relitigating settled questions.

---

## Active

### Bug — Tag taxonomy Voice group proposal

Plan: [`plans/bug-tag-taxonomy-voice-group-miscategorization.md`](./plans/bug-tag-taxonomy-voice-group-miscategorization.md)

Status: **Staged for the next loop.** Proposal/read-only phase only; do not apply migrations, RLS/policy changes, or tag data mutations without explicit human approval.

#### Why this is next

Five requested implementation loops are complete. The remaining HIGH/product work is blocked by schema/RLS/manual approval or upstream dependencies, and screenshot refresh is still soft-blocked by dedicated test-account cleanup. The tag taxonomy item has an actionable proposal-first phase that can be done read-only while respecting the manual approval gate.

#### Layer checklist

- [ ] MVP: read current tag group state and draft a revised categorization proposal table.
- [ ] Structural: if a new group is proposed, outline enum/display/balance-analysis changes without applying them.
- [ ] Polish: capture follow-up notes for missing modulation tags or canonical taxonomy docs.

#### Validation strategy

- Read-only Supabase/tag inspection only.
- `node scripts/checks/check-docs.cjs` after proposal doc edits.
- No code/data migration validation until explicit approval exists.

#### Decision log

- 2026-06-18T18:25+02:00 — Coordinator staged this proposal-first task for the next loop because it is the next actionable non-destructive backlog item; all mutation/apply steps remain approval-gated.
