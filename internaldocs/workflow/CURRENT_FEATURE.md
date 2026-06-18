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

### HIGH: Security — Audit Remediation

- **Plan:** [`plans/security-audit-remediation.md`](./plans/security-audit-remediation.md)
- **Status:** Staged for loop round 3 — apply safe repo-code security remediations that do not require credential rotation, RLS/policy changes, migrations, or external service access.
- **Started:** 2026-06-18T09:45+02:00
- **Coordinator:** coordinator-loop

#### Layer checklist

- [ ] MVP — Remove tracked/local secret values from committed config templates and disable public production source maps/named chunks.
- [ ] Structural — Add safe redirect/noopener/bootstrap-error hardening where code-owned and low risk.
- [ ] Polish — Validate focused checks, lint, and docs; document any remaining manual/approval-only audit items.

#### Decision log

- 2026-06-18T09:45+02:00 — Staged after analytics because credential/account and Supabase/RLS items remain blocked, but this plan still contains safe repo-code hardening that can be completed without external approval.
