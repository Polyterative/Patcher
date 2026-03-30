# Product Needs

> **Rules for AI agents using this file:**
> 1. **Strategy only** — this file contains *why* and *what* at product level. No implementation steps, file names,
     schema fields, or test details.
> 2. **Execution detail belongs in [TODO.md](./TODO.md)** — when picking up a feature, open TODO.md, not this file.
> 3. **Keep open questions open** — do not resolve design questions here without explicit user instruction; add them to
     the relevant TODO task when it becomes Active.
> 4. **When a feature is done** — move it to [COMPLETED.md](./COMPLETED.md) and remove from this file entirely.

**For execution detail, implementation steps, and task tracking → see [TODO.md](./TODO.md).**

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

## Product Strategy

### Community vs Solo Tool

**Decision reached:** Patcher is a community platform with a solo-use core. The solo experience is the default;
community
features layer on top. Moderation overhead is accepted as a necessary cost of the marketplace and price-hub features.
The community direction is now load-bearing for multiple upcoming features — reversing it would deprioritise the
marketplace, the price hub, and collection-aware patch discovery simultaneously.

The solo core must never regress. Users who never make anything public should still get full value from the tool.

**Hard boundary:** Patcher is not becoming a social network. No follows, no friend graphs, no likes.
The community layer exists to make the tool more useful — not to create engagement loops. Features that require a social
graph are out of scope indefinitely.

**Comments are in scope — on content, not on people.** Comments on patches, racks, and modules already exist and are a
live feature. They add direct utility: questions about a patch, corrections to module data, feedback on a rack layout.
When Public Profiles ship, existing comments become attributable — every comment retroactively gains a linked author
identity without any migration work. Comments on *user profile pages* are explicitly deferred — a profile is an
identity, not a content item, and comment threads on identities are the fastest path to a moderation burden that isn't
worth it at this stage.

---

### Privacy & Sharing Philosophy

Racks have public/private toggle. Patches have opt-in public. User profiles do not yet exist as navigable entities —
users can only see their own.

Privacy is per-entity-type, not a single master switch. **Resolved defaults:** patches and racks are private by default;
sale listings are public by nature. Each entity type requires an explicit "show on my profile" opt-in rather than
auto-surfacing all public content. Profile URLs use username slugs (better for SEO; uniqueness enforced at
registration).

**Open question:** Can a user opt out of appearing in search/directory while still having a public profile URL?

---

### User-Generated Content & Trust Model

Approval workflow for user submissions (modules, manufacturers, panels, price reports). Modules have `isApproved` /
`submitter` tracking; all other UGC entity types should converge on the same trust-tier framework — not be designed in
isolation.

**Trust tier principle:** A user starts unverified. Approved module submissions and accurate price reports raise their
tier. Higher-tier users bypass the review queue. This creates a quality incentive without hard friction for good actors.

**Open questions:** Abuse/spam handling specifics? Contributor notifications on approval/rejection?

---

### Data Integrity vs User Freedom

Where accuracy is enforced globally (module HP, manufacturer names) vs where users get flexibility (rack-specific
overrides, custom labels). The same question applies to manufacturer accounts (verification overhead) and user-submitted
data (quality bar vs friction).

