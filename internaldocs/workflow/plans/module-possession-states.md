<!-- Auto-split from TODO.md by scripts/split-todo.cjs. -->
<!-- Section: PRODUCT — Tier 0 (ship in any order; no external dependencies) -->

#### HIGH: Module Possession States

**Why:** Allows users to track modules as owned/wanted/for-sale — the DB already supports it
(`user_modules.kind` enum `HAS|WANTS|SELLS`). High solo-user value, no external dependencies.
**Source:** `internaldocs/product/ROADMAP.md` → Tier 0 → "Module Possession States"

Layer 1 (MVP — module detail segmented control): **shipped 2026-05-15 on `agent/autonomous-20260515`**

Remaining (Layer 2 — user area integration):

- [ ] Filter "My Modules" user-area to `HAS`+`SELLS` by default; add Wishlist view for `WANTS`
- [x] Filter rack/patch editor module picker to `HAS`+`SELLS` only
- [x] `SELLS` inline badge in user-area module list

---

## Decision log

<!-- Append timestamped one-liners as the plan progresses. -->

