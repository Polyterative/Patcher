# Product Principles

> Product-level decisions and constraints that shape feature direction. No implementation steps here.

---

## Community vs Solo Tool

**Decision reached:** Patcher is a community platform with a solo-use core. The solo experience is the default;
community features layer on top. Moderation overhead is accepted as a necessary cost of the marketplace and price-hub
features. The community direction is now load-bearing for multiple upcoming features — reversing it would deprioritise
the marketplace, the price hub, and collection-aware patch discovery simultaneously.

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

**Future direction for comments:** keep evolving them as a utility layer, not a social one. The highest-value upgrades are
practical ones such as lightweight realtime refresh, a short edit window, comment reporting/moderation tools, and
possibly reply threads only if community volume eventually justifies the added complexity.

---

## Privacy & Sharing Philosophy

Racks have public/private toggle. Patches have opt-in public. User profiles do not yet exist as navigable entities —
users can only see their own.

Privacy is per-entity-type, not a single master switch. **Resolved defaults:** patches and racks are private by default;
sale listings are public by nature. Each entity type requires an explicit "show on my profile" opt-in rather than
auto-surfacing all public content. Profile URLs use username slugs (better for SEO; uniqueness enforced at
registration).

**Open question:** Can a user opt out of appearing in search/directory while still having a public profile URL?

---

## User-Generated Content & Trust Model

Approval workflow for user submissions (modules, manufacturers, panels, price reports). Modules have `isApproved` /
`submitter` tracking; all other UGC entity types should converge on the same trust-tier framework — not be designed in
isolation.

**Trust tier principle:** A user starts unverified. Approved module submissions and accurate price reports raise their
tier. Higher-tier users bypass the review queue. This creates a quality incentive without hard friction for good actors.

**Open questions:** Abuse/spam handling specifics? Contributor notifications on approval/rejection?

---

## Data Integrity vs User Freedom

Where accuracy is enforced globally (module HP, manufacturer names) vs where users get flexibility (rack-specific
overrides, custom labels). The same question applies to manufacturer accounts (verification overhead) and user-submitted
data (quality bar vs friction).

