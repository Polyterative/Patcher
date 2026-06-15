<!-- Auto-split from TODO.md by scripts/dev/split-todo.cjs. -->
<!-- Section: INFRA (independent; pick any time a product task is blocked) -->

#### LOW: Rack Editor — "Weakest category" hint in module picker

**Why:** When browsing modules to add to a rack, the user has no contextual nudge about
what the rack is currently missing. A single word — the balance category with the lowest
score — is enough signal without being prescriptive.

**Design intent:** the hint should feel like a whisper, not a recommendation engine.
One small chip/badge, one word, always present during module search in edit mode.

**Implementation:**
- `RackBalanceAnalysisService.analyze()` already returns `axes` sorted by `share`.
  The weakest axis is `axes.sort((a,b) => a.share - b.share)[0]`.
- Render its `label` (e.g. *"Voices"*) as a muted badge near the module picker search
  input — e.g. `⬡ Voices` or just `Voices` in a secondary chip. A `matTooltip` can
  expand to *"Your rack has the least coverage in: Voices"* for users who want context.
- No separate action required — it is read-only ambient information.
- Update reactively as modules are added/removed (balance analysis is already reactive).
- Hide if the rack has no modules yet (no meaningful analysis possible).

**Checklist:**

- [x] Derive `weakestAxis$` observable in `rack-detail-data.service.ts` (or the rack editor
      data service) from the existing balance analysis stream.
- [x] Add a single small badge to the module picker / search area template, bound to
      `weakestAxis$`. Guard: only show when `modules.length > 0` and edit mode is active.
- [x] Style as a secondary/muted chip — not a CTA, not a warning. One word max visible,
      full label in tooltip.

---

## Decision log

<!-- Append timestamped one-liners as the plan progresses. -->

- **2026-06-14:** Completed as an edit-only embedded module browser badge. `RackDetailDataService.weakestBalanceAxis$` reuses `RackBalanceAnalysisService.analyze()`, returns `null` for empty/unrecognized racks, and `ModuleBrowserRootComponent` renders only the axis label with the explanatory tooltip.
