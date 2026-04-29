# Current Feature / AI RAM

> **Rules for AI agents:**
> 1. Read this file when the task is about the active in-flight feature or explicitly references the current plan.
> 2. Keep it updated - check off steps, add discoveries.
> 3. One feature at a time - archive to [COMPLETED.md](./COMPLETED.md) when done, then reset.
> 4. This file owns implementation detail; `TODO.md` owns the backlog.
> 5. **Every feature uses three layers** (MVP -> Structural -> Polish). Define all three before coding. Complete each
>    layer before starting the next. Layout before interactions.

---

## Active

### Manufacturer accounts & verification

**Goal:** Define a trustable manufacturer-claim model that lets real brands control official surface-area fields without giving them silent write access to shared catalogue structure.

### Product boundaries

- manufacturer-facing work must start with **practical profile stewardship**, not custom CMS ambition
- verification is manual-first; no speculative self-serve automation in the first pass
- one verified claim per manufacturer for MVP; multi-admin workflows are later
- verified status is about **brand control of official fields**, not blanket authority over all module data
- any future RLS or moderation-policy changes still require explicit manual approval before implementation

### Verification criteria

1. **Acceptable proof of control**
   - reply from an email on the manufacturer's official domain
   - or a temporary verification token placed on the official website
   - or a corroborated public contact point already linked from the official site
2. **Non-acceptable proof**
   - reseller/distributor email without explicit manufacturer mandate
   - social account alone when it is not linked from the official site
   - unverifiable free-mail claims without independent corroboration
3. **Approval record**
   - verification stays manual in Supabase/dashboard for MVP
   - approval notes should record which proof path was used
   - re-review should not require re-collecting evidence unless the brand identity or contact surface changes

### Dormancy and revocation

- **Dormant, but still valid:** no profile edits or account activity for up to 12 months; keep access unless there is an active dispute
- **Needs re-verification:** official website/domain/contact changes materially, or a competing claimant provides stronger evidence
- **Soft-freeze trigger:** repeated inaccurate edits to manufacturer-owned fields, bounced official contact, or credible ownership dispute
- **Revocation path:** freeze edit access, document the reason, notify the claimant, allow a manual review window, then revoke if proof is not restored
- **Reclaim path:** a revoked or dormant manufacturer can be re-verified using the same objective proof rules; do not silently transfer control

### Field ownership split

#### Manufacturer-owned fields (authoritative once verified)

- manufacturer display name
- logo URL / brand image
- official website
- support / contact links
- manufacturer bio / brand description
- official social links
- featured modules
- manufacturer update entries
- MSRP
- official module-adjacent links such as support, manual, firmware, or store destinations

#### Shared catalogue fields (reviewed or audited, not silent-write)

- module HP / width / depth / power
- format / standard
- IO counts and signal metadata
- tags / taxonomy
- panel geometry and technical dimensions
- moderation / approval state
- user-submitted correction history

#### Mixed fields (brand can propose; system should preserve auditability)

- module name copy
- short marketing description
- release / lifecycle annotations
- official imagery where it affects shared presentation

### Layer 1 — MVP

- [x] define objective verification criteria and rejection rules
- [x] define dormancy, freeze, revocation, and reclaim path
- [x] define manufacturer-owned fields vs shared catalogue fields
- [ ] convert these rules into claim-flow implementation tasks

### Layer 2 — Structural

- [ ] add `manufacturer_accounts` data model and service methods
- [ ] add claim request flow on manufacturer detail pages
- [ ] limit the first verified surface to official profile fields plus MSRP / official links
- [ ] keep all shared catalogue edits audited or review-gated

#### Proposed MVP data model

Core table remains intentionally small for the first pass:

```text
manufacturer_accounts
- user_id uuid fk -> profiles.id
- manufacturer_id bigint fk -> manufacturers.id
- verified boolean default false
- created_at timestamptz default now()
```

MVP semantics:

- one row with `verified = false` = pending claim
- one row with `verified = true` = verified owner
- first pass assumes **one active claim row per manufacturer**
- defer richer workflow columns (`reviewed_at`, `reviewed_by`, `revoked_at`, `notes`) until the manual moderation loop is proven necessary

#### Proposed claim-flow behavior

1. Logged-in user opens manufacturer detail page.
2. If they have no claim row for that manufacturer, show **Claim this page** CTA.
3. Submit creates `manufacturer_accounts(user_id, manufacturer_id, verified=false)`.
4. UI flips to **Claim pending review** state with reassurance copy and verification requirements.
5. Manual admin review in Supabase/dashboard sets `verified=true` for the approved row.
6. Verified row unlocks manufacturer-owned edit controls on the same surface.

#### First-pass guardrails

- one pending claim per manufacturer at a time
- a user can hold multiple manufacturer claims only after separate manual approvals
- if a verified row already exists, the CTA becomes **Request ownership review** rather than opening a parallel self-serve claim flow
- all verified edits should cache-bust manufacturer detail reads and keep auditability possible later

#### Known implementation blocker

- Working claim creation almost certainly needs explicit insert/select policy decisions for `manufacturer_accounts`, so code implementation should wait until the user explicitly approves the required Supabase/RLS work.

### Layer 3 — Polish

- [ ] add verified badge rules and ownership messaging
- [ ] define dormancy / dispute admin UI copy
- [ ] refine small-manufacturer onboarding guidance
- [ ] add tests for claim flow, ownership boundaries, and revocation edge cases

### Likely implementation touchpoints

- `src/app/features/backend/supabase.service.ts`
- `src/app/features/backend/DatabaseStrings.ts`
- `src/backend/database.types.ts`
- `src/app/features/routes/manufacturer-detail/`
- `internaldocs/product/PRINCIPLES.md`

### Notes

- Verified manufacturers should control the **official brand surface**, not bypass community trust mechanics.
- Brand-owned fields can be authoritative without turning Patcher into a full manufacturer CMS.
- Small-manufacturer-first remains the filter: the first version should help a one-person brand correct its public surface fast.

---

## Notes

- Contributor stats should reuse shared UI surfaces before introducing any bespoke dashboard chrome.
- Public profile exposure should be explicit and narrow even after the private dashboard phase ships.
- Any future Supabase RLS/policy change still requires explicit manual user approval before implementation.
- Layer 1 now uses a dedicated contributor stats query that aggregates current-user module submissions, approvals, comments, and flags into one cached payload for the private dashboard.
- The shared `app-statistics` atom now supports an optional empty-state message so zero-value contributor stats still render guidance instead of disappearing.
- Layer 2 exposes only approved public modules on public profiles; pending modules, private review state, comments, and flags remain owner-only.
- Layer 3 wording now explicitly distinguishes private in-review work (`Pending review`) from public-safe approved catalogue work (`Approved public modules`).
