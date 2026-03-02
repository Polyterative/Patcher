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

## Product Strategy

### User-Generated Content Model

Approval workflow for user submissions (modules, manufacturers, panels). Modules have `isApproved` / `submitter`
tracking; manufacturers do not yet follow the same pattern. Goal: consistent UGC trust model across all entity types.

**Open questions:** Trust tiers (approved users bypass review)? Abuse/spam handling? Contributor notifications on
approval/rejection?

---

### Privacy & Sharing Philosophy

Racks have public/private toggle. Patches now also have privacy (opt-in public). User profiles do not exist yet.

**Decision needed:** Default visibility per entity type. Patches feel more personal than racks (creativity vs hardware
inventory). User profiles require privacy controls before launch.

---

### Mobile Strategy

Currently desktop-optimized. The patch graph is complex; mobile is a tension point.

**Options:** (1) PWA with simplified mobile views, (2) responsive degraded experience, (3) separate mobile app. Decision
drives PWA priority and UI refactoring scope.

---

### Data Integrity vs User Freedom

Where accuracy is enforced globally (module HP, manufacturer names) vs where users get flexibility (rack-specific
overrides, custom labels). The same question applies to manufacturer accounts (verification overhead) and user-submitted
data (quality bar vs friction).

**Philosophy needed** before building edit-HP, manufacturer accounts, or bulk data tools.

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

---

### Community vs Solo Tool

Platform currently works solo. Features are trending community (submissions, sharing, flagging). Social features add
moderation overhead.

**Key question:** Is this a tool or a social platform? Answer drives user profiles, comments, follows, flagging systems.

---

### Monetization (Future)

Currently free. Potential paths: store affiliate links, manufacturer partnerships/verified listings, premium features (
exports, advanced org), API access.

**Impact:** Directly affects priority of store integration, manufacturer accounts, PWA, and data export features.

---

### Multi-Instance UX Gaps

The module-instances feature introduced the ability to use the same module multiple times in a patch. One user-facing
gap remains:

1. **Ambiguous wiring from collection cards** — When a module has active instances, clicking its CVs from the collection
   list creates connections with no instance association. This silently produces ambiguous data that renders as a
   "mystery node" in the graph. Users have no guard rail steering them to the instance cards instead.

**Open question:** Should the system prompt users to pick an instance, or prevent wiring from the collection card
entirely when instances exist? Trade-off between flexibility and guardrails.

---

## Horizon Features

> These are directional ideas, not committed backlog. Each needs a design decision before scoping.

### Manufacturer Pages

Dedicated page per manufacturer. Backend query method already exists. SEO opportunity. Needs UI design and a decision on
whether manufacturer accounts (see below) gate edit access.

### Manufacturer Accounts

Role-based auth expansion; manufacturers claim and manage their own modules. Large scope with trust/verification
implications. Blocked on Data Integrity philosophy decision above.

### User Profile Pages

Public activity pages showing a user's racks, patches, and contributions. Requires privacy controls and a clear answer
to the Community vs Solo Tool question above.

### Media Attachment on Patches
The platform documents *what* is connected but nothing about *what it sounds like*. Attaching audio (upload or embed) and video (YouTube/SoundCloud link) to a patch would transform it from a wiring diagram into an inspiration and learning resource — the natural way a modular musician shares their work.

**Open questions:** Hosted upload vs embed-only? Moderation of uploaded audio? Does media attach to a patch version or the patch as a whole?

### Collection-Aware Patch Discovery
Users have collections (modules they own) and there are public patches. The missing bridge: "show me public patches I could play right now with what I own." The query is a subset match — patches whose module set is contained in the viewer's collection. No other tool does this well and Patcher has all the data to make it work.

**Open questions:** How to handle near-matches ("you're missing 1 module")? Should this be a filter on the patch browser or a dedicated discovery page?

### Patch Tags / Genre / Technique Labels
Patches have a name and description but no structured metadata for discovery. Users can't find "slow evolving ambient," "euclidean rhythms," or "West Coast FM" patches. Tags (user-applied) or a controlled vocabulary of technique/genre labels would make public content actually browseable.

**Open questions:** Free-form tags vs curated taxonomy? Who can add tags — author only, or community? Does this feed into collection-aware discovery (e.g. "ambient patches I can play")?

### Patch Graph Enhancements

Color/CSS indicator on already-connected inputs; user-defined node color-coding for complex patch clarity. Design
question: per-user preference or per-patch setting?

### User Organization (Tags/Folders)

Group modules, patches, racks into collections or folders. Needs new DB tables and filtering UI. Depends on clarity of
the Community vs Solo Tool direction.

### PWA Support

Angular PWA schematics, service worker, offline strategy. Priority depends on Mobile Strategy decision above.

### Store Integration

Buy links to retailers. Needs business partnerships before any engineering investment.

### Dark Mode

CSS variable-based theme system. Large design scope; only worth doing once the component library is stable.