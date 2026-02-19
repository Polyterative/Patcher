# Product Needs

**For AI Agents:** This document tracks product features and technical debt. Each item includes business context,
technical requirements, and current status. Use this to understand both WHAT to build and WHY it matters.

---

## Product Strategy Considerations

### User-Generated Content Model

**Pattern:** Approval workflow for user submissions (modules, manufacturers, panels)  
**Current:** Modules have `isApproved`, `submitter` tracking. Manufacturers do NOT.  
**Strategy:** Consistent UGC pattern across all entity types - encourages community contribution while maintaining
quality.  
**Open Questions:**

- Should approved users bypass approval? (trust system)
- How to handle abuse/spam flags?
- Notification system for contributors when approved/rejected?

### Privacy & Sharing Philosophy

**Current State:** Racks have public/private toggle. Patches do NOT. User profiles do NOT exist.  
**Strategy Decision Needed:** What should be public by default? What requires opt-in?  
**Considerations:**

- Patches more personal than racks (creativity vs hardware inventory)
- User profiles enable community but require privacy controls
- Balance discoverability with user comfort

### Mobile-First vs Desktop-First

**Current:** Desktop-optimized interface  
**Tension:** Patch graph complex for mobile, but users want on-the-go access  
**Strategy Options:**

1. PWA for mobile-specific UX (simpler views)
2. Responsive design with degraded mobile experience
3. Mobile app with different feature set

**Decision:** Impacts PWA priority, UI refactoring scope

### Data Integrity vs User Freedom

**Examples:**

- Edit Module HP: Global change affects all users vs rack-specific flexibility
- Manufacturer accounts: Trust vs verification overhead
- User-submitted data: Quality bar vs contribution friction

**Philosophy Needed:** Where do we prioritize accuracy vs enabling user customization?

### Community Building vs Solo Usage

**Current:** Platform usable solo, but features trending toward community (user submissions, sharing)  
**Tension:** Social features add complexity and moderation needs  
**Questions:**

- Should we encourage user interaction? (comments, follows, likes?)
- Is this a tool or a social platform?
- How much moderation capacity do we have?

**Impact:** User profiles, manufacturer accounts, flagging systems all assume community engagement

### Monetization Considerations (Future)

**Current:** Free platform  
**Potential Paths:**

- Store integration (affiliate revenue)
- Manufacturer partnerships (listings, verified accounts)
- Premium features (private patches, advanced organization, exports)
- API access for third parties

**Impact:** Feature prioritization (store integration, manufacturer accounts, PWA, data export)

---

## Recently Completed

### ✅ Autonomous Bug Fix Sweep (Feb 19, 2026)

**Scan findings & fixes:**

- **Double backend call in `savePhysical$`** — `switchMap(() => this.backend.update.module({id}))` was chained after the real update, overwriting physical data with a stub `{id}`-only call. Removed the duplicate.
- **`savePhysical$`/`savePower$`/`saveInsOuts$`/`savePanels$` raw snackBar calls** — All replaced with `SharedConstants.errorCustom` / `SharedConstants.successCustom` to match project conventions.
- **`reload()` method subscribed outside constructor** — Removed the method; now calls `updateSingleModuleData$.next(this.data.id)` directly (same effect, correct pattern).
- **Unused `URLReg` variable** — Dead code in `module-editor.component.ts`, removed.
- **Duplicate comment block** — `// Subscription to save panels` was repeated twice, cleaned up.
- **`style="margin: 10rem"` on `app-module-composite`** — Layout-breaking inline style removed from `module-browser-detail.component.html`.
- **Wrong tooltip on New Groove link** — Tooltip said "Search on Milk Audio Store" (copy-paste error), corrected to "Search on New Groove".
- **`readonly` on `@Input()` properties** — `ModuleRacksComponent`, `ModulePatchesComponent`, and `ModuleListComponent` all declared `@Input() readonly data$` (and `viewConfig`/other inputs), causing TS2540 compile errors. Removed `readonly` from all affected `@Input` declarations.
- **Deprecated `fxLayout`/`fxLayoutAlign`/`fxFlex` directives** — Replaced with modern `rowwrap gap1` / `col gap1` CSS classes in `module-details.component.html` and `module-browser-detail.component.html`.
- **Deprecated `fxHide`/`fxShow` on `mat-divider`** — Removed from `module-editor-cv-form-line.component.html`.
- **Markdown asterisks in Angular template string** — `'Others by *manufacturer*'` doesn't render as bold; changed to plain string.
- **Unused `$index` variable** in `module-details` panel `@for` loop — Removed.
- **Commented-out dead code** in `module-details.component.html` (old chip-list block) — Removed.

