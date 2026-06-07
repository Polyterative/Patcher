<!-- Auto-split from TODO.md by scripts/split-todo.cjs. -->
<!-- Section: PRODUCT — Tier 1 (requires Manufacturer Page Phase 2 to be live) -->

#### HIGH: Manufacturer Accounts & Verification

**Why:** Manufacturer pages need a trustable ownership model before official-field editing, updates, analytics, or B2B surfaces can ship.
**Blocked on:** Explicit user approval for any required Supabase/RLS policy work around `manufacturer_accounts`.

- [ ] Add the minimal `manufacturer_accounts` table shape and generated types once policy work is approved
- [ ] Add claim read/create methods scoped to manufacturer detail surfaces
- [ ] Add CTA states for claim, pending review, and ownership-review request
- [ ] Limit first verified edits to official profile fields, MSRP, and official links
- [ ] Keep shared catalogue edits audited or review-gated

---

## Decision log

<!-- Append timestamped one-liners as the plan progresses. -->

