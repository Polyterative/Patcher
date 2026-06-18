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

### LOW: Maintenance — Update libraries (Sentry SDK and others)

- **Plan:** [`plans/maintenance-update-libraries.md`](./plans/maintenance-update-libraries.md)
- **Status:** Staged for next loop — run a safe patch/minor dependency update batch, prioritising Sentry and security-relevant overrides; avoid framework major changes.
- **Started:** 2026-06-18T08:49+02:00
- **Coordinator:** coordinator-loop

#### Layer checklist

- [ ] MVP — Align Sentry Angular/browser packages and security-relevant overrides without major framework changes.
- [ ] Structural — Apply safe patch/minor dependency bumps and refresh the pnpm lockfile with `pnpm install`.
- [ ] Polish — Run package-update validation (`pnpm lint`, targeted tests, and build if practical) and document any deferred major updates.

#### Decision log

- 2026-06-18T08:49+02:00 — Staged after completing rack preview. Higher-priority open tasks remain skipped because Manufacturer Accounts / Cool / tag taxonomy / public possession trends require explicit schema/RLS or product approval, E2E cleanup needs credential/secret rotation, Security Audit Remediation mixes approval-sensitive credential/RLS work, and Sentry triage tooling is unavailable in this CLI environment. The dependency update plan has a safe code/package slice with no external approval.
