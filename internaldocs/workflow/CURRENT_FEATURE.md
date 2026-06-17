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

### MEDIUM: Rack Editor — "Remix" layout optimizer

- **Plan:** [`plans/rack-editor-remix-layout-optimizer.md`](./plans/rack-editor-remix-layout-optimizer.md)
- **Status:** Staged for next loop — continue the remaining actionable Remix optimizer work.
- **Started:** 2026-06-17T18:05+02:00
- **Coordinator:** coordinator-loop

#### Layer checklist

- [ ] MVP — Reconcile the plan checklist with the implemented Remix work and identify the highest-value remaining user-visible gap.
- [ ] Structural — Complete the remaining pure utility / rack editor wiring in a scoped way without Supabase changes.
- [ ] Polish — Validate Remix behavior with focused unit coverage and, for visual changes, runtime screenshot inspection.

#### Decision log

- 2026-06-17T18:05+02:00 — Staged after completing the ngx-dropzone migration. Higher-priority open items were skipped because Manufacturer Accounts requires Supabase/RLS approval, Security Audit Remediation spans credential/RLS/dependency slices, Public Possession trend charts require schema approval for remaining work, E2E cleanup needs credentials, and E2E multi-instance depends on that cleanup. Remix has existing implementation context and remaining code-only UI/utility work.
