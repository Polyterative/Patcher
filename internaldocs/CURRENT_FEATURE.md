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

### Duplicate-Manufacturer Guard in Module Adder

**Goal:** Prevent users from creating a manufacturer that already exists in the DB.
When the user types in the "Create new manufacturer" inline form, reactively detect
case-insensitive name matches against the loaded manufacturer list and surface a
prominent warning with a one-click "Use existing" shortcut.

---

#### Key files

- `src/app/features/module-browser/module-browser-adder/module-adder-data.service.ts`
- `src/app/features/module-browser/module-browser-adder/module-browser-adder.component.html`

---

#### Layer 1 – MVP (data wiring)

- [x] Add `duplicateManufacturer$ = new BehaviorSubject<{id:string;name:string}|null>(null)` to
  `ModuleAdderDataService`.
- [x] In constructor, wire `newManufacturerNameControl.valueChanges` → case-insensitive lookup in
  `_manufacturerOptions$.value` → emit result into `duplicateManufacturer$`.
  Use `takeUntil(this.destroy$)`.
- [x] Add public method `selectExistingManufacturer(m:{id:string;name:string})` that:
  1. Sets the manufacturer form control to `m`.
  2. Resets `newManufacturerNameControl` and `showNewManufacturerForm$`.
  3. Resets `duplicateManufacturer$` to `null`.
- [x] Guard `createManufacturer$` pipeline: add
  `filter(() => this.duplicateManufacturer$.value === null)` before the `switchMap`.

#### Layer 2 – Structural (template)

- [x] Inside the inline manufacturer creation block, after the `mat-form-field`, add a
  conditional warning panel using `@if (dataService.duplicateManufacturer$ | async; as dup)`.
- [x] Warning panel content:
  - Warning icon + "Manufacturer already exists" headline (amber colour).
  - Text: `"{{ dup.name }}" is already in the database.`
  - "Use existing" button → calls `dataService.selectExistingManufacturer(dup)`.
- [x] Disable the **Create** button when `duplicateManufacturer$` is non-null (in addition to
  existing disabled conditions).

#### Layer 3 – Polish

- [ ] Near-match detection: also warn (softer, yellow-info rather than amber-warning) when a
  manufacturer name is a close partial match (e.g. same after stripping punctuation/spaces).
  Only show this if no exact match was found.
- [ ] Reset `duplicateManufacturer$` to `null` when the inline form is closed/cancelled.

---

#### Decisions / notes

- Exact match = `trim().toLowerCase()` equality.
- Near-match = normalized (strip non-alphanumeric) equality — shown as a softer advisory only.
- No new backend call needed; we check against the already-loaded `_manufacturerOptions$`.
- Layer 3 (near-match) is optional and can be deferred.

---

#### Status

Awaiting user approval.
