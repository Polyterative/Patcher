# Current Feature / AI RAM

> **Rules for AI agents:**
> 1. Read this file at the start of every session.
> 2. Keep it updated - check off steps, add discoveries.
> 3. One feature at a time - archive to [COMPLETED.md](./COMPLETED.md) when done, then reset.
> 4. This file owns implementation detail; `TODO.md` owns the backlog.
> 5. **Every feature uses three layers** (MVP -> Structural -> Polish). Define all three before coding. Complete each
>    layer before starting the next. Layout before interactions.

---

## Active

### Panel Variants — Discovery, Presentation & Preference

**Goal:** Make the multi-panel nature of modules a visible, valued feature throughout the app — not something users accidentally stumble on. Improve every surface where panels appear, connect the rack selection preference to the broader app, and plant the foundation for a future global panel-color preference — all without touching the database schema.

---

#### Context and philosophy

Patcher's core differentiator in this domain is that **all panel variants belong to one module entity** — no duplicate module records per variant, no fragmented catalogue. This is cleaner for data integrity and community knowledge. The UX must make this philosophy feel like a superpower, not a limitation.

The key tension today: users can select a panel per-rack (newly built), but:
1. They can't easily discover that a module *has* variants in the first place
2. The module detail page — the primary place to learn about a module — shows variants in a primitive, non-interactive accordion
3. The patch editor always shows `panels[0]` regardless of rack preference
4. No global preference exists even though `color` (1=Light, 2=Dark) is already populated on 94% of panels in the DB

---

#### Data already available (no migrations needed)

- `module_panels.color: number` — `1 = Light`, `2 = Dark` — populated on 470/500 panels
- `module_panels.description: string` — human label (e.g. "Dark", "After Later Auris") — present on 437/500 panels
- `module_panels.filename` — image URL base for thumbnails
- `rack_modules.selected_panel_id` — per-rack preference already persisted
- `derivePanelLabel()` helper already extracts "Dark"/"Light" from filenames when description is empty

---

#### Discovered architecture facts

- **Module details panel block** (`module-details.component.html` lines 8–38): renders a flat image grid inside a `mat-accordion` only when `panels.length > 1`. Tooltip is the raw filename. No label, no color badge, no interactivity.
- **Panel color enum** is defined only in the module editor (`module-editor.component.ts` line 253–254): `{name:'Light', value:1}`, `{name:'Dark', value:2}`. No shared constant.
- **Patch editor** (`patch-editor.component.html`) passes module data to `app-module-composite` but never passes `selectedPanelId` — always renders `panels[0]`.
- **Module browser cards** always use `panels[0]`; no `selectedPanelId` threading.
- **`module-part-image`** already accepts `selectedPanelId` @Input with full fallback logic — just needs to be wired up in more places.
- **No user settings/preferences** page or table exists yet — global panel preference must live in `localStorage` short-term.
- **Panels are ordered by `color` ascending** in the GET query (`supabase-get.ts` line 140) — Light before Dark is the current sort order.

---

#### User needs (multi-perspective analysis)

**Casual user (browser / explorer)**
- Sees a module card in the browser — no idea it has a dark and light version
- Opens module details — sees an accordion labelled "Available in 2 versions" with raw filename tooltips
- Wants to quickly understand what variants exist and how they look
- Has a personal aesthetic preference (dark rig vs. light rig) and wants the whole app to reflect it

**Rack builder**
- Already has the right-click panel switch in racks (just shipped)
- But their panel preference set on a rack module isn't remembered anywhere else
- If they have a dark-themed rack, they want to add a new module and see the dark variant by default

**Patch editor user**
- Builds a patch with modules from their collection
- Modules always show Panel 1 — doesn't match their rack visual
- Jarring disconnect between "my rack looks like X" and "my patch diagram looks like Y"

**Content contributor (admin)**
- Adds panels to the database via the module editor
- Already has color/description fields
- Wants confidence that labels will be shown correctly across the app

**Product owner**
- Wants this philosophy ("one module, many faces") to be a differentiator
- Wants discoverability to increase — more users should *know* variants exist
- Wants the panel preference to eventually persist in the user profile (long-term, DB-backed)
- Does not want to duplicate module records per variant (competitor approach)

---

#### Layer 1 – MVP: Fix module details panel gallery

The most impactful, lowest-risk layer — purely a presentation improvement on an existing component.

