<!-- Auto-split from TODO.md by scripts/dev/split-todo.cjs. -->
<!-- Section: PRODUCT — Tier 0 (ship in any order; no external dependencies) -->

#### MEDIUM: Module Browser — Tag Filter UX improvements

**Why:** The tag selector in the module navigator is hard to use at scale: the current UI is a
plain scrollable list. Tags should instead be shown as grouped, selectable chips — mirroring the
`proposer-groups` panel already in `module-tags.component.html` — so the picker is graphical,
scannable, and repeatable rather than a wall of text to scroll.

- [x] **Replace the flat tag list with a rich grouped-chip picker.** Reuse (or extract into a
      shared component) the `proposer-groups` pattern from
      `src/app/components/module-parts/module-minimal/module-tags/module-tags.component.html`:
      tags grouped by category label, each rendered as a `mat-chip-option` inside a
      `mat-chip-listbox [multiple]="true"`. The picker opens inline (not a dropdown) below the
      filter controls so all groups are visible at once. Selected chips highlight via Angular
      Material's built-in `[selected]` binding.
- [x] Add a **search input** at the top of the chip picker to filter visible tags in real-time.
      Wire it as a local `BehaviorSubject<string>` with `debounceTime(300)` +
      `distinctUntilChanged`; filtering is client-side (tags already loaded). Clears on reset.
- [x] Add a small **AND / OR toggle** (`mat-button-toggle-group`) above the chip groups.
      Default: OR (current implicit behaviour).
      - **OR** — modules matching *any* selected tag are returned
      - **AND** — only modules carrying *all* selected tags are returned
- [x] Add a **tag-match relevance sort** to the module browser results. When one or more tags are
      selected, expose a sort option "Best match" (or similar label) that ranks modules by the
      number of selected tags they satisfy — descending (most matching tags first). This is a
      client-side derived score: `matchScore = selectedTags.filter(t => module.tags.includes(t)).length`.
      "Best match" should become the default sort automatically when tags are active; revert to the
      previous sort when all tags are deselected. In OR mode the score drives the ranking; in AND
      mode all shown modules satisfy every tag so the score is always equal — in that case "Best
      match" collapses to the secondary sort (e.g. alphabetical) and the option can be hidden.

---

## Decision log

<!-- Append timestamped one-liners as the plan progresses. -->

