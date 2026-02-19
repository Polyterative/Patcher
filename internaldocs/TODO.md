# TODO

> **Rules for AI agents using this file:**
> 1. **Pick one task** from the Backlog — immediately cut it from Backlog and paste it under Active *before* doing any
     other work. Do not start implementation until the file reflects the task as Active.
> 2. **Update steps inline as you go** — check off `[ ]` → `[x]` after completing each step; save the file before moving
     to the next step. Never leave Active half-finished when handing back.
> 3. **On completion** — move the task to Completed as a one-line summary (date + what changed + key files/test counts),
     then clear Active.
> 4. **Domain detail lives here, not in PRODUCT_NEEDS.md** — keep implementation steps, file names, schema fields, and
     test counts in this file only.
> 5. **Do not duplicate** strategy rationale already in PRODUCT_NEEDS.md; one sentence of context per task is enough.

**Tasks are ordered by priority within each section.**

---

## Legend

- `[ ]` — Not started
- `[~]` — In progress
- `[x]` — Done

---

## Completed (compressed)

- [x] **Bug sweep** (Feb 19) — Fixed double backend call, snackBar conventions, readonly @Input errors, fxLayout
  deprecations, dead code, wrong tooltips across module-editor, module-details, module-browser-detail.
- [x] **Private Patches** (Feb 18) — Added `public` field to patches; Privatable interface; toggle button + tooltip;
  default public on creation. Tests: integration-user-patches, patch-detail-data-service-privacy, crud-operations.
- [x] **Blank Module Education** (Feb 18) — FAQ entry, rack editor tooltip, enhanced context menu label "Replace with
  blank (add spacing)".
- [x] **User-Submitted Manufacturers** (Feb 19) — Inline manufacturer creation form in module submission;
  BehaviorSubject options list; auto-select on create. 18 tests in module-adder-manufacturer-creation.spec.ts.
- [x] **Account Data Deletion** (Feb 19) — `delete.allUserData()` in SupabaseService; deleteAccountAction$ handler in
  UserManagementService with confirm dialog; single "Delete my data" button wired up.
- [x] **Cable/Multiples Counter** (Feb 19) — PatchConnectionStatsPipe (cables, modules, multiples); statistics panel in
  patch-composite. 10 tests in patch-connection-stats.spec.ts.
- [x] **iOS Clipboard Fix** (Feb 19) — textarea + execCommand fallback in app-copy-on-click.directive.ts.
- [x] **Rack Statistics Blank Filter** (Feb 19) — rack-blank-module.constants.ts; BLANK_MODULE_IDS filter in all 6 stats
  pipes. 30 tests in rack-stats-blank-filter.spec.ts.

---

## Active

*(none — pick from the backlog below)*

---

## Backlog

### HIGH: Multiple Module Instances in Patches

**Why:** Users cannot model patches that use the same module more than once — a common real-world scenario.  
**Constraint:** Current patch_connections table links raw module IDs; no concept of instance.

**Open design decision:** Extend `patch_connections` with an `instance_id` column (simpler) OR add a separate
`patch_module_instances` table (more flexible). Lean toward the separate table — it allows naming instances and storing
per-instance metadata without bloating the connections table.

**⚠️ Graph rendering blocker (read before designing):** `patch-graph.component.ts` builds node IDs as
`module.id.toString()` for module nodes and `module.id.toString() + cv.id` for CV nodes. Two instances of the same
module will produce **identical node IDs** and collapse in the graph. Any instance design must produce distinct node
IDs (e.g. `module.id + "_" + instance_id`) and the graph rendering pipeline must be updated to use them end-to-end
before the feature will be visually correct.

**Steps when picked:**

- [ ] Read `patch-graph.component.ts` fully to understand node/edge ID construction (see blocker note above)
- [ ] Read `patch_connections` schema in `database.types.ts` and connection model in `connection.ts`
- [ ] Read `patch-detail-data.service.ts` to understand how connections are loaded and passed to graph
- [ ] Design `patch_module_instances` table type in `database.types.ts` (id, patch_id, module_id, instance_label)
- [ ] Add `patch_module_instances` to `DbPaths` in `DatabaseStrings.ts`
- [ ] Add `get/add/delete` for instances in `supabase.service.ts` with `cacheBust(['patchConnections'])` on writes
- [ ] Update `PatchConnection` model to carry `instance_id` alongside `module_id` on `CVwithModule`
- [ ] Update patch graph node/edge ID construction to include `instance_id` suffix — prevents ID collisions
- [ ] Update patch graph to render module nodes labeled "Module (1)", "Module (2)" per instance
- [ ] Update patch editor to allow adding extra instances and wiring them independently
- [ ] Write unit tests for instance CRUD and graph node-ID uniqueness with duplicate modules

---

### MEDIUM: Module Review Flagging