**Directional lean:** Global catalogue data is a shared resource — corruption there harms all users. User-specific
contexts (rack layouts, patch notes) are private sandboxes where flexibility is safe. The principle: *override locally,
correct globally through the UGC review queue*. A user who finds wrong HP corrects it
via [Module Flagging](./ROADMAP.md#module-flagging) (which enters the review queue) and overrides it immediately in
their own rack without waiting for approval.

This lean also governs price data: community-reported prices are user-context data (clearly labelled, attributed) while
MSRP from a verified manufacturer account is catalogue-level data (treated as authoritative). Applying this principle
unblocks rack-local overrides and [Manufacturer Accounts](./ROADMAP.md#manufacturer-accounts) without needing a full
philosophy document first.

---

## Manufacturer Value Before Manufacturer Capture

Manufacturer-facing work should begin by solving **practical brand problems** before asking manufacturers to treat Patcher
as an account they need to maintain. The first value is straightforward:

- a clean public reference page for the brand and its modules
- accurate contact / support / manual / store-link information
- a place to surface official releases, featured modules, and important updates
- qualified traffic from users who are already browsing modules, building racks, or studying patches

This means the manufacturer offer should evolve in layers:

1. **Public utility first** — a manufacturer page is useful even before the brand claims it.
2. **Verified control second** — once claimed, the brand can manage its official surface.
3. **Private tools third** — analytics, APIs, widgets, and workflow integrations only matter after the public surface is
   already valuable.

**Refined strategic thesis:** the first wedge is still public utility, but the durable long-term value is not "presence"
alone. It is that Patcher sits close to real module evaluation workflows — browsing, rack planning, patch study, and
collection tracking. If Patcher becomes trusted enough, it can eventually provide manufacturers with aggregate demand and
usage signal that their own sites usually cannot see. Public presence is the threshold condition; signal is the deeper
strategic prize.

**Positioning decision:** Patcher is not trying to replace a mature manufacturer's whole website or ecommerce stack.
Instead, it should become the structured product layer around Eurorack catalogue data. For larger brands that means an
official discoverability and reference surface; for smaller brands with weak or nonexistent sites it may also function as
their de facto public home on the web.

**Long-horizon extension:** if the manufacturer layer proves real, the strongest expansion path is not "more presence"
features but **product-data stewardship**. Patcher could become the place where a manufacturer keeps its official module
record coherent — specs, manuals, panel variants, official links, MSRP, firmware/lifecycle state — and then syndicates
that record outward to other surfaces. That is a materially stronger value proposition than page customization alone, but
it also pulls Patcher closer to infrastructure and should be treated as a later strategic bet.

**Small-manufacturer-first filter:** prefer features that save time for a one-person or very small brand with weak web or
catalogue infrastructure. Deprioritise manufacturer features that only become useful when a company already has internal
developers, a mature CMS, or a marketing team asking for sophisticated reporting.

**Boundary:** even verified manufacturers should not get unlimited silent write access to every shared catalogue field.
Brand-owned fields (logo, website, support contact, official links, release notes, featured modules, MSRP) can be treated
as authoritative. Shared structural data that affects the whole catalogue should still respect review/audit rules where
appropriate.

---

## Manufacturer Verification & Audience Privacy

Manufacturer verification is not only a trust badge for users; it is the permission boundary for manufacturer-only
capabilities. Verification should unlock surfaces that imply official brand authority: editable manufacturer page content,
official announcements, support contact details, MSRP submission, and private brand analytics.

**Verification principle:** it must be easier than enterprise onboarding but stronger than a normal user profile claim.
Manual approval is acceptable early on; the important part is that "official" visibly means something.

**Verification lifecycle:** verification is an ongoing operational relationship, not a badge granted once forever.
Re-verification, dormancy rules, claim disputes, and revocation paths are part of the product surface whether they are
visible in the UI or not. The strategy should assume that verification creates a permanent support category.

**Analytics boundary:** manufacturer-facing stats should help brands understand adoption without exposing individual users.
Show aggregate and anonymised signals such as page views, collection membership counts, rack inclusion, patch usage,
outbound click-through, or broad regional/device trends if those ever exist. Do **not** reveal personally identifying
ownership data, private rack contents, or user-level behavioral exports to manufacturers.

**Threshold rule:** analytics should not be shown below minimum usefulness/privacy thresholds. If an aggregate is too small
to be meaningful or safe, Patcher should hide it instead of showing false precision.

This distinction matters because the manufacturer dashboard is a product utility layer, not a data brokerage surface.

**Authority clarification:** verification does not grant moderation authority over community comments, user-generated data,
or public criticism. Manufacturer-provided data should be clearly framed as the brand's official input within bounded
fields — not as unlimited power over the entire public representation of the brand on Patcher.

---

## Public Insights & Curiosity Surfaces

Patcher should eventually surface interesting aggregate patterns from its catalogue and public community activity, but the
goal is **useful curiosity**, not vanity analytics. The right feeling is "I learned something real about modules, racks,
patches, or contributor activity" — not "I was ranked."

This creates four rules:

1. **Aggregate-only by default.** Insight surfaces may use public-safe community data and catalogue data, but must not expose
   private entities, person-level behavioral exports, or "who owns what" views. Public insight surfaces should only use
   catalogue data plus explicitly public entities.
2. **Confidence over theater.** If tag coverage, sample size, or public volume is weak, show that clearly or hide the
   insight. Do not render precise-looking charts from weak signal.
3. **Interpretation beats raw dashboards.** Visuals should be paired with plain-language explanation and, where useful, a
   route back to the underlying browse surface.
4. **No gamified status loops.** No leaderboards, streaks, or popularity mechanics. Contributor or community stats can exist
   as trust/context signals without becoming competitive scoring.

This is the same product instinct behind advisory surfaces such as rack balance analysis: visually compelling, grounded in
real data, explicit about uncertainty, and helpful without pretending the system has perfect knowledge.

For this to stay trustworthy, each future insight should carry a small methodology contract: what population it covers, the
relevant sample size / coverage, the time window or freshness, and the rule that suppresses the metric when the cohort is
too small or incomplete. Avoid drill-downs, overlapping filters, or side-by-side slices that let people infer an individual
or tiny cohort by subtraction.

---

## Community Catalogue Sovereignty

The shared module catalogue is a community asset, not a manufacturer-controlled mirror and not a generic advertising
surface. Manufacturers, users, and admins all contribute to its usefulness, but no single party should have silent,
unbounded control over it.

This leads to three practical rules:

1. **Manufacturers may control bounded official fields** such as contact/support links, official store links, brand bio,
   featured modules, and manufacturer-reported MSRP.
2. **Manufacturers may certify or challenge shared data, but not bypass integrity rules** for structural catalogue fields
   that affect everyone.
3. **Community context remains distinct** from manufacturer messaging. Comments, community activity, and public user usage
   should not be rewritten or suppressed by verified brands.

This protects both sides of the strategy: users keep trusting the catalogue, and manufacturers still get an official layer
that is genuinely useful.

---

## Collections Track Membership, Not Quantity

A user's module collection records **whether they own a module** — not how many copies. There is no "I own 3 Maths" in
the collection. The "copies" concept exists only inside patches: the system creates internal instances to track which
physical copy of a module a cable connects to. This distinction matters for UI:

- **Collection = membership only.** Add/remove. No quantity field. No "how many do you own" prompt.
- **Patch instances = internal wiring concept.** The system needs them to distinguish "output from copy 1" vs "output
  from copy 2." But the user doesn't need to see instance counts or labels as raw statistics.
- **User-facing statistics should derive from connections**, not from internal instance bookkeeping. Show cables,
  modules used, multiples (one output driving multiple inputs). Don't show how many instances the system allocated.

This membership model is what makes [Collection-Aware Patch Discovery](./ROADMAP.md#collection-aware-patch-discovery)
possible: the subset query ("patches I can play right now") only works because collection is a clean boolean per module.

**New pressure point:** panel variants and physical finishes create a real user need for user-specific choices. The
current direction should remain: **rack state is authoritative for rack presentation**. A rack may represent a current,
historical, aspirational, or partially owned setup, so ownership data should not silently drive or restrict what the
rack shows. If collection/ownership expands later, it should act as optional metadata or convenience hints — not as the
source of truth for rack configuration.

---

## Mobile Strategy

Currently desktop-optimized. The patch graph is complex; mobile is a significant tension point. However, the new
marketplace and price-hub features are inherently browse-and-lookup interactions — far more mobile-natural than
the patch editor. This creates a clear prioritisation principle:

- **Patch editor:** desktop-first; mobile is a degraded but acceptable experience.
- **Marketplace, price hub, module discovery, profile pages:** mobile-first; these should be designed as if they
  will primarily be used on a phone.

**Decision for mobile architecture:** The two surfaces are different enough that a PWA with distinct responsive layouts
per feature area is the right path — not a separate mobile app, and not a fully responsive single layout. The PWA
question is no longer purely future-looking: marketplace and price-hub launch readiness depends on it. See
[PWA Support](./ROADMAP.md#pwa-support) for the horizon item.

**Tablet clarification:** iPad-class tablets are not just "bigger phones" and should not be treated as touch-capable
desktops either. They are both a near-term demo surface and a realistic browse/build device. The immediate goal is not
"perfect mobile parity" for every editor. It is **confident tablet use without desktop-only interaction traps**.

This yields four near-term rules:

1. **Browse/detail/profile flows should feel tablet-native first.** Dense desktop sidebars, tooltip-only meaning, and
   tab-spawning detours are acceptable only when the value clearly outweighs the friction.
2. **Editing surfaces may remain structurally desktop-biased, but not interaction-hostile.** Hover-only, right-click-only,
   tiny touch targets, and keyboard-hostile forms are not acceptable on iPad just because the screen is large.
3. **Shared primitives matter more than per-screen tweaks.** The highest-value tablet wins come from shared form behavior,
   coordinated floating surfaces, keyboard-aware viewport handling, and touch-friendly action visibility.
4. **Demo readiness beats theoretical completeness.** Fix the interactions most likely to make a live iPad demo feel broken
   or awkward before pursuing broad responsive polish everywhere.

**Remaining open question:** Service worker caching strategy for price data (frequently changing) vs catalogue data
(relatively stable). These need different cache TTLs.

---

## Monetization (Future)

Currently free. Potential paths: store affiliate links, manufacturer partnerships/verified listings, premium features
(exports, advanced org), API access.

The module marketplace and price hub open additional paths: **affiliate commissions on store links** (users click
through to buy at an external store) and **promoted listings** for manufacturers or verified dealers.
Price-hub data also gives Patcher a valuable dataset that could power API access as a paid tier.

There is also a distinct manufacturer-facing monetisation path: **verified manufacturer plans**. These would not paywall
the public catalogue itself; they would fund higher-value brand tooling layered on top of it — managed manufacturer pages,
official updates/news surfaces, support/contact controls, analytics dashboards, embeddable widgets, and authenticated API
access for brands that want Patcher to act as lightweight catalogue infrastructure.

This creates a clean split:

- **Public catalogue value remains open** so users and search engines can discover modules freely.
- **Manufacturer workflow and insight tooling can be paid** when it saves time or replaces missing web/catalogue
  infrastructure for the brand.

**Monetisation caution:** do not let manufacturer revenue become the reason user trust erodes. Paid manufacturer tooling
must sell control, convenience, and bounded insight — not influence over rankings, moderation, or access to user-level
data. Patcher should only lean on manufacturer revenue once the user-facing product is strong enough that manufacturers
need access to the surface more than the surface needs their money.

Store integration is no longer a standalone horizon item — it is the revenue mechanism of the price hub. The canonical
store link per module is the first concrete step; it is scoped as
[Store Links per Module](./ROADMAP.md#store-links-per-module-price-hub-prerequisite) and should be built now, not when
the full Price Hub ships.