**Files modified:**
- `module-editor.component.ts`
- `module-browser-detail.component.html`
- `module-browser-detail.component.ts`
- `module-details.component.html`
- `module-editor-cv-form-line.component.html`
- `module-racks.component.ts`
- `module-patches.component.ts`
- `module-list.component.ts`

---

### ✅ Private Patches (Feb 18, 2026)

**What was done:**

- Added `public` field to patches table schema (database.types.ts)
- Extended PatchMinimal interface with Privatable (patch.ts)
- Added privacy state management to patch service (isCurrentPatchPrivate$, requestPatchPrivacyStatusChange$)
- Added privacy toggle button to patch UI (lock/public icon)
- Added privacy tooltip when patch is private
- New patches default to public

**Pattern followed:** Same as racks (Privatable interface, toggle button, tooltip)

**Files modified:**

- `database.types.ts` - Added public field to patches table
- `patch.ts` - Extended Privatable interface
- `patch-detail-data.service.ts` - Privacy state + toggle handler
- `patch-minimal.component.html` - Privacy toggle button
- `patch-details.component.html` - Privacy tooltip
- `supabase.service.ts` - Default public: true on patch creation

**Tests updated/created:**

- `integration-user-patches.spec.ts` - Integration tests for patch privacy (create, retrieve, update)
- `patch-detail-data-service-privacy.spec.ts` - API surface tests (privacy observables exist and initialize correctly)
- `crud-operations.spec.ts` - Updated to expect public: true field on patch creation
- All tests passing ✅

---

### ✅ Blank Module Education (Feb 18, 2026)

**What was done:**

- Added FAQ entry explaining how to use blank modules for gaps and spacing
- Added tooltip in rack editor when editable: "Need gaps in your rack? Right-click any module and select 'Replace with
  blank'"
- Enhanced context menu label from "Replace with blank" to "Replace with blank (add spacing)" with space_bar icon
- Users now have multiple discovery paths for this existing feature

**Files modified:**

- `app-faq.component.ts` - New FAQ entry
- `rack-editor.component.html` - Tooltip added
- `rack-editor.component.ts` - Context menu label enhanced

---

## Planned - High Priority

### User-Submitted Manufacturers

**Why:** Users are blocked from submitting modules if manufacturer doesn't exist. Must contact admin via
Discord/email.  
**Current State:** Module submission only allows selecting from existing manufacturers (autocomplete dropdown)  
**Goal:** Let users create manufacturers during module submission with approval workflow (same pattern as user-submitted
modules)

**Design Considerations:**

- **Duplicate Prevention:** How to handle similar names? (e.g., "Mutable Instruments" vs "Mutable")
- **Data Quality:** What's required vs optional for new manufacturer? (just name? website? logo?)
- **Discovery:** Should pending manufacturers be visible to other users while awaiting approval?
- **Ownership:** Can submitter edit their pending manufacturer before approval?

**Technical Needs:**

- **Database:** `manufacturers` table needs approval tracking (`submitter`, `isApproved`, `created`, `updated` fields)
- **Backend:** Manufacturer CRUD operations, cache busting, user manufacturer queries
- **UI:** "Create new manufacturer" option in module submission, autocomplete search to prevent duplicates, approval
  status indicators
- **Areas:** Database schema, Supabase service, module submission flow, manufacturer selector component

**Nice to Have:** Bulk manufacturer submission (list input)

**Related:** User-Generated Content Model strategy

---

### Multiple Module Instances in Patches

**Why:** Users cannot model patches with multiple copies of same module (common in real setups)  
**Current State:** Patch connections link module IDs directly - one instance per module only  
**Blocker:** Database schema assumes one module = one node in patch graph

**Design Considerations:**

- **Identity:** How do users distinguish instances? Auto-numbering vs user naming?
- **Connections:** Can users copy connections from one instance to another?
- **Visualization:** How to keep graph readable with multiple instances? Grouping? Spacing?
- **Workflow:** Add multiple at once or duplicate existing instances?
- **Persistence:** Instance names/positions part of patch data or user preferences?

**Technical Needs:**

- **Database:** Patch connections need instance support (add instance IDs OR new instance tracking table)
- **Backend:** Connection queries must handle instances, patch data must include instance info
- **UI:** Patch graph must display/distinguish multiple instances ("Maths (1)", "Maths (2)"), allow naming/managing
  instances
- **Decision Needed:** Instance tracking approach (extend patch_connections vs new table)
- **Areas:** Database schema, patch connection model, patch graph visualization, patch editor

**Related:** Mobile-First strategy (graph complexity on small screens)

---

## Planned - Medium Priority

### Module Review Flagging

**Why:** Users cannot report incorrect module data. No feedback mechanism for data quality issues.  
**Goal:** Users can flag modules for admin review

**Design Considerations:**

