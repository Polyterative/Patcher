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

No active feature.

Status: Product work is approval-gated (see the **Approvals ledger** in [TODO.md](./TODO.md)).
Until gates clear, coordinators must pick from the **fallback work queue** in
[`../agents/coordinator-loop.md`](../agents/coordinator-loop.md) instead of idling.
Updated: 2026-07-15

#### Layer checklist

- [x] MVP — Captured current develop screenshots/runtime state for module detail, rack detail, patch detail, and User Area Cool surfaces without changing backend/schema/RLS/typegen.
- [x] Structural — Applied low-risk alignment/polish fixes that keep the approved single-control placements and repeated-list-card exclusions intact.
- [x] Polish — Validated focused Cool specs/screenshots plus `pnpm lint`, docs check, and `git diff --check` before checkpoint commit.

#### Remaining approval / unblock queue

Migrated to the **Approvals ledger** in [TODO.md](./TODO.md) (2026-07-15). Register new gates
there, not here.

#### Validation notes

- 2026-07-17T11:37+02:00 — Started the explicitly approved Marketplace address-book backend checkpoint from develop `f38ddd4c`: additive private `shipping_addresses` schema/RLS/backend/cache/typegen/advisors only. User Area UI, transaction persistence, public payloads, production release, and push remain out of scope.
- 2026-07-17T11:56+02:00 — Applied `add_shipping_addresses` remotely to Supabase project `sozmatmywjpstwidzlss` after reviewer approval. Read-only verification confirmed the table columns, RLS enabled, authenticated owner-only CRUD policies, owner/default indexes, default-switch trigger, and no anon grants. `pnpm updateBackendTypes` was run against the project; unrelated generated type regressions were reverted, leaving only `shipping_addresses` added.
- 2026-07-17T11:56+02:00 — Supabase advisors after apply: no `shipping_addresses` security findings; one expected `INFO` performance finding for fresh unused index `shipping_addresses_owner_order_idx` ([unused index lint](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index)). Pre-existing unrelated findings remain in these categories: security definer views ([0010](https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view)), RLS disabled in public ([0013](https://supabase.com/docs/guides/database/database-linter?lint=0013_rls_disabled_in_public)), executable security definer functions for API roles ([0028](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [0029](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)), permissive always-true RLS ([0024](https://supabase.com/docs/guides/database/database-linter?lint=0024_permissive_rls_policy)), mutable function search path ([0011](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable)), leaked-password protection ([Auth docs](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)), vulnerable Postgres version ([upgrade docs](https://supabase.com/docs/guides/platform/upgrading)), plus pre-existing performance findings for auth RLS initplans ([0003](https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan)), duplicate indexes ([0009](https://supabase.com/docs/guides/database/database-linter?lint=0009_duplicate_index)), multiple permissive policies ([0006](https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies)), unindexed foreign keys ([0001](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys)), and one no-primary-key item ([0004](https://supabase.com/docs/guides/database/database-linter?lint=0004_no_primary_key)).
- 2026-07-08T15:58+02:00 — Cross-entity Cool detail placement polish completed: authenticated before/after screenshots captured for module detail, rack detail, patch detail, and User Area; Cool moved out of fixed floating actions into the approved in-context detail card/action rows. Focused placement specs (74 passed), Cool/user-area specs (26 passed), reviewer approval, `pnpm lint`, docs check, and `git diff --check` pass. Production flag remains off; no backend/schema/RLS/typegen/release/push changes.
- 2026-07-08T15:35+02:00 — Price Hub frontend cleanup completed with focused module-price listing specs (41 passed), `pnpm lint`, docs check, reviewer approval, and `git diff --check`.
- 2026-07-08T15:35+02:00 — Cloudflare upload/compression guardrail docs slice: expanded plan `plans/cloudflare-image-proxy-and-r2-media-migration.md` "Upload/compression guardrail proposal" section into actionable form. Validated with `node scripts/checks/check-docs.cjs` and `git diff --check` (docs-only change).

#### Decision log

- 2026-07-17T11:37+02:00 — Address-book backend checkpoint uses UUID `shipping_addresses.id`, owner FK `profileid -> profiles.id`, no phone column, authenticated owner-only CRUD RLS with `(select auth.uid())`, and a trigger plus partial unique index to safely switch one default address per owner.
- 2026-07-08T15:35+02:00 — Completed and archived Price Hub frontend cleanup. Staged Cloudflare upload/compression guardrail proposal next because it is the highest-priority remaining non-backend, non-RLS, non-release task with a safe planning/proposal slice; R2 migration and object cleanup remain operator-gated.
- 2026-07-08T15:35+02:00 — Docs slice of the guardrail proposal completed (actionable seam + approval questions + future checklist + validation strategy + non-goals). Overall Cloudflare task remains **staged / blocked** on maintainer approval of the seven threshold/UX questions; no upload enforcement, R2 migration, storage mutation, or production release is authorized.
- 2026-07-08T15:36+02:00 — Staged Cross-entity Cool reactions next because higher-priority open items are backend/schema/RLS/typegen/credential gated, while Cool has an approved safe visual-review/develop-only polish slice. Next agent must use real screenshots before UI conclusions and avoid schema/RLS/typegen/backend/release/push changes.
- 2026-07-08T15:58+02:00 — Completed the safe Cross-entity Cool visual polish slice. No next autonomous task is staged because remaining known items require explicit schema/RLS/typegen/backend/storage/credential/product or production/release approval.
