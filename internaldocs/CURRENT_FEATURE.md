# Current Feature / AI RAM

> **Rules for AI agents:**
> 1. Read this file at the start of every session.
> 2. Keep it updated — check off steps, add discoveries.
> 3. One feature at a time — archive to [COMPLETED.md](./COMPLETED.md) when done, then reset.
> 4. This file owns implementation detail; `TODO.md` owns the backlog.
> 5. **Every feature uses three layers** (MVP → Structural → Polish). Define all three before coding. Complete each
     layer before starting the next. Layout before interactions.

---

## Feature: Left-Sidebar Filter Panel for Browser Pages (Module / Rack / Patch)

**Status:** ✅ Layer 1 complete — ready for Layer 2

### Root cause

All three browser pages (Module, Rack, Patch) currently render their filter controls in a horizontal `rowwrap` strip
above the results grid. On desktop this wastes vertical space and forces users to scroll past filters to reach content.
The UX goal is an Amazon-style persistent left sidebar that keeps filters always visible while the results grid uses the
remaining horizontal space — a well-established desktop pattern that dramatically increases content density and
scannability.

### Key files

| File                                                                                     | Role                                                                                        |
|------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------|
| `src/app/features/module-browser/module-browser-root/module-browser-root.component.html` | Module browser template — currently holds the `rowwrap` filter strip                        |
| `src/app/features/module-browser/module-browser-root/module-browser-root.component.scss` | Module browser styles                                                                       |
| `src/app/features/module-browser/module-browser-root/module-browser-root.component.ts`   | Module browser component — owns `ModuleBrowserDataService`                                  |
| `src/app/features/patch-browser/patch-browser-root/patch-browser-root.component.html`    | Patch browser template                                                                      |
| `src/app/features/patch-browser/patch-browser-root/patch-browser-root.component.scss`    | Patch browser styles                                                                        |
| `src/app/features/routes/rack/rack-browser-root/rack-browser-root.component.html`        | Rack browser template                                                                       |
| `src/app/features/routes/rack/rack-browser-root/rack-browser-root.component.scss`        | Rack browser styles                                                                         |
| `src/app/shared-interproject/`                                                           | Shared directives/pipes/components — candidate home for a reusable `FilterSidebarComponent` |
| `src/app/style/`                                                                         | Global SCSS — any new sidebar layout utility class belongs here                             |

### Data-flow analysis

- Each browser page has a dedicated `*DataService` (component-scoped) that owns reactive form `fields` objects and
  BehaviorSubjects for pagination/filtering.
- Filter controls bind directly to `dataService.fields.*.control` via `lib-mat-form-entity`.
- No state needs to move; only the **template layout** changes. The sidebar is a purely presentational restructure.
- On narrow viewports the sidebar must collapse (CSS breakpoint, not JS), reverting to the current stacked layout so
  mobile is unaffected.

### Constraints

- Desktop-first improvement; mobile layout must remain unchanged (use existing breakpoint utility classes like
  `col-lt-MD`).
- Filters are already reactive via Angular forms — no new state management needed.
- Follow project SCSS conventions: utility classes in `tools.scss`, no inline styles for multi-property rules.
- Use Angular Material `mat-sidenav` or plain CSS flex layout — **prefer plain flex** to avoid adding a new Material
  module dependency in Layer 1 MVP.
- Reusable sidebar wrapper component should live in `shared-interproject/components/` if extracted (Layer 2+).
- Do not break existing e2e tests (`e2e/module-browser.spec.ts`, `e2e/rack-browser.spec.ts`,
  `e2e/patch-browser.spec.ts`).
- Keep `lib-hero-content-card` outer wrapper; the two-column layout goes **inside** it.

---

### Implementation Steps

#### Layer 1 — MVP (Sidebar layout on all three browser pages)

> **Decision (2026-02-20):** Apply Layer 1 directly to all three pages (Module, Patch, Rack) rather than
> module-only first. The reset button on the module page must appear **after** the "Submit module" CTA, not before.

- [x] L1-1 — **Module browser.** Replace `rowwrap` strip with `sidebar-layout` two-column flex. Left `<aside>` holds
  all filter fields + "Submit module" CTA + reset button (reset comes last). Right `.content-area` holds list,
  paginator, loading indicator.
- [x] L1-2 — `module-browser-root.component.scss`: `sidebar-layout` + `filter-sidebar` + `content-area` blocks with
  `@media (max-width: 959px)` stacking fallback.
- [x] L1-3 — Validate module browser compile + e2e smoke.
- [x] L1-4 — **Patch browser.** Add `resetForm$: Subject<void>` to `PatchBrowserDataService` with a handler that
  resets `search` to `''` and `order` to the default value, then triggers a reload. Apply the same `sidebar-layout`
  HTML structure to `patch-browser-root.component.html`. Add matching SCSS to `patch-browser-root.component.scss`.
- [x] L1-5 — **Rack browser.** Same as L1-4 for `RackBrowserDataService` and `rack-browser-root`.
- [x] L1-6 — Validate all three pages compile clean.

#### Layer 2 — Structural (Shared SCSS + resetForm$ consistency)

> **Decision (2026-02-20):** Skip extracting a `BrowserSidebarLayoutComponent` — the added abstraction
> isn't worth it for three pages with different content slots. Instead, centralise the shared CSS and
> normalise the data-service reset pattern so all three pages stay in sync automatically.

- [x] L2-1 — Move `.sidebar-layout`, `.filter-sidebar`, `.browser-content-area` CSS blocks from the three
  component stylesheets into `src/app/style/tools.scss`. Each component stylesheet is now a one-liner
  comment. Rename `content-area` → `browser-content-area` in all three templates to use the global class.
- [x] L2-2 — Fix `ModuleBrowserDataService.resetForm$` subscriber to use `{emitEvent: false}` on **all**
  fields (previously only `name` suppressed events; `order`, `manufacturers`, `hp`, `hpCondition`,
  `standard`, `description` did not — causing multiple `updateModulesList$` emissions per reset).
  Now sets all serverside state explicitly and emits `updateModulesList$` once, matching the
  patch/rack pattern exactly.
- [ ] L2-3 — Validate: run e2e smoke tests for all three browser pages. Fix any selector regressions.

#### Layer 3 — Polish (UX details)

> **Decision (2026-02-20):** Collapse toggle, sticky sidebar, and filter-count badge are **not wanted**. Layer 3
> is limited to a final full-suite validation pass.

- [ ] L3-1 — Full suite `yarn test-headless` passes. Manual desktop review of all three browser pages for visual
  consistency.