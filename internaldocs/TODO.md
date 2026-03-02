# TODO

> **Rules for AI agents using this file:**
> 1. **Pick one task** from the Backlog — immediately cut it from Backlog and paste it under Active *before* doing any
     other work. Do not start implementation until the file reflects the task as Active.
> 2. **Update steps inline as you go** — check off `[ ]` → `[x]` after completing each step; save the file before moving
     to the next step. Never leave Active half-finished when handing back.
> 3. **On completion** — move the task to [COMPLETED.md](./COMPLETED.md) as a one-line summary (date + what changed),
     then clear Active. Also reset `CURRENT_FEATURE.md` to its Empty Template.
> 4. **Domain detail lives in `CURRENT_FEATURE.md`** — implementation steps, file names, schema fields, test results,
     and gotchas go there while a feature is in progress. Only a one-line entry per feature belongs here.
> 5. **Do not duplicate** strategy rationale already in PRODUCT_NEEDS.md; one sentence of context per task is enough.

**Tasks are ordered by priority within each section.**

---

## Legend

- `[ ]` — Not started
- `[~]` — In progress
- `[x]` — Done

---

## Completed

> Archived in [COMPLETED.md](./COMPLETED.md). Keep one-line summaries there.

> **ABANDONED Feb 21:** Integration test for first-click CV highlight bug
> (`patch-editor-cv-highlight.integration.spec.ts`). Test confirmed failing; fix not worth effort. File kept as
> race-condition documentation.

---

## Active

### Manufacturer Page — Phase 1 Polish Pass

**Why:** Backend query exists — this is UI-only. High SEO return immediately. Polish pass after user feedback.
**Scope:** Read-only, anonymous-visible. All implementation done; final verification pass in progress.

- [x] Confirm `get.manufacturerWithId` data shape and module join keys
- [x] Add route `/manufacturers/:id` to the router
- [x] Create `manufacturer-detail` feature: component + data service (`ReplaySubject<id>` trigger pattern)
- [x] Template: logo/name/website header, module grid with `lib-screen-wrapper`, separate loading states
- [x] Link manufacturer name from module detail page and module browser cards → `/manufacturers/:id`
- [x] JSON-LD for manufacturer entity; add to sitemap (`api/sitemap.ts`)
- [x] Write data service unit tests (12 passing)
- [ ] Verify final compile errors clear and tests still green

---

## Backlog

> Two tracks run in parallel: **Product** (user-facing features) and **Infra** (tests, tooling, hygiene).
> Product tasks are sequenced by the Tier 0 → Tier 1 → Tier 2 arc from PRODUCT_NEEDS.md.
> Infra tasks are independent and can be picked any time a product task is blocked.

---

### PRODUCT — Tier 0 (ship in any order; no external dependencies)

---

#### HIGH: Module Review Flagging

**Why:** Tier 0 — improves catalogue quality immediately; scales into UGC trust model later. No community layer needed.
**Scope:** User-facing flag submission only; admin review is a manual Supabase queue for now.

- [ ] Add `module_flags` to `DbPaths` in `DatabaseStrings.ts`
- [ ] Add `module_flags` table type to `database.types.ts` (id, module_id, user_id, category, note, created_at,
  resolved)
- [ ] Add `add.moduleFlag()` to `supabase.service.ts`
- [ ] Create `module-flag-data.service.ts` with `submitFlag$` Subject and inline form toggle
- [ ] Add inline flag form to module-details (categories: wrong specs / missing image / duplicate / other)
- [ ] Confirm snackbar on success via `SharedConstants.successCustom`
- [ ] Write tests for service API surface

---

#### MEDIUM: Store Links per Module (Price Hub prerequisite)

**Why:** One canonical "buy new" URL per module. No scraping — manually curated for popular modules first. Price Hub
layer 1 cannot show anything without this data.

- [ ] Add nullable `store_url` to `modules` in `database.types.ts`
- [ ] Add `update.moduleStoreUrl()` to `supabase.service.ts` (admin/verified-only write)
- [ ] Show "Buy new" link on module detail page when present
- [ ] Write display logic tests

---

#### MEDIUM: Patch Tags — Phase 1 (Solo Organisation)

**Why:** Solo org value now (filter own patches); unlocks Collection-Aware Discovery later. Free-form tags, no taxonomy
yet.

- [ ] Add `tags` (text array) to `patches` in `database.types.ts`
- [ ] Add `update.patchTags()` to `supabase.service.ts` with `cacheBust(['patchWithId'])`
- [ ] Inline chip tag editor in patch editor, auto-save on change
- [ ] Tag filter in patch browser (own patches)
- [ ] Write tests for update service and filter logic

---

#### LOW: Media Attachment on Patches (Embed-Only v1)

**Why:** Solo memory aid (link a recording to a patch). Public showcase once profiles ship. URL field + embed renderer
only — no upload, no moderation.

- [ ] Add nullable `media_url` to `patches` in `database.types.ts`
- [ ] Add `update.patchMediaUrl()` to `supabase.service.ts` with `cacheBust(['patchWithId'])`
- [ ] URL input + YouTube/SoundCloud embed preview in patch editor
- [ ] Embed visible on patch read-only view
- [ ] Write URL validation and render tests

---

#### LOW: Edit Module HP in Rack

**Why:** Rack-specific HP override — correcting wrong HP currently requires removing and re-adding the module.

