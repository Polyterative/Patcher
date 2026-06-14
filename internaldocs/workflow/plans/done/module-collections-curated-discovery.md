<!-- Section: PRODUCT — Tier 0 (ship in any order; no external dependencies) -->

#### MEDIUM: Module Collections — curated discovery playlists

**Why:** Patcher can make module discovery feel more personal and exploratory by letting
users curate named collections of modules, similar to playlists. A collection can tell a
story: "small-system ambient starters", "weird modulation utilities", "great beginner
oscillators", "West Coast voices", or "modules I heard in this patch". This gives users
a reason to browse beyond search and filters, and creates shareable paths into cool
modules they might not otherwise find.

**Product concept:**

- Users can create module collections with a strong title, description, and ordered list
  of modules.
- Collections can include optional media: cover image, embedded audio example, video, or
  linked patch/rack context when available.
- Each module entry can optionally have curator notes explaining why it is included,
  what sound or workflow it enables, or what it pairs well with.
- Collections can be public, private, or unlisted/share-link-only.
- Public collections become discovery surfaces across the app: module detail pages,
  module browser, user profiles, search, and future home/explore feeds.
- Collections should support lightweight social signals later: saves, follows, "cool",
  copy/remix, and featured/editorial picks.

**Discovery value:**

- Turns isolated module pages into narrative paths through the catalog.
- Lets experienced users teach taste and context without needing to write long guides.
- Gives newer users practical starting points: genre, rack size, budget, musical goal,
  technique, or manufacturer theme.
- Creates a reusable destination for media-led discovery: "hear these modules together"
  or "watch this collection in action".
- Opens space for official manufacturer or community-curated collections without requiring
  a full blog/editorial system.

**MVP shape:**

- [ ] Create, edit, delete collections owned by a user.
- [ ] Add/remove/reorder modules within a collection.
- [ ] Add title, short description, optional cover image, and visibility.
- [ ] Show collection detail page with module cards and curator notes.
- [ ] Surface "appears in collections" on module detail pages.
- [ ] Add a basic public collections browser sorted by recent / popular / saved.

**Structural follow-up:**

- [ ] Optional media attachments: audio, video, external links, patch/rack references.
- [ ] Save/follow collections for later.
- [ ] Copy/remix a public collection into a user's own version.
- [ ] Collection tags for musical style, technique, rack size, experience level, and mood.
- [ ] Featured collections surface on home/explore and manufacturer pages.
- [ ] Moderation/reporting rules for public collection titles, descriptions, notes, and media.

**Open product questions:**

- Should collections be module-only at first, or allow mixed content such as racks,
  patches, manufacturers, and external media?
- Should audio/media be uploaded to Patcher, embedded from external services, or both?
- Should collection order be fully manual, or support sections like a guide?
- What visibility default best fits user trust: private draft first, or public by default?
- Are manufacturer-owned collections part of MVP, or a later verified-account feature?

---

## Decision log

- 2026-06-11 — Scoping result pointed to a greenfield collections feature with no existing tables or UI scaffolding.
- 2026-06-11 — Chose module-only MVP, private default, manual ordering, and existing cover-image upload patterns to keep the first release shippable.
- 2026-06-11 — Split collection-editor backend access into a co-located data service so the component stayed within the repo layering rules.
- 2026-06-11 — Extended generated Supabase types manually for the new collection RPCs/tables so the feature could compile before backend type regeneration.
- 2026-06-11 — Polished the public collections browser/detail surfaces and home discovery rows with tighter hierarchy, clearer empty states, and flatter card chrome.
- 2026-06-11 — Applied Supabase migration `20260611191437_add_module_collections` to create `module_collections`, `module_collection_entries`, timestamp triggers, public-id trigger, and collection RPCs. RLS/policies were intentionally not changed in this migration and need a separate explicit approval pass.
- 2026-06-12 — Frontend/backend collection flows intentionally moved off collection RPCs and onto direct `module_collections` / `module_collection_entries` table queries through `SupabaseService`; existing RPCs remain unused until a later DB cleanup pass.
- 2026-06-14 — Extended public collection detail SEO/share metadata through the existing `SeoAndUtilsService` pattern with collection title, description, canonical URL, author, cover image, keywords, and timestamps.
- 2026-06-14 — Added collection creation/discovery analytics through `AnalyticsService` without sending raw search text; archived the feature after all active layers were checked off.
