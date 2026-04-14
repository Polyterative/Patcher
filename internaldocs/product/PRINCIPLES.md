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

**Remaining open question:** Service worker caching strategy for price data (frequently changing) vs catalogue data
(relatively stable). These need different cache TTLs.

---

## Monetization (Future)

Currently free. Potential paths: store affiliate links, manufacturer partnerships/verified listings, premium features
(exports, advanced org), API access.

The module marketplace and price hub open additional paths: **affiliate commissions on store links** (users click
through to buy at an external store) and **promoted listings** for manufacturers or verified dealers.
Price-hub data also gives Patcher a valuable dataset that could power API access as a paid tier.

Store integration is no longer a standalone horizon item — it is the revenue mechanism of the price hub. The canonical
store link per module is the first concrete step; it is scoped as
[Store Links per Module](./ROADMAP.md#store-links-per-module-price-hub-prerequisite) and should be built now, not when
the full Price Hub ships.