**Why:** No way for users to report bad data (wrong specs, duplicate entries, missing image).  
**Constraint:** Needs a new database table; admin review UI is out of scope for first iteration — focus on user-facing
flag submission only.

**Steps when picked:**

- [ ] Read `module-details` component to locate the right insertion point for a "Report issue" button
- [ ] Read `supabase.service.ts` `add` namespace to understand insertion patterns
- [ ] Add `module_flags` to `DbPaths` in `DatabaseStrings.ts`
- [ ] Design `module_flags` table type in `database.types.ts` (id, module_id, user_id, category, note, created_at,
  resolved)
- [ ] Add `add.moduleFlag()` to `supabase.service.ts` with `cacheBust` (no cached key needed yet — it's a write-only
  path for now)
- [ ] Create `module-flag-data.service.ts` with `submitFlag$` Subject and inline form toggle
- [ ] Add inline flag form to module-details (predefined categories: wrong specs / missing image / duplicate / other)
- [ ] Show confirmation snackbar on success via SharedConstants.successCustom
- [ ] Write tests for service API surface and flag submission flow

---

### MEDIUM: Account Management — Password Change

**Why:** GDPR + basic UX: users with password accounts cannot change their password.  
**Note:** Data deletion is already done. This covers the remaining account management gap.

**Steps when picked:**

- [ ] Read `user-management.component.html` and `user-management.service.ts` to understand current state
- [ ] Add `changePassword$` Subject to `UserManagementService`; handler calls `supabase.auth.updateUser({ password })`
- [ ] Add inline password-change form (current password + new password + confirm) to `user-management.component.html`
- [ ] Show BehaviorSubject toggle `showPasswordForm$` to expand/collapse form inline (no dialog)
- [ ] Validate: new ≠ current, min 8 chars, confirm matches
- [ ] Success/error via SharedConstants conventions
- [ ] Write tests for form validation and service API surface

---

### LOW: Edit Module HP in Rack

**Why:** Correcting a wrong HP value requires removing and re-adding the module.  
**Decision:** Rack-specific override (don't touch global module data — too risky for all users).

**Steps when picked:**

- [ ] Read rack editor component and `rack_modules` schema in `database.types.ts`
- [ ] Add nullable `hp_override` to the `rack_modules` Row/Insert/Update types in `database.types.ts`
- [ ] Add `update.rackModuleHp(rackModuleId, hp)` to `supabase.service.ts` with `cacheBust(['rackWithId'])`
- [ ] Add inline HP edit affordance in rack editor (click-to-edit, validated number input)
- [ ] Module rendering must prefer `hp_override` over module's default HP when set
- [ ] Write tests for override logic and rack layout reflow

---

### BUG: Duplicate Panel Detection Incomplete

**Why:** Users can upload identical images multiple times because only DB key constraints are checked.  
**Fix approach:** Hash image bytes client-side (SHA-256 via SubtleCrypto) before upload; compare against known hashes.

**Steps when picked:**

- [ ] Read module editor panel upload code (grep for panel upload handler)
- [ ] Add `hashImageFile(file: File): Promise<string>` utility using `crypto.subtle.digest`
- [ ] Before uploading, fetch known panel hashes for this module (or hash stored URLs lazily)
- [ ] If hash matches an existing panel, show inline warning "This image appears to already be uploaded" and block
  submit
- [ ] Write unit tests for the hash utility and duplicate detection logic

---

### BUG: Safari Image Export Broken

**Why:** domtoimage library is incompatible with Safari's rendering engine.  
**Fix approach:** Replace with `modern-screenshot` (actively maintained, Safari-compatible).

**Steps when picked:**

- [ ] Grep for domtoimage usage to find all call sites
- [ ] `yarn add modern-screenshot`
- [ ] Replace domtoimage calls with modern-screenshot equivalents
- [ ] Test export in Safari-compatible browser or CI
- [ ] Remove domtoimage from package.json

---

## Long-term Ideas (not yet broken into steps)

- **Manufacturer Pages** — Dedicated page per manufacturer; `get.modulesBySameManufacturer()` backend method already
  exists. Needs UI. SEO opportunity.
- **Manufacturer Accounts** — Role-based auth expansion; manufacturers claim and manage their own modules. Large scope.
- **User Profile Pages** — Public activity pages; requires privacy controls. Large scope.
- **Patch Graph: Occupied Inputs Visualization** — Color/CSS indicator on already-connected inputs in graph.
- **Patch Graph: User-Colored Nodes** — Let users color-code modules or connections for complex patch clarity.
- **User Organization (Tags/Folders)** — Group modules, patches, racks. Needs new DB tables + filtering UI.
- **PWA Support** — Angular PWA schematics, service worker, offline strategy.
- **Store Integration** — Buy links to retailers; needs business partnerships.
- **Dark Mode** — CSS variable-based theme system; large design scope.
- **Better SQL RLS Policies** — Security/performance audit of row-level security; supports future roles.