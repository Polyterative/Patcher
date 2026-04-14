# Product Roadmap

> Product arc, horizon features, and long-term idea placement. Strategy principles live in
> [PRINCIPLES.md](./PRINCIPLES.md).

---

## Product Arc

Patcher has three distinct phases of value:

1. **Solo tool** — already shipped. Users document their racks, wire patches, manage their module collection.
2. **Community platform** — in progress. Users share content publicly, browse others' work, contribute data.
   **Gate:** navigable public user profiles with privacy controls.
3. **Market layer** — planned. Users buy/sell modules; Patcher becomes a price reference for the Eurorack market.
   **Gate:** Phase 2 community layer is stable and trusted.

Each phase is additive and non-destructive to the previous. The Phase 2 gate is specifically **public user profiles** —
Contextual Activity and the read-only Price Hub layers are Phase 2 work but are not themselves gates. Features in Phase
3 that do not require a buyer-seller social surface (e.g. read-only cross-store price display) can be built during Phase
2 as module page enrichment.

**Compounding principle:** Every feature should make prior work retroactively more valuable — not just add something new
on top. Manufacturer Pages become more useful when pricing lands. Store Links seed the Price Hub on day one. Patch Tags
unlock Collection-Aware Discovery. Public Profiles make Comments (already live) attributable. Marketplace transactions
generate the Price Hub data that makes the hub valuable. The ordering is chosen specifically to maximise this
compounding — skipping steps doesn't just delay later features, it removes value from earlier ones.

---

## Horizon Features

> Ordered by dependency tier, not desirability. Features in Tier 1 unblock Tier 2; Tier 2 unblocks Tier 3.
> Within a tier, order reflects strategic priority.

---

### Tier 0 — Immediate Value *(no external dependencies; ships independently)*

These deliver value to the current solo user base without waiting for community, profiles, or marketplace. Each item is
also a foundation that later tiers build on directly — they are not one-shots.

#### Manufacturer Pages

Dedicated page per manufacturer. Backend query already exists — this is a UI-only task. High SEO value today. **Upgrades
when:** Price Hub lands → becomes a price reference page per brand. Manufacturer Accounts land → becomes a verified,
managed brand page.

#### Store Links per Module *(Price Hub prerequisite)*

A single canonical "buy new" URL per module (e.g. Thomann, Perfect Circuit). Useful immediately as a convenience on the
module detail page. **Upgrades when:** Price Hub layer 1 ships → link becomes the anchor of cross-store price
comparison. Affiliate tracking is added → every click becomes a revenue event.

#### Patch Tags

Useful for solo users organising their own patches today — find "my ambient patches" without scrolling through 50 items.
Free-form tags are sufficient for v1; a curated taxonomy can layer on top later. **Upgrades when:** Community layer is
active → tags become the filtering layer for Collection-Aware Discovery, the feature that makes the whole collection
model pay off.

#### Media Attachment on Patches *(embed-only v1)*

A YouTube or SoundCloud embed link on a patch: a solo user's memory aid ("this is the patch from that recording"). No
upload, no moderation needed — just a URL field and an embed renderer. **Upgrades when:** Public Profiles ship → the
embed becomes a public showcase on the user's profile and the patch's public page, with zero additional work.

#### Module Flagging

Report bad data (wrong HP, missing image, duplicate) from the module detail page. Reports go to a private admin queue —
no community layer needed. **Upgrades when:** UGC Trust Model tiers are implemented → flag submissions count toward a
user's trust tier, creating a quality incentive. Already scoped in [../workflow/TODO.md](../workflow/TODO.md).

#### Rack-local HP override *(disabled pending review)*

This is **not an approved product feature right now**. The rack-editor UI entry points have been removed and the current
state is "do not re-enable until someone explains why it exists and gets explicit product approval." If the underlying
plumbing stays around for migration safety or investigation, keep it non-discoverable in the UI.

#### Rack Module Panel Variant Switching