- [ ] Add nullable `hp_override` to `rack_modules` Row/Insert/Update in `database.types.ts`
- [ ] Add `update.rackModuleHp()` to `supabase.service.ts` with `cacheBust(['rackWithId'])`
- [ ] Click-to-edit HP affordance in rack editor; module rendering prefers override when set
- [ ] Write tests for override logic and rack layout reflow

---

#### LOW: Multi-Instance — Guard Against Ambiguous Collection-Card Wiring

**Why:** CVs clicked from collection cards when instances exist produce ambiguous connections ("mystery node" in graph).
**Decision needed first:** Prompt to pick an instance, or block collection-card wiring entirely when instances exist?

- [ ] Decide guardrail approach (prompt vs block)
- [ ] Implement guard in patch editor CV click handler
- [ ] Write targeted unit test

---

### PRODUCT — Tier 1 (requires Tier 0 Manufacturer Phase 1 to be live)

---

#### MEDIUM: Manufacturer Page — Phase 2 (Accounts & Editable Profile)

**Why:** Manufacturers claim their page, manage profile data, submit official MSRP.
**Depends on:** Manufacturer Page Phase 1 live.
**Scope:** Auth-gated edit surface. New `manufacturer_accounts` table links `user_id` → `manufacturer` entity. Profile
fields (name, logo, website, bio) are manufacturer-owned; module data edits go through UGC review queue.

- [ ] Add `manufacturer_accounts` table (user_id, manufacturer_id, verified, created_at) to `database.types.ts`
- [ ] Add `manufacturer_accounts` to `DbPaths` in `DatabaseStrings.ts`
- [ ] Add `add.manufacturerAccountClaim()` and `get.manufacturerAccountForUser()` to `supabase.service.ts`
- [ ] "Claim this page" button on manufacturer detail (auth-gated; one pending claim per manufacturer; manual admin
  approval via Supabase dashboard)
- [ ] Verified: unlock edit controls (name, logo URL, website, bio, social links)
- [ ] Add `update.manufacturerProfile()` with `cacheBust(['manufacturerWithId'])`
- [ ] Verified badge on manufacturer page and on module cards from that manufacturer
- [ ] MSRP field per module (visible to verified account only; feeds Price Hub label hierarchy)
- [ ] Write tests for claim flow and profile update

---

### INFRA (independent; pick any time a product task is blocked)

---

#### HIGH: E2E — Dedicated Test Account Cleanup

**Why:** E2E credentials are coupled to a personal Supabase account — should use a dedicated test account.

- [ ] Create dedicated Supabase test account (email/password)
- [ ] Update local `.env` and rotate GitHub secrets `E2E_TEST_EMAIL` + `E2E_TEST_PASSWORD`
- [ ] Re-run `yarn test:e2e:auth` to confirm

---

#### HIGH: E2E — Multi-Instance Patching

**Why:** Auto-instance feature has 30 unit tests but no E2E coverage through the real UI.
**Depends on:** Dedicated test account (above).

- [ ] Open patch in editor → verify collection modules appear as cards
- [ ] "Add Copy" from 0 instances → verify 2 cards with labels (1)(2)
- [ ] "Add Copy" again → verify 3 cards
- [ ] Connect CV from instance (1) → verify connection recorded
- [ ] Same output CV to instance (2) → verify accepted
- [ ] Same connection again → verify rejected as duplicate
- [ ] Delete instance with connections → verify confirmation dialog
- [ ] Confirm deletion → instance removed, connections scrubbed, remaining renumbered
- [ ] Save + reload → connections and instances survive roundtrip
- [ ] Legacy patch (pre-instance) → loads and displays correctly

---

#### ON HOLD: SEO — OG Image Generation

**Paused 2026-02-23.** Resume when Manufacturer Page Phase 1 is live (manufacturer pages need OG images too).

Completed: sitemap, robots.txt, canonical URLs, JSON-LD, llms.txt, og:image dimensions, bot cache headers (partial).

Remaining:

- [ ] OG image generation endpoint (`@vercel/og`)
- [ ] Middleware wiring to generated OG image URLs
- [ ] Rich preview validation (Telegram / WhatsApp / Slack + debuggers)
- [ ] Visual polish pass

---

#### POLICY: Unit Test Coverage

Target: statements and lines ≥ 75% (baseline 03-02: ~57%).
Not a blocking task — coverage rises naturally as new features ship with tests.
If coverage stalls after two feature completions, revisit as a targeted task:

- Highest-yield uncovered files: `rack-detail-data.service.ts`, `module-detail-data.service.ts`,
  `user-area-data.service.ts`

---

## Long-term Ideas

> Not yet broken into executable steps. Strategy and rationale in [PRODUCT_NEEDS.md](./PRODUCT_NEEDS.md).

**Tier 1 — Community Foundation**

- Public User Profiles — gate for marketplace and community price reporting
- Contextual Activity — inline activity on module/patch/rack pages (companion to profiles, not a gate)

**Tier 1–2 — Price Hub**

- Cross-store price display (read-only, Tier 1)
- Price history charts (Tier 1 for scraped data)
- Community price reports (Tier 2, requires profiles)

**Tier 2 — Market Layer**

- Peer-to-peer module listings from collection; one-way inquiry contact model

**Tier 3 — Discovery & Depth**

- Collection-Aware Patch Discovery — "patches I can play right now" subset query (requires Tags + community layer)
- User Organization — folders/sets on top of Patch Tags

**Tier 3 — Catalogue & UX**

- Manufacturer Accounts MSRP → Price Hub integration
- PWA Support — service worker, offline for marketplace/price hub
- Patch Graph Enhancements — color coding, connected-input indicators
- Dark Mode — CSS variable theme system (after component library is stable)