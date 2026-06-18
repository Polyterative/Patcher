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

### MEDIUM: Analytics — PostHog Product Instrumentation

- **Plan:** [`plans/analytics-posthog-product-instrumentation.md`](./plans/analytics-posthog-product-instrumentation.md)
- **Status:** Staged for loop round 2 — finish remaining code-owned instrumentation/hygiene that does not require PostHog dashboard access.
- **Started:** 2026-06-18T09:36+02:00
- **Coordinator:** coordinator-loop

#### Layer checklist

- [ ] MVP — Complete remaining production event calls for collection, feedback, and admin surfaces where existing flows support them.
- [ ] Structural — Verify consent/DNT and no-capture safeguards in code/docs; keep analytics imports centralized.
- [ ] Polish — Validate analytics tests/lint/docs and archive the plan if only external dashboard work remains blocked.

#### Decision log

- 2026-06-18T09:36+02:00 — Staged after completing the dependency audit. Higher-priority account/security/schema tasks are skipped because they require credentials, explicit Supabase approval, or broader human coordination; this analytics slice has concrete app-code work and no schema/RLS changes.
