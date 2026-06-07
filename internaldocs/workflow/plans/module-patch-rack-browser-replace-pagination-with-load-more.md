<!-- Auto-split from TODO.md by scripts/split-todo.cjs. -->
<!-- Section: INFRA (independent; pick any time a product task is blocked) -->

#### MEDIUM: Module / Patch / Rack browser — replace pagination with "Load more"

**Why:** Page-based pagination interrupts browsing flow and loses scroll position. For
exploratory browsing of modules, patches, and racks, a "Load more" button at the bottom
is more natural: the user stays in context, results accumulate, and the action is explicit
(no accidental infinite scroll).

**Pattern: explicit "Load more" (not auto-scroll infinite load)**
Auto-loading on scroll is rejected because: it makes the footer unreachable, it can trigger
unintentional loads, and it is harder to share a specific position. A visible **"Load more"**
button gives the user control and is still far better than page navigation.

**Where to replace pagination → "Load more":**

| Context | Current | Proposed |
|---------|---------|----------|
| Module browser (`module-browser-root`) | `mat-paginator` server-side | **Load more** |
| Patch browser (`patch-browser-root`) | `mat-paginator` server-side | **Load more** |
| Manufacturer module list (`manufacturer-browser-root`) | `mat-paginator` | **Load more** |
| Public profile — racks tab | `mat-paginator` | **Load more** |
| Public profile — modules tab | `mat-paginator` | **Load more** |

**Where to keep classic pagination:**

| Context | Reason to keep |
|---------|---------------|
| User comments (`user-comments`) | Dense tabular list; user navigates to find a specific comment by date/page |
| Any admin / data-repair tables | Position-aware navigation needed |
| Module picker inside rack/patch editor | Small count, not a browsing context |

**Technical approach:**

The module browser already uses `skip$` / `take$` BehaviorSubjects for server-side
pagination. "Load more" is a straightforward adaptation:
- On "Load more" click: `skip$.next(currentItems.length)` → fetch next page → **append**
  to existing list (not replace). The current pattern replaces the list on every page
  change — the data service needs a `loadMore$` subject that accumulates results via
  `scan((acc, items) => [...acc, ...items], [])`.
- Filter/sort changes reset the accumulated list back to page 1 (same as current
  `paginatorToFirstPage$` logic, just clears the accumulator).
- The "Load more" button shows a count hint: *"Load 20 more (340 remaining)"*. Hidden when
  all results are loaded.
- On SSR / first load: render the first page normally (no change to SSR behaviour).

**Checklist:**

- [x] Refactor `ModuleBrowserDataService`: add `loadMore$: Subject<void>`, change
      `modulesList$` pipeline to accumulate pages via append on `skip > 0`.
      Reset accumulator on filter/sort change.
- [x] Replace `mat-paginator` in `module-browser-root.component.html` with a
      Load More button (inline implementation, no shared component needed).
- [x] Apply same pattern to `PatchBrowserDataService` + template.
- [x] Apply same pattern to `ManufacturerBrowserRootComponent` (client-side — simpler,
      just slice the local array and grow the slice on each "load more").
- [x] Apply same pattern to public profile rack/module tabs.
- [ ] Keep `mat-paginator` in `user-comments` and any data-table context.
- [ ] Ensure back-navigation restores scroll position and loaded items (use Angular
      route scroll strategy + serialise loaded count in router state if needed).

---

## Decision log

<!-- Append timestamped one-liners as the plan progresses. -->

