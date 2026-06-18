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

Status: **Proposal drafted; awaiting manual approval.** Proposal/read-only phase only; do not apply migrations, RLS/policy changes, or tag data mutations without explicit human approval.

#### Why this is next

Five requested implementation loops are complete. The remaining HIGH/product work is blocked by schema/RLS/manual approval or upstream dependencies, and screenshot refresh is still soft-blocked by dedicated test-account cleanup. The tag taxonomy item has an actionable proposal-first phase that can be done read-only while respecting the manual approval gate.

#### Layer checklist

- [x] MVP: read current tag group state and draft a revised categorization proposal table.
- [x] Structural: proposed no new group; documented that enum/display/balance-analysis changes are not needed unless product chooses a different taxonomy.
- [x] Polish: captured approval-gate notes and deferred follow-ups in the plan.

#### Validation strategy

- Read-only Supabase/tag inspection only.
- `node scripts/checks/check-docs.cjs` after proposal doc edits.
- No code/data migration validation until explicit approval exists.

#### Decision log

- 2026-06-18T18:25+02:00 — Coordinator staged this proposal-first task for the next loop because it is the next actionable non-destructive backlog item; all mutation/apply steps remain approval-gated.
- 2026-06-18T18:55+02:00 — Executor completed the read-only proposal phase using Supabase MCP production read-back only. Proposal keeps voice-character tags in `Voice`, moves `VCA` to `Utility`, moves `VCO` to `Source`, and requires manual approval before any migration draft or Supabase mutation.