- [ ] Extract a shared `PANEL_COLORS` constant (e.g. in `SharedConstants` or a `panel.constants.ts`): `{ 1: 'Light', 2: 'Dark' }` — eliminating the magic numbers currently duplicated between editor and any future code
- [ ] Rewrite the `module-details` panel block:
  - Replace the `mat-accordion` collapse with an always-visible panel gallery section — panels are important, not hidden behind a toggle
  - Each panel card shows: thumbnail image + label (from `description` ?? `derivePanelLabel` fallback) + color badge ("Light" / "Dark" chip driven by `color` field)
  - Section header: "Panel variants (N)" with a small `contrast` icon
  - Remove raw filename from tooltip; use derived label instead
  - Show a subtle "only one panel" empty state if `panels.length === 1` so users learn the concept even then
- [ ] Move `derivePanelLabel()` from `rack-editor.component.ts` (module-level function) into a shared utility pipe or service so it can be reused in `module-details` and `module-realistic` without copy-paste

#### Layer 2 – Structural: Propagate preference through the app

- [ ] **Global panel color preference (localStorage):** Add `preferredPanelColor$: BehaviorSubject<number | null>` to `AppStateService` (or a new `UserPreferencesService`), persisted to `localStorage`. Values: `null` = no preference, `1` = Light, `2` = Dark
- [ ] **Preference picker UI:** Add a small "Panel preference: Light / Dark / None" toggle in the user area header or settings surface (wherever makes most sense in the existing layout)
- [ ] **Module browser cards:** Thread `preferredPanelColor$` through `module-list` → `module-minimal` → `module-part-image`. When a preferred color is set and the module has a matching panel, show that panel instead of `panels[0]`
- [ ] **Patch editor:** Wire `preferredPanelColor$` to `module-composite` / `module-minimal` inside the patch editor — no new UX surface needed, just respects the global pref
- [ ] **Module details gallery:** Highlight the panel that matches the user's preferred color with a subtle active ring/border
- [ ] **"Switch panel" submenu in rack editor:** Pre-select (scroll to / bold) the panel matching the global preference when opening the submenu

#### Layer 3 – Polish and long-term hooks

- [ ] **Discovery badge on module browser cards:** Show a small `contrast` icon badge on cards where `panels.length > 1` — like an "available in variants" signal. On hover: "2 panel variants" tooltip. This is the most impactful discoverability change for the browser
- [ ] **Module details — click to preview:** Clicking a panel in the gallery sets a local `previewPanelId` state that updates the main hero image at the top of the module detail page (no persistence, just in-page preview). This gives the "try before you rack it" feel
- [ ] **Collection page:** If a module is in the user's collection, remember their preferred panel for that specific module (not per-rack, but per-collection-entry). This is a DB change for later — add to long-term ideas
- [ ] **User profile persistence (long-term):** Move `preferredPanelColor$` from `localStorage` to a `user_preferences` table column once that table is created. Keep the localStorage layer as a fallback/cache
- [ ] **Unit tests:** Panel color constant, `derivePanelLabel` shared utility, preference resolution logic (preferred → matching panel → fallback to panels[0])

---

#### Decisions / notes

- **No new DB migrations in this feature** — all data needed (`color`, `description`, `filename`) is already in the schema
- **`color` enum is the truth** for Light/Dark classification — not the filename. The filename-based fallback in `derivePanelLabel` is for panels missing `description` where `color` is also unreliable
- **Accordion → always-visible:** The current hide-behind-accordion pattern actively suppresses discoverability. A module with 2 panels should proudly show both on the detail page
- **`derivePanelLabel` must be shared:** Currently a module-level function in `rack-editor.component.ts` — needs to move to a pipe or utility before it gets copied elsewhere
- **Global preference before per-module preference:** Don't jump to per-module-in-collection preference (requires DB) until the global localStorage preference proves its value in usage
- **Patch editor panels:** Showing the preferred panel in the patch editor is desirable but not blocking for Layer 1/2 — it follows naturally once the preference system exists
- **Philosophy message:** Consider adding a small explainer in the module details panel section: "Patcher tracks all panel variants as one module — switch which variant you see per rack" with a link to the user guide

---

#### Status

Planning complete. Awaiting approval to begin Layer 1.



---

### Empty template

```
### Title

**Goal:** …

---

#### Key files

-

---

#### Discovered architecture facts

-

---

#### Layer 1 – MVP (data wiring)

- [ ]

#### Layer 2 – Structural (interaction model)

- [ ]

#### Layer 3 – Polish

- [ ]

---

#### Decisions / notes

-

---

#### Status

Planning.
```
