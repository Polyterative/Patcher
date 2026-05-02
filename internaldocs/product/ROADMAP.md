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

**Immediate usefulness:** this page should not be treated as a thin directory stub. Even before manufacturer claims exist,
it can act as a useful public home for the brand:

- official website / contact / support links
- brand description and logo
- module catalogue grouped in a readable, browsable way
- a clear path for users to report module data issues or find help

For smaller manufacturers, this may be the first genuinely structured web presence they have. For larger ones, it is still
valuable as an SEO-friendly and user-context-rich reference layer around their catalogue.

**Upgrades when later layers ship:**

- Manufacturer verification → page becomes an official, editable brand surface
- Manufacturer updates/news → page gains a living "what's new / what changed" section
- Manufacturer analytics → page becomes the top of a private dashboard for the verified brand

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

#### Rack Analysis / Balance Radar

An analysis layer for a rack that goes beyond HP and power totals and estimates functional balance: voices, utilities,
modulation, sequencing/control, mixing/output, and similar roles. The aim is helpful guidance ("voice-heavy", "light on
utilities") rather than a normative score or blocker.

The first pass should lean on existing module tags and rack data, then degrade gracefully when tag coverage is sparse. A
clean visual summary such as a radar/spider chart is desirable, but it must remain readable on mobile and be backed by
plain-language guidance.

**Boundary:** this is advisory, not prescriptive. It should never imply there is one "correct" rack, and it should never
block editing because the system judges a rack as unbalanced.

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

#### Contributor Stats / Contribution Profile

A user-facing contribution layer showing how a person has improved Patcher's shared data — approved module submissions,
comments, module flags, and later price reports. The private dashboard phase can ship before public-profile exposure; the
public subset layers on top once profile privacy is stable.

This should incentivise useful contribution and support the trust-tier direction without turning profiles into social-status
pages. Reuse the shared statistics and recent-activity surfaces where possible. No leaderboards, likes, follows, or streak
mechanics.

**Open questions:** Which metrics are public-safe in v1? Should pending/unapproved submissions remain private? Does public
contributor display require an explicit opt-in beyond profile visibility?

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

#### Application Statistics & Data Insights

A public-facing insight layer that turns Patcher's growing catalogue and community data into interesting, confidence-aware
visual summaries. This should start small on the home page to signal that the system contains rich data, then expand into a
dedicated insights surface once public-content volume is high enough for the aggregates to be genuinely meaningful.

**Shape of the feature:**

1. **Home teaser first** — a small section that shows a few headline numbers or curiosity hooks so visitors immediately feel
   that Patcher is more than a static catalogue.
2. **Dedicated insights surface** — aggregate views across catalogue health, community activity, rack composition,
   contributor activity, and other patterns that help people explore the ecosystem more intelligently.
3. **Deeper curiosity work later** — trend lines, co-occurrence patterns, balance archetypes, rare-module discovery, and
   other more serious data-science-style analysis once the data volume and trust are there.

**Design lean:** follow the spirit of [Rack Analysis / Balance Radar](#rack-analysis--balance-radar) — visually strong,
advisory rather than prescriptive, and paired with plain-language interpretation instead of raw dashboard theater.
The first home pass should stay secondary: a compact teaser card after the core proof sections, not a hero/dashboard takeover.

**Activation gate:** do not expand beyond the teaser until public profiles are live, contributor/public activity surfaces are
stable, and there is enough public volume for the aggregates to be credible.

**Boundaries:**

- aggregate / anonymised / public-safe only
- no user-level behavioral exports or private-entity leakage
- no leaderboards, streaks, or social-status gamification
- show coverage / confidence when the signal is partial; hide low-volume metrics instead of implying false precision
- give every insight a visible methodology hint: sample / coverage / freshness where needed
- avoid drill-downs or overlapping filter combinations that let viewers infer individuals or tiny cohorts
- link interesting findings back to real product surfaces so the insights deepen discovery rather than become dead-end charts

**Current decisions after the first shipped iterations:**

- the dedicated insights surface should stay **fully public** while it remains aggregate-only and privacy-safe; its public
  discoverability is part of the product value
- the smallest reusable vocabulary is still the current **stat-card + interpretation/methodology card** approach; do not add
  a heavier chart dependency until there is sustained signal that genuinely benefits from time-series or distribution views
- the next worthwhile deeper-analysis directions, once volume and trust justify them, are:
  1. **co-occurrence patterns** that help discovery ("often seen together")
  2. **trend lines** only when public activity is dense enough for stable time windows
  3. **balance / archetype summaries** built on trusted tag coverage
  4. **rare-module discovery** later, once rarity can be distinguished from thin public participation

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

Role-based auth expansion; manufacturers claim and manage their brand surface inside Patcher. This is the transition from
"directory entry" to **official manufacturer presence**. Verified accounts can submit **official MSRP** as a canonical
price data point, distinguishing it from community-reported and scraped prices (feeds into the
[Price Hub](#tier-12--module-price-hub-read-only-in-tier-1-write-path-requires-tier-1-profiles) label hierarchy).
Blocked on the [Data Integrity vs User Freedom](./PRINCIPLES.md#data-integrity-vs-user-freedom) philosophy decision.

**Core capabilities once verified:**

- claim and verify the manufacturer page
- edit brand-owned fields such as logo, website, bio, support email/contact links, social links, and official store links
- manage featured modules on the brand page
- submit official announcements / release notes / important updates tied to the manufacturer page
- submit official MSRP and other clearly-labelled manufacturer-owned commercial fields

**Verification matters here because** these controls imply authority. Users need a clear distinction between community data
and official manufacturer-provided information.

**Sequencing note:** do not treat all manufacturer features as one bundle. The intended order is:

1. public manufacturer page quality
2. verification / claim
3. bounded control over official fields
4. prove that the page is worth maintaining
5. add lightweight insight or distribution tooling only after the control layer is stable

This matters because the strategy fails if Patcher jumps to dashboards or APIs before brands trust the public surface.

**Design direction:** this should be useful to two very different manufacturer profiles:

1. **Established brands** that already have a real website and want a structured discovery layer plus better downstream
   module context.
2. **Small brands / boutique builders** that may be happy to pay for a ready-made, credible public presence instead of
   building and maintaining a fuller website stack.

**Operational prerequisites before launch:**

- define objective verification criteria publicly
- define claim dispute handling and revocation path
- define dormancy / re-verification lifecycle
- define bounded manufacturer-controlled fields before edit access exists
- add auditability for manufacturer-edited fields

**Open questions:** What is the minimum acceptable verification flow? Which manufacturer-owned fields bypass review
entirely, and which still need audit logs or moderation? Does one manufacturer map to one verified account, or can teams
and delegated editors exist later?

#### Manufacturer Updates / Release Surface

A verified manufacturer should be able to publish a small amount of **official, high-signal brand communication** directly
on their manufacturer page. This is not a general social feed. The goal is practical product communication:

- newly released modules
- recently updated modules or manuals
- important product notices
- featured modules the brand wants to highlight right now

This creates a reason for the manufacturer page to stay alive after the initial import and gives users a better answer to
"what changed recently with this brand?" than external social posts alone.

**UI direction:** keep this as a compact, structured section on the manufacturer page rather than a full blogging system.
Each entry should be skimmable and strongly tied to modules or brand-level updates.

**Boundary:** no vanity engagement mechanics. No likes, follows, or creator-feed behavior. This is a utility/news layer,
not the main manufacturer wedge.

**Constraint direction:** if this ships, it should launch with hard limits (low posting frequency, short entries, clear
separation from community activity, and a reporting path for spammy use). Without those constraints it turns into a
marketing feed that conflicts with the "not a social network" principle.

**Open questions:** Should updates be time-limited cards, permanent changelog-style entries, or both? Do module updates
reuse the general activity system or live in a manufacturer-owned parallel surface?

#### Manufacturer Analytics

Verified manufacturers need a way to understand how their catalogue is performing inside Patcher without violating user
privacy. The value proposition is not generic "analytics"; it is **audience understanding in the exact context where
people explore, collect, patch, and plan racks**.

Analytics are strategically important, but they are **not** the first thing to build. They only become credible once
manufacturer pages are trusted, verification is stable, and Patcher has enough volume for the aggregates to be meaningful.
Until then, analytics remain a hypothesis rather than a launch requirement.

**High-value early signals:**

- manufacturer page views
- module page views
- outbound clicks to official site / store links
- how many users have at least one of the brand's modules in their collection
- how many public racks include the brand
- how many public patches use the brand
- relative popularity of modules within the brand's own catalogue

**Boundary:** keep this aggregate and anonymised. No user-level ownership exports, no exposure of private racks, and no
"here are the people who own your module" surface.

**Launch caution:** do not ship this in the first manufacturer cohort unless the underlying traffic and privacy model are
already proven. Low-confidence analytics create support burden and false expectations faster than they create value.

**Why it matters strategically:** if Patcher reaches sufficient scale, this becomes one of the clearest manufacturer-paid
features because it helps brands learn about adoption and module usage without requiring Patcher to become an ad platform.

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

#### Manufacturer Source of Truth / Syndication Layer

Long-horizon B2B direction: let verified manufacturers use Patcher as the **structured source of truth** for their module
catalogue, then syndicate that data outward to other destinations. The value is not merely "having a page on Patcher" but
"update official product data once, keep the ecosystem consistent."

**Problem this solves:**

- module specs drift across official sites, retailers, community databases, and old manuals
- panel variants, revision notes, and lifecycle state are often fragmented
- small manufacturers especially may not have strong catalogue tooling of their own

**Possible scope if this ever ships:**

1. Manufacturer-owned canonical fields for module-level records (within the existing integrity boundaries)
2. Data freshness / revision tracking for official module information
3. Structured export or sync to external destinations such as official sites, store platforms, or retailer/distributor
   feeds
4. Clear distinction between manufacturer-owned official data and community/contextual data

**Strategic value:** this is one of the strongest plausible manufacturer-paid offerings because it saves recurring
operational effort rather than selling presence alone. It also connects naturally to support/contact surfaces, lifecycle
communication, and any future manufacturer API/widgets.

**Boundary:** this is not a commitment to become a full ERP, ecommerce backend, or generic CMS. The useful lane is
structured Eurorack catalogue stewardship and syndication, not all business operations.

**Open questions:** Which exact fields are manufacturer-canonical vs community-controlled? Is the first outward path an
embed, an export file, a store integration, or a retailer-ready feed? At what scale does this become worth the increased
uptime/versioning/support burden?

#### Manufacturer API / Embedded Widgets

Beyond the public export layer, there is a separate B2B opportunity: give verified manufacturers structured ways to **use
Patcher as technical infrastructure**.

Possible forms:

1. **Authenticated manufacturer API** for reading/writing manufacturer-owned data such as profile fields, official links,
   MSRP, featured modules, and update entries.
2. **Embeddable widgets** for official sites — module cards, panel galleries, "used in public patches," or "add to rack"
   surfaces.
3. **Lightweight sync workflows** so a small manufacturer can update data once and have both Patcher and their own public
   surface stay consistent.

This is strategically different from the public dataset export:

- the **public export** helps the wider ecosystem reuse public information
- the **manufacturer API** helps brands manage their own official presence and integrate Patcher into their workflow

**Refinement:** this is a future strategic option, not an automatic next step. Pursuing it would move Patcher closer to
being infrastructure with stronger uptime, versioning, and support expectations. That may be worth doing later, but it is
not the same thing as shipping manufacturer pages or verification.

**Practical first step:** if this path is ever tested, start with one narrow distribution primitive — likely a simple
official module card or manufacturer catalogue embed — before designing a broader API surface.

**Why it matters strategically:** this is the clearest path to positioning Patcher as a technical provider rather than only
as a consumer-facing app. It is especially attractive for small manufacturers that lack strong internal web/catalogue
tooling.

**Open questions:** Does the first step ship as widgets or API? Which actions are safe to automate? Is this a paid
manufacturer-plan feature from day one, or a relationship-building tool first?

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
