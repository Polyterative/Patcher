<!-- Auto-split from TODO.md by scripts/split-todo.cjs. -->
<!-- Section: INFRA (independent; pick any time a product task is blocked) -->

#### MEDIUM: Manufacturer page — parity with module browser filters

**Why:** The manufacturer detail page shows modules via `app-module-list` with only
`[showSearch]="true"` and `[showOrder]="true"` — basic name search and sort. The full
module browser has a sidebar with: **name, description search, HP condition + value,
standard, tags, sort, reset**. Users navigating a manufacturer's catalogue cannot filter
by standard (1U vs 3U), HP size, or tags — common operations when browsing a large
catalogue like Mutable or Make Noise.

**Current state:**
- `app-module-list` has `showSearch` (local name filter) and `showOrder` (sort + group).
- `defaultGroupId='standard'` is already set on the manufacturer page — grouping by
  standard already works, it just can't be *filtered*.
- All advanced filters in the module browser are server-side via `ModuleBrowserRootDataService`;
  on the manufacturer page all modules are loaded client-side (manageable — manufacturer
  catalogues are small enough for client-side filtering).

**Approach — shared filter bar component:**

Extract the advanced filter controls into a reusable `ModuleFilterBarComponent` (or extend
`app-module-list` inputs) so the same filters appear in both contexts without code
duplication. Client-side filtering is acceptable on the manufacturer page (no pagination
needed for a single manufacturer's catalogue).

**Filters to add to manufacturer page (parity):**

| Filter | Already present | Notes |
|--------|----------------|-------|
| Name search | ✅ via `showSearch` | keep |
| Sort / group | ✅ via `showOrder` | keep, including `defaultGroupId='standard'` |
| Standard (1U / 3U) | ❌ | most requested — lets user focus on 1U tiles only |
| HP condition + value | ❌ | useful for large catalogues |
| Tags | ❌ | filter by function category |
| Description search | ❌ | low priority, add if the shared component makes it free |
| Reset button | ❌ | add alongside other filters |

**Manufacturer-specific controls to preserve:**
- The stat showcase grid above the module list (stays unchanged).
- `defaultGroupId='standard'` grouping — keep as default even when the standard filter
  is active (consistent visual structure).

**Checklist:**

- [x] Audit `app-module-list` and decide: extend with more `@Input()` filter flags, or
      extract a separate `ModuleFilterBarComponent` that wraps the `LocalDataFilterService`
      pattern. Prefer extraction if 3+ contexts will need the same bar. **Decision: extended
      app-module-list with `@Input() showFilters = false` — only 2 contexts currently.**
- [x] Implement client-side standard / HP / tag filtering in the manufacturer context
      (pipe on the `modulesData$` stream, no new backend queries).
- [x] Add the filter controls to `manufacturer-detail.component.html` — compact inline
      bar or collapsible panel (not a full sidebar; the manufacturer page layout is narrower).
- [x] Add reset functionality.
- [x] Ensure the `defaultGroupId='standard'` grouping behaviour is preserved after
      filtering (filtered results still group by standard if grouping is active — sorting
      and grouping are separate from filtering in the pipeline).
- [x] Reduce duplication: if a shared component is extracted, update the module browser
      root to use it too — one source of truth for filter controls. (Deferred: server-side
      vs client-side filtering means module browser cannot trivially share the same bar.)

---

## Decision log

<!-- Append timestamped one-liners as the plan progresses. -->

- 2026-06-14 — Existing implementation already extended `app-module-list` with `showFilters` and manufacturer detail already enabled it. Found and fixed the remaining UI-path bug: shared select options emit string ids, while module standards are numeric; `ModuleListComponent` now maps rendered standard option ids (`'', '0', '1', '2'`) to numeric filter ids before applying client-side filtering. Added a regression for that mapping.
