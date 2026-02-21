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

### Sticky "Current Selection" Panel — Design Analysis

#### Problem Statement

The **"Your selection"** card in the patch editor currently occupies a **fixed, full-height left column** (min/max
`26rem`) at all times — even when the user has made no selection and the panel shows only a placeholder hint. This
permanently steals layout space from the modules grid, forcing modules to wrap or compress regardless of how many cards
the user is working with.

Two things need to happen simultaneously:

1. The panel must be **out of the way** when it is not needed.
2. When a selection *is* active, it must be **impossible to miss** — the user needs to see it while scrolling and
   clicking across many module cards.

#### Design Specialist Analysis

**Current pattern (static column):** Appropriate for productivity dashboards where the side panel is always active (e.g.
Figma's properties panel, VS Code's sidebar). Wrong pattern here because the selection state is *transient* — it exists
only between the first CV click and the "confirm connection" action. Static columns should only be used for persistent
content.

**Recommended pattern: Floating overlay panel (sticky positioned, conditionally rendered)**

A floating panel is the correct paradigm for *contextual ephemeral state*:

- It does not participate in the document flow and therefore takes zero width from the module grid.
- It appears only when there is something to show (a CV is selected), removing the ambient noise of the placeholder.
- It can be anchored to a corner of the editor viewport (bottom-left, or top-left below the connection list) so it is
  always in the user's peripheral vision without covering the modules.
- Angular Material's `cdkOverlay` or a simple `position: fixed` / `position: sticky` approach on a host element
  inside the editor scroll container both work; the simpler CSS-only route is preferred.

**Hierarchy of interaction affordances:**

- *Not selected → no panel at all.* The user's entire screen width is given to the module grid.
- *First CV clicked → panel fades in* with the selected-CV pill (side A). Drawn to a corner, compact height.
- *Second CV clicked → panel expands* with both sides shown plus the Confirm/Cancel buttons.
- *After confirm or cancel → panel fades out.*

The transition should be quick (150–200 ms) and use a fade + slight upward translate so it feels like a toast or
notification, not a layout shift.

#### Product Strategy

The current selection block is one of the few pieces of UI in the editor that *only exists while the user is in a
specific micro-task* (creating a connection). Treating it as a permanent column conflates the editor's two modes:
browsing/inspection and active wiring. Separating them spatially gives users a clearer mental model of when they are "in
wiring mode."

This also unblocks a long-term goal: a wider module grid means users can compare more module panels side-by-side,
reducing the need to scroll during complex patches. Every pixel of recovered horizontal space directly reduces cognitive
load when working on dense patches.

**Trade-off to resolve:** The overlay panel must not cover the very CVs the user is trying to click. Anchoring it to
the **bottom-left** corner of the editor viewport works well for most layouts (module cards are center/right-biased);
alternatively, a **slim top bar** (below the connections list) that expands in place is lower-risk for small screens.

**Accessibility note:** A floating panel that appears/disappears must announce itself to screen readers
(`aria-live="polite"` on the host) and must be reachable by keyboard (focus management on panel appearance).

#### Open Questions

- Fixed corner vs. contextual anchor (snap to clicked CV position)?
- Should the panel be dismissible with `Escape` (resetting the selection)?
- On viewports narrower than ~800 px, should the panel fall back to the current static-column layout to avoid covering
  content?
- Should the panel show a step indicator ("1 of 2 CVs selected") for discoverability with new users?

---

## Feature Status Summary

> Completed features archived in [COMPLETED.md](./COMPLETED.md).

| Feature                              | Status              | Detail                                                                          |
|--------------------------------------|---------------------|---------------------------------------------------------------------------------|
| Sticky floating selection panel      | 🟡 Active           | Design in PRODUCT_NEEDS.md; implementation steps in CURRENT_FEATURE.md          |
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