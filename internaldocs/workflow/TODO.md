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
> 5. **Do not duplicate** strategy rationale already in `../product/PRINCIPLES.md` or `../product/ROADMAP.md`; one sentence of
     context per task is enough.

**Tasks are ordered by priority within each section.**

---

## Legend

- `[ ]` — Not started
- `[~]` — In progress
- `[x]` — Done

## Active

*None — pick a task from the Backlog below.*

---

## Backlog

> Two tracks run in parallel: **Product** (user-facing features) and **Infra** (tests, tooling, hygiene).
> Product tasks are sequenced by the Tier 0 → Tier 1 → Tier 2 arc from [../product/ROADMAP.md](../product/ROADMAP.md).
> Infra tasks are independent and can be picked any time a product task is blocked.

---

### PRODUCT — Tier 0 (ship in any order; no external dependencies)

---

#### LOW: Rack-Context Patch Building — Polish Review

**Why:** The optional linked-rack feature shipped as v6.0.0. One Layer 3 Polish item was deferred: verifying that
rack-linked mode does not weaken non-1:1 use cases (patches that intentionally diverge from any rack, or span multiple
racks, or reference no rack at all).

- [ ] Review educational copy, empty states, and help cues in patch editor / patch detail to confirm non-1:1 patch
  flows are clearly supported and the rack-linked mode framing does not imply "rack-first" as the preferred default
- [ ] Confirm informational advisory states (diverged, unavailable) do not read as errors or discouragement

---

#### HIGH: Patch Editing — "No connections" warning not updating after connection added

**Why:** On the patch editing page, the yellow warning banner "This patch has no connections yet" stays visible even
after a connection has been added (PATCH CONNECTIONS shows count 1). Investigation shows this is **not** a generic
change-detection failure. The root cause is split state: `patch-details.component.html` drives the warning from
`dataService.patchConnections$`, but live editing updates `dataService.editorConnections$`. `patchConnections$` only
refreshes from the backend on patch load / editor close, so the warning stays stale while the editor is open even though
the editor's own "Patch connections (N)" card is already showing the new connection. The graph card currently has the same
stale-source coupling (`patch-graph.component.html` also reads `patchConnections$`).

<!-- AUDIT: UI was redesigned (warning replaced by empty-state-tips in 36152120) but the stale-source root cause —
     patchConnections$ driving empty-state while editing — was not fixed as of 2026-05-14. Both [ ] items remain open. -->

- [x] Switch patch-detail warning/empty-state logic to the live editing source when edit mode is open (`editorConnections$`
  or a derived merged stream), so the banner clears immediately after a connection is added
- [x] Audit nearby patch-detail surfaces that still read persisted `patchConnections$` during live editing (at minimum the
  graph empty state) and align them with the same source-of-truth rule

---

### PRODUCT — Tier 1 (requires Manufacturer Page Phase 2 to be live)

---

#### HIGH: Manufacturer Accounts & Verification

**Why:** Manufacturer pages need a trustable ownership model before official-field editing, updates, analytics, or B2B surfaces can ship.
**Blocked on:** Explicit user approval for any required Supabase/RLS policy work around `manufacturer_accounts`.

- [ ] Add the minimal `manufacturer_accounts` table shape and generated types once policy work is approved
- [ ] Add claim read/create methods scoped to manufacturer detail surfaces
- [ ] Add CTA states for claim, pending review, and ownership-review request
- [ ] Limit first verified edits to official profile fields, MSRP, and official links
- [ ] Keep shared catalogue edits audited or review-gated

---

#### LOW: Manufacturer Updates / Featured Surface

**Why:** Verified manufacturers need a compact way to highlight new releases, updated modules, featured products, and
important notices without turning Patcher into a blog platform.
**Depends on:** Manufacturer Accounts & Verification.

- [ ] Add manufacturer-owned update entries with title, body, timestamp, optional linked module
- [ ] Add "featured modules" controls for verified manufacturers
- [ ] Show a compact "what's new" / "featured" section on manufacturer detail pages
- [ ] Define hard constraints up front: posting limits, entry length, expiry/archive model, and reporting flow
- [ ] Define moderation / visibility rules for official update entries

---

#### LOW: Manufacturer Analytics

**Why:** Verified manufacturers need aggregate insight into catalogue performance and audience interest inside Patcher.
**Depends on:** Manufacturer Accounts & Verification.

- [ ] Validate with a small set of boutique manufacturers what they would actually want from analytics before building it
- [ ] Define privacy-safe aggregate metrics (views, outbound clicks, collection count, public rack count, public patch count)
- [ ] Define minimum thresholds below which metrics are hidden instead of shown
- [ ] Add manufacturer dashboard queries / aggregation layer
- [ ] Add private analytics UI for verified manufacturers
- [ ] Document privacy boundaries so no user-level ownership data is exposed

---

#### LOW: Manufacturer API / Widgets Pilot

**Why:** Long-term B2B angle — let manufacturers use Patcher as lightweight catalogue infrastructure, not only a public page.
**Depends on:** Manufacturer Accounts & Verification.

- [ ] Decide first deliverable: narrow embeddable widget vs authenticated API, using the smallest credible B2B wedge
- [ ] Define manufacturer-owned fields safe for programmatic access
- [ ] Design minimal auth / key model for verified manufacturers
- [ ] Pilot one narrow integration path (e.g. module card widget or official-profile sync)

---

### INFRA (independent; pick any time a product task is blocked)

---

#### HIGH: E2E — Dedicated Test Account Cleanup

**Why:** E2E credentials are coupled to a personal Supabase account — should use a dedicated test account.

- [ ] Create dedicated Supabase test account (email/password)
- [ ] Update local `.env` and rotate GitHub secrets `E2E_TEST_EMAIL` + `E2E_TEST_PASSWORD`
- [ ] Re-run `pnpm test:e2e:auth` to confirm

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