Switch a module's visible panel variant inside a rack (light/dark/special) without creating duplicate module records.
This keeps catalogue data canonical while presentation can still vary safely in the user's private rack context.
**Boundary:** do not couple this to collection ownership;
racks must remain valid for planned builds, past systems, and setups that do not exactly mirror what the user currently
owns.

### Tier 1 — Community Foundation *(must ship before Tier 2)*

#### Public User Profiles

Public activity pages showing a user's public racks, patches, sale listings, and price contributions. Currently users
can only see their own profile — there is no way to navigate to another user's page.

This is the **single blocking dependency** for the module marketplace and community price reporting. Without it:

- Buyers cannot see who is selling or establish any trust in a seller.
- Price report contributions have no social attribution, making spam trivially easy.
- Collection-aware patch discovery has no social dimension.

Privacy defaults and URL scheme are resolved in
[Privacy & Sharing Philosophy](./PRINCIPLES.md#privacy--sharing-philosophy).
The profile page must be statically renderable for SEO.

---

#### Contextual Activity

*Companion to Public User Profiles — not a gate for Tier 2.*

Rather than a dedicated feed, activity surfaces inline where relevant: a module detail page shows recent data changes, a
patch page shows its revision history, a rack page shows last edit and comments. Users encounter activity while doing
something else — not by visiting a separate stream. This sidesteps the cold-start problem of a global feed that feels
empty at low volume.

A lightweight "what's new" summary on the home page remains an option once public activity volume justifies it. Activity
on private entities is visible to the owner only.

**Recent Activity UI direction (shared component):**

- Introduce a reusable **Recent Activity** surface that can be dropped into multiple pages with the same visual and
  behavioral language.
- Placement principle: on browse/index pages, show it **directly below filters** so users immediately see "what changed"
  in the current context, but allow it to hide on mobile when space is too tight.
- The surface should be **fully data-driven**: each entry is rendered from a standard activity shape (actor, action,
  target, time, optional context) so new activity types can be added without redesigning the UI each time.
- Comments are the reference pattern: attributable, contextual, and naturally reusable across modules, racks, patches,
  and future entities.
- Keep the activity layer utility-focused (recent edits, comments, listings/prices updates) rather than
  engagement-driven. No social-feed mechanics.

**Open questions for execution planning:**

- Which activity types are in v1 for highest signal with lowest noise?
- What default time window/count keeps the block useful in low-activity contexts?
- Should each page allow custom filtering of activity types, or only inherit existing page filters in v1?

---

### Tier 2 — Market Layer *(requires public user profiles)*

A peer-to-peer space for users to list Eurorack modules they want to sell or trade. Because Patcher already knows every
module in the catalogue and every user's collection, creating a listing is near-zero-friction — a user lists directly
from their collection page. The market is the natural extension of "I own this" into "I want to sell this."

A strategic differentiator: the Eurorack used market skews heavily toward **discontinued and vintage modules** (Make
Noise, discontinued Mutable Instruments, early Buchla clones, etc.). These are precisely the modules where price
transparency is hardest to find and most valuable. Patcher's canonical module catalogue already includes these; most
general resale platforms (Reverb, eBay) require users to describe modules in free text with no structured data.

**Scope:**

- Listings linked to the canonical module catalogue (no free-text module names).
- Condition, asking price, currency, and optionally an external listing link (Reverb, eBay, etc.).
- No in-app payment processing in v1; contact/redirect model only.
- Listings expire or are marked sold; collection membership is not automatically updated (seller intent may differ).

**Design decision — buyer-seller contact:** No in-app payment or persistent chat in v1. Preferred model: a one-way "send
inquiry" form that delivers a notification to the seller (no chat thread stored). This keeps Patcher out of the
messaging business while avoiding pure redirect-aggregator status. Sellers may optionally expose an external contact
link (Reverb, email) on their profile as a fallback.

**Cold-start strategy for listings:** The marketplace has a chicken-and-egg problem — no buyers without listings, no
listings without buyers. Seeding strategy: (1) at launch, invite a small cohort of active users to list modules they've
already marked in their collection; (2) the Price Hub's store-link data gives buyers a reference price immediately,
reducing the "is this a fair ask?" friction that kills first-time listings; (3) a user who completes a sale has a strong
reason to update their collection — creating a natural loop back to the solo core.

**Open questions:** Moderation of listings? Geographic filtering? Trade (swap) listings vs sell-only?

---

### Tier 1–2 — Module Price Hub *(read-only in Tier 1; write path requires Tier 1 profiles)*

Patcher aims to be a **reference point for what Eurorack modules cost** — not just today, but over time and across
sources. This serves buyers planning purchases, sellers pricing listings, and the broader community tracking the market.
The canonical store link per module (prerequisite from [Monetization](./PRINCIPLES.md#monetization-future)) should be
built as part of this work, not separately.

Three layers, buildable in order:

1. **Cross-store price display** *(Tier 1)* — Current asking prices across known retailers (e.g. Thomann, Perfect
   Circuit, Sweetwater, Schneidersladen). Read-only, sourced by scraping or retailer APIs, clearly labelled by source.
   Affiliate links here are the primary revenue mechanism.
2. **Price history charts** *(Tier 1 for scraped data)* — Time-series view of a module's price across sources. Shows
   appreciation/depreciation/stability. Particularly valuable for discontinued modules whose secondary market price is
   the only signal. Scraping snapshots can seed this before community reports exist.
3. **Community price reports** *(Tier 2 — requires public profiles)* — Logged-in users submit "I saw this for EUR X
   at [store] on [date]." Attributed to the user's profile as a trust signal per the
   [UGC & Trust Model](./PRINCIPLES.md#user-generated-content--trust-model). Aggregated into price history.

**Cold-start strategy:** Scrape a small set of popular modules first. Display charts even when sparse — 3 data points is
better than none. Completed marketplace transactions feed directly into price history, creating a virtuous loop where
the marketplace generates the data that makes the price hub valuable.

**Strategic rationale:** Discontinued modules have no new-retail price anywhere else at module-level granularity.
Patcher's catalogue includes them. That is a durable competitive moat.

**Open questions:** Scraping legality and ToS compliance per retailer? Refresh frequency? Price hub inline on module
detail page, or separate dedicated page?

---

### Tier 3 — Discovery & Depth *(valuable once community layer is active)*

#### Collection-Aware Patch Discovery

The missing bridge between the collection model and public patches: "show me public patches I could play right now with
what I own." The query is a subset match — patches whose module set is contained in the viewer's collection. This works
because [collections are boolean membership](./PRINCIPLES.md#collections-track-membership-not-quantity), not quantities.
No other tool does this well and Patcher has all the data. Requires a critical mass of public patches (community layer
active) and [Patch Tags / Genre / Technique Labels](#patch-tags--genre--technique-labels) for meaningful filtering.

**Open questions:** How to handle near-matches ("you're missing 1 module")? Filter on patch browser or dedicated
discovery page?

#### Patch Tags / Genre / Technique Labels

Solo organisation value is in [Tier 0](#tier-0--immediate-value-no-external-dependencies-ships-independently). At
community scale, tags become the filtering layer that makes
[Collection-Aware Patch Discovery](#collection-aware-patch-discovery) meaningful — a prerequisite for full discovery
value.

**Open questions:** Free-form tags vs curated taxonomy? Who can add tags — author only, or community?

#### Media Attachment on Patches

Solo embed value is in [Tier 0](#tier-0--immediate-value-no-external-dependencies-ships-independently). At community
scale, audio/video transforms a patch from a wiring diagram into an inspiration and learning resource with genuine
social reach.

**Open questions:** Hosted upload vs embed-only? Moderation of uploaded audio? Attach to patch version or patch as a
whole?

---

### Tier 3 — Catalogue Depth *(independent of community layer, high SEO value)*

#### Manufacturer Pages

Moved to [Tier 0](#tier-0--immediate-value-no-external-dependencies-ships-independently). Buildable now; no community
dependency.

#### Manufacturer Accounts

Role-based auth expansion; manufacturers claim and manage their own modules. Verified accounts can submit **official
MSRP** as a canonical price data point, distinguishing it from community-reported and scraped prices (feeds into the
[Price Hub](#tier-12--module-price-hub-read-only-in-tier-1-write-path-requires-tier-1-profiles) label hierarchy).
Blocked on the [Data Integrity vs User Freedom](./PRINCIPLES.md#data-integrity-vs-user-freedom) philosophy decision.

---

### Tier 3 — Ecosystem & Data Access *(independent, strategic leverage)*

#### Public Data Extractor / Dataset Export

Create a deliberate machine-readable export of **public Patcher data** so the catalogue and other public artifacts can be
used by external tools, research workflows, and AI agents **without scraping the live product ad hoc**. This is not a
general data dump and not a near-term build commitment; it is a long-horizon platform idea that becomes more valuable as
the public catalogue, manufacturer pages, patch metadata, and other structured public surfaces mature.

**Intent:**

- Publish a stable, documented snapshot format instead of forcing third parties to reverse-engineer HTML pages.
- Make public catalogue data reusable for search indexing, assistants, recommendation experiments, and ecosystem tooling.
- Keep the live app as the canonical product while allowing derived, offline, or batched use of public information.

**Boundaries:**

- Public-only: never include private racks, private patches, non-public profiles, or any auth-gated fields.
- Respect authorship and ownership: if future public UGC is included, preserve attribution and allow exclusion where the
  product policy requires it.
- Treat this as an export layer, not permission to bypass product UX, moderation, or future access controls.

**Likely shape when/if it exists:**

1. Canonical snapshot job that reads public entities and emits versioned artifacts.
2. Simple formats first: JSON/JSONL; add Parquet or similar only if scale justifies it.
3. Explicit schema docs, freshness metadata, attribution fields, and a changelog for breaking export changes.
4. Narrow initial scope: module catalogue + manufacturers first; only later consider public patches, tags, or activity.

**Why it matters strategically:**

- Reduces incentive for uncontrolled scraping by giving the ecosystem a cleaner, lower-friction source of truth.
- Strengthens Patcher as infrastructure for the Eurorack knowledge graph, not only as an end-user app.
- Supports future premium/API thinking from [Monetization](./PRINCIPLES.md#monetization-future) without forcing that
  decision now.

**Open questions:** What public license/terms govern reuse? Is the export a bulk snapshot, a query API, or both? Which
public UGC types are safe to include by default? How are attribution, takedown, and abuse/rate controls handled?

---

### Tier 3 — UX Polish *(independent, lower strategic weight)*

#### Patch Graph Enhancements

Color/CSS indicator on already-connected inputs; user-defined node color-coding for complex patch clarity. Design
question: per-user preference or per-patch setting?

**Connection to community:** A patch that is visually clear is more shareable and more useful as a learning resource.
Graph quality directly affects the value of Media Attachment and public patch browsing — unreadable graphs make
community content less useful even when the underlying patch data is correct.

#### User Organization (Tags/Folders)

Grouping patches, racks, and modules into folders or named sets. Note: **Patch Tags (Tier 0) should ship first** — tags
solve 80% of the organisation need with zero new DB structure. Folders are the incremental upgrade for power users who
need hierarchical organisation that tags can't express.

#### PWA Support

Angular PWA schematics, service worker, offline strategy. Marketplace and price-hub browsing are strong mobile use-cases
that raise the priority of this above pure "nice to have" — see [Mobile Strategy](./PRINCIPLES.md#mobile-strategy) for
the architectural decision.

**Open question:** Cache TTL strategy: price data (frequently changing) needs a short TTL; catalogue data (relatively
stable) can be long-lived. These two strategies must be separate.

#### Dark Mode

CSS variable-based theme system. Large design scope; only worth doing once the component library is stable.
