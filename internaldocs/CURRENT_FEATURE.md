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

### Manufacturer Page — Phase 1 Polish Pass

**Goal:** Complete the manufacturer page to production quality — proper layout, dynamic title, separate loading states,
correct view config, verified error-free compile.

---

#### Key files

- `src/app/features/module-browser/manufacturer-detail/manufacturer-detail.component.html`
- `src/app/features/module-browser/manufacturer-detail/manufacturer-detail.component.ts`
- `src/app/features/module-browser/manufacturer-detail/manufacturer-detail.component.scss`
- `src/app/features/module-browser/manufacturer-detail/manufacturer-detail-data.service.ts`
- `src/app/features/module-browser/module-browser.module.ts`

---

#### Layer 1 – MVP (data wiring)

- [x] `get.manufacturerWithId` + `get.modulesBySameManufacturer` wired in data service
- [x] ReplaySubject trigger pattern, `manufacturerData$` + `modulesData$` + `isLoading$`
- [x] Route `/manufacturers/:id` in router

#### Layer 2 – Structural (template)

- [x] `lib-hero-content-card` wrapper with dynamic `titleNormal` (manufacturer name)
- [x] `lib-screen-wrapper` for responsive max-width
- [x] Manufacturer header card: logo (with placeholder fallback), name, website link
- [x] Separate loading indicator for manufacturer header vs module list
- [x] `lib-auto-content-loading-indicator` wired with `data$` + `updateData$` for module grid
- [x] `app-module-list` with production `moduleViewConfig` (buttons on, manufacturer hidden)
- [x] Empty state when no modules

#### Layer 3 – Polish

- [x] `module-part-manufacturer` links to `/manufacturers/:id`
- [x] "View manufacturer" button in module-browser-detail info card
- [x] SEO `updateSeo` with manufacturer name/description/url
- [x] JSON-LD `Organization` script tag injected/cleaned on destroy
- [x] Manufacturers added to sitemap
- [x] 12 unit tests passing

#### Remaining checks

- [ ] Verify no compile errors on all new/changed files
- [ ] Re-run tests to confirm still green after template changes
- [ ] Move Module Review Flagging back to Backlog in TODO

---

#### Status

Polish pass in progress.

---

## Empty Template

```
### Feature Name

**Goal:** One sentence.

---

#### Key files

- `path/to/file.ts`

---

#### Layer 1 – MVP (data wiring)

- [ ] Step

#### Layer 2 – Structural (template)

- [ ] Step

#### Layer 3 – Polish

- [ ] Step

---

#### Decisions / notes

-

---

#### Status

Not started.
```