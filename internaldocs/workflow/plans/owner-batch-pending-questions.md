# Owner batch — 3 stale pending approvals (draft message)

> Date: 2026-09-25. Source: `internaldocs/workflow/TODO.md` Approvals ledger → Pending questions.
> Reply inline here or in TODO.md; agent will move answered lines to Standing approvals / Denials and mirror in plan Decision logs.
> No code, migration, deletion, or provisioning happens off this batch — each approval executes only in its own gated window.

## Copy-paste message for the owner

> Three approvals have been pending 6–11 weeks. One reply clears all three — for each, answer Approve / Decline (keep as-is) / Defer, or just say "apply defaults" and I use the recommended default marked below.
>
> 1. Security hardening phases — RECOMMENDED DEFAULT: approve Q1+Q4 only (Phase 1 stopgap + confirm anon comment inserts are not a feature), defer Q2+Q3. Decline = holes stay open (see below).
> 2. Cloudflare/R2 switch + cleanup + Supabase deletion — RECOMMENDED DEFAULT: defer (stay on Supabase primary, R2 stays staged copy). Decline/defer = dual storage continues, no deletion risk.
> 3. PostHog credentials/export — RECOMMENDED DEFAULT: decline/defer (close as lowest priority until you care about analytics). Decline = no analytics review, no other impact.

---

### 1. Security hardening — phase approvals (pending since 2026-08-10)

Done: phased plan authored and adversarially reviewed (`internaldocs/security/rls-hardening.md`; `backend-plan-reviewer` findings incorporated 2026-08-10). Nothing applied. Each phase is one migration + one commit with rollback.

Blocked: all 4 Approval-queue answers (answer in `rls-hardening.md` Approval queue or here):

- Q1. Approve Phase 1 stopgap now + email end state: (a) owner-only side table vs (b) public-view split vs (iv, current recommendation) keep column, revoke `email` from both roles, expose own email via `auth.uid()`-filtered RPC/view.
- Q2. `comments_duplicate` rows (21) disposable → DROP, or keep locked?
- Q3. Admin-gate DELETE on module part tables (Phase 7)?
- Q4. Confirm anon comment inserts are not a product feature (Phase 3 removes them).

Recommended default: APPROVE Q1 (stopgap + end state iv) and Q4; DEFER Q2+Q3 to the operator window. Rationale: Q1+Q4 close the highest-exposure holes with the smallest, rollbackable change; Q2 needs your data call and Q3 is a product call — no safe guess.

Decline consequence: known holes stay open — any authenticated user can read others' `profiles.email` via public row policy, anon can deface `modules`, anon can spoof `comments`, plus un-RLS'd legacy tables and `SECURITY DEFINER` views remain. No code changes either way until you approve.

### 2. Cloudflare/R2 — traffic switch, cleanup, Supabase object deletion (pending since 2026-07-08)

Done: upload guardrails approved and live (512 KB post-crop, 5000 px, WebP/JPEG 95→90, 1 MB rack-preview cap); R2 staging approved and staged (`patcher-module-panels`, `patcher-rack-previews` copy/verify). Plan: GitHub issue #151.

Blocked: traffic switch, any cleanup, any Supabase object deletion — all separately gated, operator-window only.

Recommended default: DEFER — stay on Supabase as primary, R2 remains verified staged copy. Rationale: production is live and stable; switch + deletion is the only irreversible step in the batch, and there is no incident forcing it.

Decline/defer consequence: dual storage continues (Supabase primary + R2 copy); no cleanup savings, but zero deletion/migration risk. Approving later just needs one operator window with verification + advisors.

### 3. PostHog — credentials / export access (pending since 2026-07-08)

Done: review plan scoped (`plans/posthog-ui-interaction-analytics-review.md`); taxonomy exists in `internaldocs/patterns/ANALYTICS.md`. Lowest priority by design.

Blocked: needs either a local API credential or a user-provided CSV/JSON export. Out of scope until then by plan definition.

Recommended default: DECLINE/DEFER — close as "on hold until owner cares about analytics", no credential handoff. Rationale: zero production impact, purely opportunistic product-insight work; handing over credentials now buys nothing while higher slices are open.

Decline consequence: no usage/drop-off/dead-surface analysis and no instrumentation follow-ups; nothing breaks, nothing stays exposed.
