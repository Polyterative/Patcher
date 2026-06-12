# Current Feature / AI RAM

> **Rules for AI agents:**
> 1. Read this file when the task is about the active in-flight feature or explicitly references the current plan.
> 2. Keep it updated - check off steps, add discoveries.
> 3. One feature at a time - archive to [COMPLETED.md](./COMPLETED.md) when done, then reset.
> 4. This file owns implementation detail; `TODO.md` owns the backlog index, `plans/` owns per-task detail.
> 5. **Every feature uses three layers** (MVP -> Structural -> Polish). Define all three before coding. Complete each
>    layer before starting the next. Layout before interactions.
> 6. **Append to the Decision log** for any non-obvious choice (library pick, data shape, fallback policy, scope cut).
>    Future agents read this to avoid relitigating settled questions.

---

## Active

### Module Collections — curated discovery playlists

**Plan file:** [`plans/module-collections-curated-discovery.md`](./plans/module-collections-curated-discovery.md)
**Goal:** Ship a module-only collection MVP with private-by-default collection CRUD, ordered module entries, collection detail pages, module backlinks, and a public browser.

#### Assumptions

- Collections are module-only for MVP.
- Visibility defaults to private.
- Ordering is manual via ordinal positions.
- Cover images use existing upload/storage patterns.
- Manufacturer-owned collections and mixed-content collections are deferred.

#### Layer 1 — MVP

- [x] Add collection tables, entry join table, and backend wiring.
- [x] Register collection tables in backend query helpers and generated types.
- [x] Add collection create/edit/delete flows and module entry management.
- [x] Add user-area collections tab and public collections browser routes.
- [x] Surface collection backlinks on module detail pages.

#### Layer 2 — Structural

- [x] Add collection-specific data services and shared minimal/list components.
- [x] Add reusable collection card/list UI and public detail view.
- [x] Add focused unit tests for collection CRUD, ordering, and backlinks.

#### Layer 3 — Polish

- [ ] Add SEO/share metadata for public collection pages.
- [ ] Add analytics for collection creation and discovery interactions.

#### Decision log

- 2026-06-11 — Scoping result pointed to a greenfield collections feature with no existing tables or UI scaffolding.
- 2026-06-11 — Chose module-only MVP, private default, manual ordering, and existing cover-image upload patterns to keep the first release shippable.
- 2026-06-11 — Split collection-editor backend access into a co-located data service so the component stayed within the repo layering rules.
- 2026-06-11 — Extended generated Supabase types manually for the new collection RPCs/tables so the feature could compile before backend type regeneration.
- 2026-06-11 — Polished the public collections browser/detail surfaces and home discovery rows with tighter hierarchy, clearer empty states, and flatter card chrome.
- 2026-06-11 — Applied Supabase migration `20260611191437_add_module_collections` to create `module_collections`, `module_collection_entries`, timestamp triggers, public-id trigger, and collection RPCs. RLS/policies were intentionally not changed in this migration and need a separate explicit approval pass.
- 2026-06-12 — Frontend/backend collection flows intentionally moved off collection RPCs and onto direct `module_collections` / `module_collection_entries` table queries through `SupabaseService`; existing RPCs remain unused until a later DB cleanup pass.
