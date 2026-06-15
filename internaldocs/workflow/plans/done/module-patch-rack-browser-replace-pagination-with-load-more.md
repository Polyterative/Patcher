<!-- Auto-split from TODO.md by scripts/dev/split-todo.cjs. -->
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
- [x] Replace remaining user-area comments and patches paginators with explicit Load More buttons.
- [x] Remove stale feature-module `MatPaginatorModule` imports so product surfaces no longer render or wire Material paginators.
- [x] Ensure Load More keeps the user in context: loaded items accumulate/grow in-place and no paginator page event scroll reset remains.

---

## Decision log

<!-- Append timestamped one-liners as the plan progresses. -->

- 2026-06-14T20:02+02:00 — User clarified that no old-school paginator should remain visible. Converted user-area comments from server page replacement to append-on-load-more, converted user-area patches from local page jumps to grow-on-load-more, reused the existing modules/racks Load More styling, and removed dead Material paginator module imports from browser/manufacturer/user-area feature modules.