- **Categories:** Predefined issue types (wrong specs, missing image, duplicate) vs free text?
- **Visibility:** Show flag count to users? Risk of pile-on vs transparency?
- **Resolution:** Notify flaggers when issue resolved? Close flags automatically when module edited?
- **Abuse Prevention:** Rate limiting? Reputation system?
- **Admin Workflow:** Triage vs detailed review? Bulk actions?

**Technical Needs:**

- **Database:** New `module_flags` table for tracking reports
- **Backend:** Flag CRUD operations, admin query endpoints
- **UI:** "Report issue" button on module detail, admin review interface
- **Areas:** Database schema, Supabase service, module detail page, new admin area

**Related:** User-Generated Content Model (trust systems, notifications)

---


### Account Management (GDPR)

**Why:** Users cannot change password or delete account - GDPR compliance issue  
**Current State:** No user settings page exists  
**Goal:** Standard account management features

**Design Considerations:**

- **Data Export:** GDPR requires data portability - export patches/racks/collections?
- **Account Deletion:** Hard delete vs anonymization? Impact on public patches/racks?
- **Retention:** What happens to user-contributed modules/manufacturers after deletion?
- **Confirmation:** Email verification for sensitive operations? Cooldown period for deletion?
- **Migration Path:** Password-based vs OAuth users - different flows?

**Technical Needs:**

- **Backend:** Supabase auth operations (password change, account deletion with cascade)
- **UI:** New settings page with password form, delete confirmation
- **Areas:** Supabase service auth methods, new settings route/component

**Related:** Privacy & Sharing Philosophy (what stays public after deletion?)

---

## Planned - Low Priority

### Edit Module HP in Rack

**Why:** Users must remove and re-add modules to change HP  
**Decision Needed:** Global edit (affects all users) vs rack-specific override (requires DB schema change)

**Design Considerations:**

- **Scope Impact:** Global edits benefit everyone but require admin-level trust. Rack-specific keeps data clean but adds
  complexity.
- **Use Cases:** Correcting errors (global) vs custom panels/variations (rack-specific)
- **Permissions:** Who can globally edit? Only submitter? Admins? Manufacturers?
- **Validation:** Prevent invalid HP values, ensure rack layout still valid after change
- **History:** Track HP changes for audit/rollback?

**Technical Needs:**

- **UI:** Inline editing with validation and layout reflow
- **Backend:** Module update operation (if global) OR new rack-module override schema (if rack-specific)
- **Areas:** Rack editor, module model (potentially)

**Related:** Data Integrity vs User Freedom (core philosophy question)

---

## Ideas (Not Prioritized)

### ✅ Cable/Multiples Counter (Feb 19, 2026)

**What was done:**

- Added `PatchConnectionStatsPipe` (`patch-connection-stats.pipe.ts`) that derives three statistics from a
  `PatchConnection[]`:
  - **Cables** — total number of connections in the patch
  - **Modules** — count of unique modules referenced across all connections
  - **Multiples** — count of output CVs that drive more than one input (i.e. signals split via multiples)
- Integrated `app-statistics` panel into `patch-composite.component.html` — it appears above the connections list for
  any patch that has connections, only in view mode (not while editing)
- Registered and exported `PatchConnectionStatsPipe` in `PatchModule`; added `StatisticsModule` to `PatchModule` imports
- 10 unit tests in `patch-connection-stats.spec.ts` covering: null/empty inputs, single cable, unique module
  deduplication, zero multiples, single multiple, two multiples, large patch, self-patch edge case

**Files modified/created:**

- `patch-connection-stats.pipe.ts` — new pipe
- `patch-connection-stats.spec.ts` — new tests
- `patch.module.ts` — registered pipe + StatisticsModule
- `patch-composite.component.html` — added statistics panel

---

### Patch Graph Enhancements

**Occupied Inputs Visualization**  
**Why:** Hard to see which inputs are already connected in complex patches  
**How:** Visual indicator (color/CSS class) on connected inputs  
**Area:** Patch graph component

**Cable/Multiples Counter**  
**Why:** Users don't know how many physical cables they'll need  
**How:** Count connections, identify splits (multiples), display statistics  
**Area:** Patch detail view

**User-Colored Nodes**  
**Why:** Complex patches hard to visually organize  
**Current:** Colors hardcoded by type (inputs/outputs/CV)  
**How:** Allow user to color-code modules or connections  
**Area:** Patch graph component, patch data model

---

## Nice to Have

### User Organization

**Why:** Power users need to organize large collections  
**What:** Tags, folders, or custom groups for modules, patches, racks  
**Scale:** Large feature - needs UX design, new database tables, filtering UI


### Store Integration

**Why:** Help users find where to buy modules  
**What:** Buy links to retailers  
**Scope:** Needs business partnerships, affiliate tracking

### PWA Support

