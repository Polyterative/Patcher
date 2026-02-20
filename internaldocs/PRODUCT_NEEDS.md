# Product Needs

> **Rules for AI agents using this file:**
> 1. **Strategy only** — this file contains *why* and *what* at product level. No implementation steps, file names,
     schema fields, or test details.
> 2. **Execution detail belongs in [TODO.md](./TODO.md)** — when picking up a feature, open TODO.md, not this file.
> 3. **Keep open questions open** — do not resolve design questions here without explicit user instruction; add them to
     the relevant TODO task when it becomes Active.
> 4. **When a feature is done** — move it to [COMPLETED.md](./COMPLETED.md) and remove from the status table below.

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
  modules
  used, multiples (one output driving multiple inputs). Don't show how many instances the system allocated.

---

### Community vs Solo Tool

Platform currently works solo. Features are trending community (submissions, sharing, flagging). Social features add
moderation overhead.

**Key question:** Is this a tool or a social platform? Answer drives user profiles, comments, follows, flagging systems.

---

### Monetization (Future)

Currently free. Potential paths: store affiliate links, manufacturer partnerships/verified listings, premium features (
private patches, exports, advanced org), API access.

**Impact:** Directly affects priority of store integration, manufacturer accounts, PWA, and data export features.

---

### Multi-Instance UX Gaps

The module-instances feature (code complete) introduced the ability to use the same module multiple times in a patch.
Three user-facing gaps remain:

1. **Ambiguous wiring from collection cards** — When a module has active instances, clicking its CVs from the collection
   list creates connections with no instance association. This silently produces ambiguous data that renders as a "
   mystery
   node" in the graph. Users have no guard rail steering them to the instance cards instead.

2. **~~Statistics count module types, not slots~~** — ✅ Resolved (Feb 2026). Statistics now show only Cables, Modules,
   and Multiples — all derived from connections. The raw "Module copies" counter (which leaked internal instance counts)
   has been removed. The Module Copies summary card now derives from connections (modules with 2+ distinct connected
   copies) rather than internal instance bookkeeping.

3. **~~No unsaved-changes warning on navigation~~** — ✅ Resolved by auto-save (Feb 2026). Patch editing now persists
   all changes immediately (name, description, connections), matching rack behavior. No manual save needed.

**Open question:** For gap #1, should the system prompt users to pick an instance, or should it prevent wiring from the
collection card entirely when instances exist? Trade-off between flexibility and guardrails.

---

## Feature Status Summary

> Completed features archived in [COMPLETED.md](./COMPLETED.md).

| Feature                              | Status              | Detail                                                                          |
|--------------------------------------|---------------------|---------------------------------------------------------------------------------|
| Multiple module instances in patches | 🟡 In progress      | Core done; 1 UX gap remains (ambiguous wiring); stats rework resolved           |
| Instance UX: ambiguous wiring guard  | 🔲 Backlog – High   | Collection-card CVs create unassociated connections                             |
| Instance UX: stats accuracy          | ✅ Done              | Stats show Cables/Modules/Multiples only; Module Copies card connection-derived |
| Module review flagging               | 🔲 Backlog – Medium | See TODO.md                                                                     |
| Edit module HP in rack               | 🔲 Backlog – Low    | See TODO.md                                                                     |
| Safari image export                  | ⚠️ Partial          | Download works; rendering differs from Chrome — needs investigation             |
| Manufacturer pages                   | 💡 Long-term        | Backend method exists                                                           |
| Manufacturer accounts                | 💡 Long-term        | Large scope, auth expansion                                                     |
| User profile pages                   | 💡 Long-term        | Needs privacy design                                                            |
| Patch graph enhancements             | 💡 Long-term        | Occupied inputs, user-colored nodes                                             |
| User organization (tags/folders)     | 💡 Long-term        | New DB tables                                                                   |
| PWA support                          | 💡 Nice-to-have     |                                                                                 |
| Store integration                    | 💡 Nice-to-have     | Needs partnerships                                                              |
| Dark mode                            | 💡 Nice-to-have     | Large design scope                                                              |
| Better SQL RLS policies              | 💡 Long-term        | Operational / security                                                          |

---

## Won't Fix

- **Larger "+" icon for adding modules** — Design decision, current size is intentional.