**Directional lean:** Global catalogue data is a shared resource — corruption there harms all users. User-specific
contexts (rack layouts, patch notes) are private sandboxes where flexibility is safe. The principle: *override locally,
correct globally through the UGC review queue*. A user who finds wrong HP corrects it
via [Module Flagging](#module-flagging) (which enters the review queue) and overrides it immediately in their own rack
without waiting for approval.

This lean also governs price data: community-reported prices are user-context data (clearly labelled, attributed) while
MSRP from a verified manufacturer account is catalogue-level data (treated as authoritative). Applying this principle
unblocks [Edit Module HP in Rack](#edit-module-hp-in-rack) and [Manufacturer Accounts](#manufacturer-accounts) without
needing a full philosophy document first.

---

### Collections Track Membership, Not Quantity

A user's module collection records **whether they own a module** — not how many copies. There is no "I own 3 Maths" in
the collection. The "copies" concept exists only inside patches: the system creates internal instances to track which
physical copy of a module a cable connects to. This distinction matters for UI:

- **Collection = membership only.** Add/remove. No quantity field. No "how many do you own" prompt.
- **Patch instances = internal wiring concept.** The system needs them to distinguish "output from copy 1" vs "output
  from copy 2." But the user doesn't need to see instance counts or labels as raw statistics.
- **User-facing statistics should derive from connections**, not from internal instance bookkeeping. Show cables,
  modules used, multiples (one output driving multiple inputs). Don't show how many instances the system allocated.

This membership model is what makes [Collection-Aware Patch Discovery](#collection-aware-patch-discovery) possible: the
subset query ("patches I can play right now") only works because collection is a clean boolean per module.

---

### Mobile Strategy

Currently desktop-optimized. The patch graph is complex; mobile is a significant tension point. However, the new
marketplace and price-hub features are inherently browse-and-lookup interactions — far more mobile-natural than
the patch editor. This creates a clear prioritisation principle:

- **Patch editor:** desktop-first; mobile is a degraded but acceptable experience.
- **Marketplace, price hub, module discovery, profile pages:** mobile-first; these should be designed as if they
  will primarily be used on a phone.

**Decision for mobile architecture:** The two surfaces are different enough that a PWA with distinct responsive layouts
per feature area is the right path — not a separate mobile app, and not a fully responsive single layout. The PWA
question is no longer purely future-looking: marketplace and price-hub launch readiness depends on it. Implementation
detail is in [PWA Support](#pwa-support) under Tier 3.

**Remaining open question:** Service worker caching strategy for price data (frequently changing) vs catalogue data (
relatively stable). These need different cache TTLs.

---

### Monetization (Future)

Currently free. Potential paths: store affiliate links, manufacturer partnerships/verified listings, premium features
(exports, advanced org), API access.

The module marketplace and price hub open additional paths: **affiliate commissions on store links** (users click
through to buy at an external store) and **promoted listings** for manufacturers or verified dealers.
Price-hub data also gives Patcher a valuable dataset that could power API access as a paid tier.

Store integration is no longer a standalone horizon item — it is the revenue mechanism of the price hub. The canonical
store link per module is the first concrete step; it is scoped as
a [Tier 0 item](#store-links-per-module-price-hub-prerequisite) and should be built now, not when the full Price Hub
ships.

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
user's trust tier, creating a quality incentive. Already scoped in [TODO.md](./TODO.md).

#### Edit Module HP in Rack

Rack-specific HP override without touching global module data. Pure solo fix — correcting a wrong HP currently requires
removing and re-adding the module. **Upgrades when:** Data Integrity philosophy is resolved → the same override pattern
extends to other rack-local corrections. Already scoped in [TODO.md](./TODO.md).

### Tier 1 — Community Foundation *(must ship before Tier 2)*

#### Public User Profiles

Public activity pages showing a user's public racks, patches, sale listings, and price contributions. Currently users
can only see their own profile — there is no way to navigate to another user's page.

This is the **single blocking dependency** for the module marketplace and community price reporting. Without it:

- Buyers cannot see who is selling or establish any trust in a seller.
- Price report contributions have no social attribution, making spam trivially easy.
- Collection-aware patch discovery has no social dimension.

Privacy defaults and URL scheme are resolved in [Privacy & Sharing Philosophy](#privacy--sharing-philosophy) above.
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
  in the current context.
- The surface should be **fully data-driven**: each entry is rendered from a standard activity shape (actor, action,
  target, time, optional context) so new activity types can be added without redesigning the UI each time.
- Comments are the reference pattern: attributable, contextual, and naturally reusable across modules, racks, patches,
  and future entities.
- Keep the activity layer utility-focused (recent edits, comments, listings/prices updates) rather than
  engagement-driven.
  No social-feed mechanics.

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
The canonical store link per module (prerequisite from [Monetization](#monetization-future)) should be built as part of
this work, not separately.

Three layers, buildable in order:

1. **Cross-store price display** *(Tier 1)* — Current asking prices across known retailers (e.g. Thomann, Perfect
   Circuit, Sweetwater, Schneidersladen). Read-only, sourced by scraping or retailer APIs, clearly labelled by source.
   Affiliate links here are the primary revenue mechanism.

2. **Price history charts** *(Tier 1 for scraped data)* — Time-series view of a module's price across sources. Shows
   appreciation/depreciation/stability. Particularly valuable for discontinued modules whose secondary market price is
   the only signal. Scraping snapshots can seed this before community reports exist.

3. **Community price reports** *(Tier 2 — requires public profiles)* — Logged-in users submit "I saw this for €X
   at [store] on [date]." Attributed to the user's profile as a trust signal per
   the [UGC & Trust Model](#user-generated-content--trust-model). Aggregated into price history.

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
because [collections are boolean membership](#collections-track-membership-not-quantity), not quantities. No other tool
does this well and Patcher has all the data. Requires a critical mass of public patches (community layer active)
and [Patch Tags](#patch-tags--genre--technique-labels) for meaningful filtering.

**Open questions:** How to handle near-matches ("you're missing 1 module")? Filter on patch browser or dedicated
discovery page?

#### Patch Tags / Genre / Technique Labels

Solo organisation value is in [Tier 0](#tier-0--immediate-value-no-external-dependencies-ships-independently). At
community scale, tags become the filtering layer that
makes [Collection-Aware Patch Discovery](#collection-aware-patch-discovery) meaningful — a prerequisite for full
discovery value.

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

→ Moved to [Tier 0](#tier-0--immediate-value-no-external-dependencies-ships-independently). Buildable now; no community
dependency.

#### Manufacturer Accounts

Role-based auth expansion; manufacturers claim and manage their own modules. Verified accounts can submit **official
MSRP** as a canonical price data point, distinguishing it from community-reported and scraped prices (feeds into
the [Price Hub](#tier-12--module-price-hub-read-only-in-tier-1-write-path-requires-tier-1-profiles) label hierarchy).
Blocked on the [Data Integrity vs User Freedom](#data-integrity-vs-user-freedom) philosophy decision.

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
that raise the priority of this above pure "nice to have" — see [Mobile Strategy](#mobile-strategy) for the
architectural decision.

**Open question:** Cache TTL strategy: price data (frequently changing) needs a short TTL; catalogue data (relatively
stable) can be long-lived. These two strategies must be separate.

#### Dark Mode
CSS variable-based theme system. Large design scope; only worth doing once the component library is stable.