**Why:** Better mobile experience  
**What:** Installable app, offline support  
**How:** Angular PWA schematics, service worker, offline strategy

---

## Long Term

### Manufacturer Features

**Manufacturer Pages**  
**Why:** Showcase manufacturers and their full module catalog  
**What:** Dedicated page per manufacturer with all modules and info  
**Backend Ready:** Query method exists (`get.modulesBySameManufacturer()`)  
**Needs:** UI design and implementation

**Design Considerations:**

- **Content:** Just module list or editorial (brand story, video, news)?
- **SEO:** Big opportunity for organic traffic - priority?
- **Partnership:** Reach out to manufacturers for official content/verification?
- **Related Items:** Link to user racks featuring their modules? Popular patches?

**Manufacturer Accounts**  
**Why:** Let manufacturers maintain their own module data  
**What:** Role-based system for manufacturers to edit own modules  
**Scope:** Large - requires auth system expansion, role system, claim/verification workflow  
**Areas:** User model, permissions, module editor

**Design Considerations:**

- **Verification:** How to prove manufacturer identity? Email domain? Social proof?
- **Scope:** Can they edit only their modules or also manage brand page?
- **Moderation:** Do admin-approved edits from manufacturers bypass review?
- **Incentive:** What's in it for manufacturers? Analytics? Featured placement?
- **Liability:** Are they responsible for accuracy? Terms of service implications?

**Related:** Community Building strategy, Monetization (partnership revenue)

---

### Platform Features

**User Profile Pages**  
**Why:** Social features, showcase user's work  
**What:** Public pages showing user activity, collections, racks, patches  
**Scope:** Large - needs privacy controls, comprehensive UX design

**Design Considerations:**

- **Identity:** Real names vs usernames? Avatar requirements?
- **Discoverability:** How do users find each other? Search? Recommendations?
- **Activity:** Show edit history? Contributions? Reputation score?
- **Privacy Granularity:** All-or-nothing vs selective sharing per item type?
- **Interaction:** Allow following? Direct messages? Comments on profiles?

**Related:** Privacy & Sharing Philosophy, Community Building strategy

**Dark Mode**  
**Why:** User preference, accessibility  
**What:** Theme toggle for entire application  
**Scope:** Large - requires design system overhaul with CSS variables, theme service

**Design Considerations:**

- **Scope:** Just dark/light or multiple themes? User-created themes?
- **Default:** System preference detection or manual toggle?
- **Images:** Module panels optimized for dark backgrounds? Inversion issues?
- **Accessibility:** Does dark mode solve contrast issues or create new ones?
- **Branding:** Does dark mode align with brand identity?

**Better SQL Policies**  
**Why:** Security and performance  
**What:** Audit and optimize database row-level security policies  
**Type:** Operational task, not a feature

**Design Considerations:**

- **User Roles:** Do policies need to support future roles (manufacturer, moderator)?
- **Performance:** Are policies causing slow queries? Index optimization?
- **Privacy:** Are user submissions truly private until approved?
- **Data Leaks:** Can users access data they shouldn't through creative queries?

---

## Bugs

### iOS Clipboard Failure

**~~Issue: Copy-to-clipboard doesn't work on iOS Safari~~ ✅ Fixed (Feb 19, 2026)**  
**Cause:** iOS Safari does not support the async Clipboard API in all contexts  
**Where:** `app-copy-on-click.directive.ts`  
**Fix applied:** Added textarea + `execCommand('copy')` fallback. Primary path uses `navigator.clipboard.writeText`; fallback kicks in when that API is unavailable.

### Duplicate Panel Detection Incomplete

**Issue:** Only checks database key constraints, not if image content is identical  
**Impact:** Users can upload same image multiple times  
**Where:** Module editor panel upload  
**Fix:** Add image hash comparison before upload

### Rack Statistics Include Blanks

**~~Issue: Rack statistics count system blank modules in totals~~ ✅ Fixed (Feb 19, 2026)**  
**Where:** Rack statistics pipes  
**Fix applied:** Created `rack-blank-module.constants.ts` with `BLANK_MODULE_IDS` set (3U: 4647–4666, Intellijel 1U: 4711–4735) and `isBlankModule()` helper. All six stats pipes (`totalModulesOfRack`, `totalHpOfRack`, `totalPowerOfRack`, `totalWeightOfRack`, `totalDepthOfRack`, `totalMissingPowerDataInRack`) now filter blank IDs before computing. 30 new tests added in `rack-stats-blank-filter.spec.ts`.

### Safari Image Export Broken

**Issue:** domtoimage library incompatible with Safari rendering engine  
**Where:** Rack image export functionality  
**Fix:** Replace with html2canvas or modern-screenshot library

---

## Won't Fix

**Larger "+" Icon for Adding Modules**  
**Reason:** Design decision - current size intentional for clean UI