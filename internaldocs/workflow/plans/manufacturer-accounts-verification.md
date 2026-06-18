<!-- Auto-split from TODO.md by scripts/dev/split-todo.cjs. -->
<!-- Section: PRODUCT — Tier 1 (requires Manufacturer Page Phase 2 to be live) -->

#### HIGH: Manufacturer Accounts & Verification

**Why:** Manufacturer pages need a trustable ownership model before claim review, verified-owner editing, analytics, or B2B surfaces can ship.
**Blocked on:** Local Supabase/Docker availability for M1 type generation; any remote Supabase/RLS policy work still needs explicit approval.

- [ ] Add the claims-backed ownership model and generated types once local type generation is available
- [ ] Add claim read/create/withdraw methods scoped to manufacturer detail surfaces
- [ ] Add CTA states for claim, pending review, needs-more-info, rejection, and owner mode
- [ ] Allow verified owners to edit official profile fields, logo, social links, MSRP, and availability tags inline
- [ ] Keep authoritative manufacturer availability separate from community `module_tags`

## Execution plan files

- [Execution roadmap](./manufacturer-accounts-verification-00-execution-roadmap.md)
- [M1 — Schema foundation](./manufacturer-accounts-verification-m1-schema-foundation.md)
- [M2 — Backend access layer](./manufacturer-accounts-verification-m2-backend-access.md)
- [M3 — Admin review queue](./manufacturer-accounts-verification-m3-admin-queue.md)
- [M4 — Manufacturer claim CTA](./manufacturer-accounts-verification-m4-claim-cta.md)
- [M5 — Verified-owner profile/logo edit](./manufacturer-accounts-verification-m5-owner-edit.md)
- [M6 — Module availability tags](./manufacturer-accounts-verification-m6-availability-tags.md)
- [M7 — Validation and review](./manufacturer-accounts-verification-m7-validation.md)

---

## Decision log

<!-- Append timestamped one-liners as the plan progresses. -->
- 2026-06-18T11:07+02:00 — User approved designing and implementing the local-only manufacturer ownership and claim-review schema/RLS work, with agents stopping before applying any remote Supabase migration.
- 2026-06-18T11:07+02:00 — MVP claim requests require a manufacturer page plus a proof note only; no email/domain or document-upload requirement for the first pass.
- 2026-06-18T11:07+02:00 — MVP supports exactly one verified owner per manufacturer; multi-owner/collaborator support is deferred until traction justifies it.
- 2026-06-18T11:07+02:00 — MVP should include a minimal in-app admin review queue for approving pending manufacturer claims.
- 2026-06-18T11:07+02:00 — Manufacturer-claim admin queue should live under the existing admin-only area guarded by the current `admin` app_metadata role.
- 2026-06-18T11:07+02:00 — MVP claim lifecycle statuses are `pending`, `approved`, `rejected`, and `needs_more_info`.
- 2026-06-18T11:07+02:00 — Admin review notes are optional for all decisions, including `rejected` and `needs_more_info`.
- 2026-06-18T11:07+02:00 — Verified owners should be able to edit broad official manufacturer/catalogue content: manufacturer profile, official website/social links, logo/images, module details, pricing/MSRP, and richer availability states such as prototype, kit project, reseller availability, discontinued, and remaining stock/contact-manufacturer cases.
- 2026-06-18T11:07+02:00 — Verified-owner catalogue edits should publish immediately in the MVP; no audit/history/rollback layer is required for first implementation.
- 2026-06-18T11:07+02:00 — Manufacturer-owned module availability should use multiple availability tags per module because states can overlap.
- 2026-06-18T11:07+02:00 — First availability tag set: available new, available through resellers, kit/DIY, prototype, limited stock, discontinued, and contact manufacturer.
- 2026-06-18T11:07+02:00 — MVP should not add module-level purchase/reseller links; official links stay on the manufacturer page.
- 2026-06-18T11:07+02:00 — Manufacturer logos/images should be uploaded through app storage in the MVP, not provided only as external URLs.
- 2026-06-18T11:07+02:00 — User approved local Supabase storage bucket/policy definitions for manufacturer logo uploads, with agents stopping before remote apply.
- 2026-06-18T11:32+02:00 — M1 read-only schema inspection found `manufacturers.adminUser` is existing `text`; local policies compare verified ownership with `auth.uid()::text` while new decision/audit FKs use `profiles(id)` UUIDs.
- 2026-06-18T11:32+02:00 — M1 read-only storage inspection found no existing `manufacturer-logos` bucket; the local migration explicitly creates a public bucket before adding owner/admin write policies.
- 2026-06-18T11:32+02:00 — M1 local type generation is blocked because the Supabase CLI cannot reach Docker/local Supabase; `src/backend/database.types.ts` is intentionally unchanged.
