# Product Needs

> **Rules for AI agents using this file:**
> 1. **Strategy only** — this file contains *why* and *what* at product level. No implementation steps, file names,
     schema fields, or test details.
> 2. **Execution detail belongs in [TODO.md](./TODO.md)** — when picking up a feature, open TODO.md, not this file.
> 3. **Keep open questions open** — do not resolve design questions here without explicit user instruction; add them to
     the relevant TODO task when it becomes Active.
> 4. **Update the status table** when a feature moves to done; compress completed strategy notes rather than deleting
     them.

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

## Feature Status Summary

| Feature                              | Status              | Detail                                                                  |
|--------------------------------------|---------------------|-------------------------------------------------------------------------|
| Private patches                      | ✅ Done              |                                                                         |
| User-submitted manufacturers         | ✅ Done              |                                                                         |
| Account data deletion                | ✅ Done              |                                                                         |
| Cable/multiples counter              | ✅ Done              |                                                                         |
| iOS clipboard fix                    | ✅ Done              |                                                                         |
| Rack stats blank filter              | ✅ Done              |                                                                         |
| Blank module education               | ✅ Done              |                                                                         |
| Bug sweep (Feb 19)                   | ✅ Done              |                                                                         |
| Security audit – secrets in repo     | ✅ Done              | Gitleaks clean; .gitignore hardened                                     |
| Multiple module instances in patches | 🔲 Backlog – High   | See TODO.md                                                             |
| Module review flagging               | 🔲 Backlog – Medium | See TODO.md                                                             |
| Account mgmt – password change       | ✅ Done              | See TODO.md                                                             |
| Edit module HP in rack               | 🔲 Backlog – Low    | See TODO.md                                                             |
| Duplicate panel detection            | ✅ Done              | Client-side validation in editor                                        |
| Safari image export                  | ⚠️ Partial          | Download works now; rendering differs from Chrome — needs investigation |
| Manufacturer pages                   | 💡 Long-term        | Backend method exists                                                   |
| Manufacturer accounts                | 💡 Long-term        | Large scope, auth expansion                                             |
| User profile pages                   | 💡 Long-term        | Needs privacy design                                                    |
| Patch graph enhancements             | 💡 Long-term        | Occupied inputs, user-colored nodes                                     |
| User organization (tags/folders)     | 💡 Long-term        | New DB tables                                                           |
| PWA support                          | 💡 Nice-to-have     |                                                                         |
| Store integration                    | 💡 Nice-to-have     | Needs partnerships                                                      |
| Dark mode                            | 💡 Nice-to-have     | Large design scope                                                      |
| Better SQL RLS policies              | 💡 Long-term        | Operational / security                                                  |

---

## Won't Fix

- **Larger "+" icon for adding modules** — Design decision, current size is intentional.