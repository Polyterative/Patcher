# Current Feature / AI RAM

> **Rules for AI agents:**
> 1. Read this file when the task is about the active in-flight feature or explicitly references the current plan.
> 2. Keep it updated - check off steps, add discoveries.
> 3. One feature at a time - archive to [COMPLETED.md](./COMPLETED.md) when done, then reset.
> 4. This file owns implementation detail; `TODO.md` owns the backlog index, `plans/` owns per-task detail.
> 5. **Every feature uses three layers** (MVP -> Structural -> Polish). Define all three before coding. Complete each
>    layer before starting the next. Layout before interactions.
> 6. **Append to the Decision log** for any non-obvious choice (library pick, data shape, fallback policy, scope cut).
>    Future agents read this to avoid relitigating settled questions.

---

## Active

### MEDIUM: Bug — Rack Preview Not Loading / Updating on Specific Rack

- **Plan:** [`plans/bug-rack-preview-not-loading-updating-on-specific-rack.md`](./plans/bug-rack-preview-not-loading-updating-on-specific-rack.md)
- **Status:** Staged for next loop — investigate the remaining code-only follow-up around preview refresh/staleness without applying data repair.
- **Started:** 2026-06-17T18:20+02:00
- **Coordinator:** coordinator-loop

#### Layer checklist

- [ ] MVP — Reconcile the plan's completed persistence fix with the remaining optional auto-refresh/stale-preview behavior.
- [ ] Structural — Implement a scoped code-only improvement for preview refresh/staleness that avoids Supabase schema, RLS, policy, migration, or destructive data changes.
- [ ] Polish — Add focused coverage for the preview behavior and validate with the smallest practical rack-detail tests.

#### Decision log

- 2026-06-17T18:20+02:00 — Staged after completing the Remix Shuffle slice. Higher-priority open items remain skipped because Manufacturer Accounts requires Supabase/RLS approval, Security Audit Remediation is broad and approval-sensitive, public possession trend charts and Module I/O need schema approval, and E2E cleanup/multi-instance work depends on credentials. This rack preview item has an existing root-cause plan and a remaining code-only optional follow-up; data repair stays out of scope without explicit user approval.
