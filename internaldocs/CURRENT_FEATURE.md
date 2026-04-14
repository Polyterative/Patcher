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

### Public user profiles via user-area split

Turn the current `user/area` experience from a purely private owner dashboard into a system with two modes:

1. **Private owner dashboard** — current `/user/area`, auth-gated, noindex, includes private collection utilities.
2. **Public profile page** — username-based URL that lets anyone view another user's explicitly public content.

This feature should **reuse the user-area layout and shared blocks where safe**, but it must **not** simply expose the
current private dashboard to other viewers. The current page mixes public content with private collection data,
discovery tips, creation CTAs, manuals, and personal comment history.

---

#### Status

Implementation complete and validated in app build + headless tests. Public `/u/:username` profiles, owner visibility/share
controls, and cross-app author links are now wired. Follow-up still worth tracking separately: the repo does not currently
contain explicit Supabase policy migrations for public-profile reads, and production remains on the existing static-output
build rather than route-specific SSR. Security follow-up still open: public-profile privacy still needs explicit RLS
verification and any later policy change requires manual user approval. Query-layer hardening for public rack/patch reads and
regression coverage are now in place, but no RLS/policy changes have been applied by an agent.

#### Active polish pass

- [x] Review the public-profile and owner user-area top-card layout with a design-focused pass
- [x] Separate identity content from action buttons in the public-profile header so the button group reads as its own zone
- [x] Mirror the spacing/grouping polish in the owner `/user/area` profile card for consistency
- [x] Re-run targeted validation after the layout update

---

## Problem Statement

Right now users can only see their own `/user/area`. The route, SEO behavior, and data service are all hard-wired to
"current signed-in user" assumptions:

- `UserAreaRootComponent` explicitly sets `noindex: true` and contains a `//TODO: change this when user can see other profiles`.
- `UserAreaDataService` only reads `currentUserModules`, `currentUserComments`, `userPatchesPaginated`, and
  `userRacksPaginated` for the logged-in user.
- Child sections include **private-only affordances**: create buttons, discovery tips, manual links, and the owner's
  personal comment history.
- Product strategy already says public profiles are the Tier 1 gate, but also says privacy is **per entity type**, not a
  blanket "make my dashboard public" switch.

So the real job is not "let `/user/area` accept another user ID"; it is:

**separate the owner dashboard from the public profile surface, while reusing enough of the current shell/components that
the work stays coherent and low-risk.**

---

## Planning Decisions

### Resolved approach for this epic

1. Keep **`/user/area`** as the owner's private, auth-gated dashboard.
2. Add a **public username route** for profile viewing. Preferred shape: **`/u/:username`**.
3. Use the same broad page language as the user area, but introduce a **viewer mode**:
   - `owner`
   - `public-visitor`
4. **V1 public scope** should be:
   - public profile header
   - public racks
   - public patches
   - public-facing stats derived from public content
   - mobile-first layout behavior from day one
5. **Out of public v1**:
   - collection modules
   - manual links
   - personal comment history sidebar
   - discovery tips
   - create/edit buttons except owner-facing profile shortcuts
6. Public profile comments are still **on content items**, not on people. Commenting on profile pages stays out of scope.
7. Directory/search of users is **not** part of this first epic. Direct profile URLs come first.
8. **V1 simplification:** `public = visible on profile` for racks and patches. A separate per-entity
   `show_on_profile` opt-in is explicitly deferred, and should be revisited before marketplace/profile-trust work makes
   profile curation more important.

### Why this scope is the safest fit

- It matches `PRODUCT_NEEDS.md`: public profiles are about public racks, patches, future listings, and future price
  attribution.
- It avoids leaking the owner's private collection and utility widgets.
- It preserves the existing value of `/user/area` for signed-in users without compromising public SEO/profile browsing.
- It gives clean future extension points for listings, price reports, and contextual activity.

---

## Core UX / Information Architecture

### Route model

- **Private dashboard:** `/user/area`
- **Public profile:** `/u/:username`

The public route should resolve by username slug, not by raw user ID, because the product direction already treats the
username as the public identity and SEO surface.

Route resolution must explicitly handle three different states:

- username not found
- existing profile but `profiles.public = false`
- existing account with `username = null` / not yet completed

### Button and link plan

The plan should treat profile navigation as a first-class part of the epic, not an afterthought.

**Owner-facing buttons**

- Add a **View public profile** button in the current user-area profile card.
- Add a **Copy public profile link** action once a public route exists.
- Keep edit/profile management actions in account management, not mixed into the public view.

**Cross-app profile entry points**

- Make patch author labels link to the public profile.
- Make rack author labels link to the public profile.
- Make comment author chips/usernames link to the public profile.
- Where cards already surface `author.username`, add a consistent "open profile" affordance instead of inventing a new
  profile discovery UI.

**Public-view buttons**

- No create buttons.
- No add-to-collection buttons inside the profile sections.
- If the visitor is also the owner, prefer a small **Edit my dashboard** / **Manage account** affordance rather than
  mixing owner controls into every card.

### Public profile content model

**Header**

- Username
- optional avatar
- optional website link
- owner-only CTA when self-viewing from the public route

**Main content**

- Public racks
- Public patches

**Sidebar**

- Public stats only
- Future-friendly placeholder for listings / price contributions / activity, but not shipped in v1
- Do not carry over owner-only `miscStats$` inputs from `UserAreaRootComponent`; public stats must be derived from
  public-profile data only

---

## Architecture Direction

### Do not publicize the current data service as-is

`UserAreaDataService` is owner-dashboard oriented. It is tightly coupled to:

- current-user queries
- create actions
- discovery tips
- private manuals/comments
- local private search snapshot logic

Public profile work should either:

1. introduce a **viewer-aware profile-area data service**, or
2. split the public route into a dedicated `PublicProfileDataService` while retaining owner-only behavior in
   `UserAreaDataService`.

Preferred direction: **split services by responsibility, share pure helpers only.**

That keeps privacy boundaries clearer than threading "public mode" booleans through the existing service everywhere.

The public page should therefore be a **separate route module and root container** rather than trying to reuse
`UserAreaRootComponent` directly. Reuse the visual shell and extracted presentation pieces, but not the current
owner-oriented root/data-service pair.

### Backend query direction

We need public, username-resolved read paths rather than current-user reads:

- `get.publicProfileByUsername(username)`
- `GET.publicUserPatchesPaginated(profileId, from, to)`
- `GET.publicUserRacksPaginated(profileId, from, to)`
- optional `GET.publicProfileStats(profileId)` if derived counts do not compose cleanly in the route service

Important rules:

- Resolve username **once** to the stable profile ID in the public route/data service, then use profile ID for the
  downstream racks/patches reads.
- Always filter by the target entity's own public flag.
- Respect `profiles.public` as the gate for whether the profile page itself is viewable.
- Handle `username = null`, unknown username, and private profile as distinct route states rather than collapsing them
  into one silent failure.
- Verify Supabase anon/RLS policy allows public `SELECT` on profiles, racks, and patches for public rows. This must be
  checked before UI work because RLS-denied rows can fail as empty results rather than explicit errors.
- Do not reuse `currentUserComments` or `currentUserModules` for public viewing.

### SEO / rendering direction

Public profiles must be indexable; `/user/area` must remain `noindex`.

Needed plan items:

- public profile SEO title/description/canonical
- open graph tags using username + public counts/content summary
- server-rendered first load for `/u/:username`

Preferred direction: use **SSR/runtime rendering for `/u/:username`** rather than trying to statically prerender an
unbounded set of usernames. The repo already has server-rendering capability in the base Angular build, even though the
current production config is static. This epic should treat SSR for public profiles as the preferred path, then layer
sitemap/discovery work on top.

---

## Layer Plan

### Layer 1 — MVP

Goal: ship a safe public profile page with real navigation and no privacy leaks.

1. Verify/enable the required Supabase anon/RLS read policies for public profiles, public racks, and public patches.
2. Add a public profile route (`/u/:username`) in a separate public-profile route module and resolve the profile by username.
3. Build a public profile root/container using the user-area visual shell, but not `UserAreaRootComponent`, with:
   - public header
   - public racks block
   - public patches block
   - public stats block
4. Hide owner-only CTAs and discovery tips on the public route.
5. Add a **View public profile** button from `/user/area`.
6. Link author surfaces from public content into `/u/:username`.
7. Return proper not-found / private-profile / username-not-complete states.
8. Keep `/user/area` behavior unchanged for the owner.
9. Ship the public route mobile-first, not as a desktop-first layout to be collapsed later.

**Acceptance shape for MVP**

- `GET /u/:username` returns a public profile page that is reachable by direct URL and by author links.
- Unknown username returns a not-found state rather than a blank page.
- Private profile returns a distinct private-profile state.
- A user without a completed username does not create a broken public route.
- Public profile shows only public data.
- `/user/area` auth guard and `noindex` behavior remain unchanged.
- Server-rendered first load includes title/description/Open Graph tags.
- Public-row reads are verified to work under Supabase anon/RLS policy.

### Layer 2 — Structural

Goal: remove duplicated logic and make the profile system extensible.

1. Extract shared profile-shell presentation pieces from `UserAreaRootComponent`.
2. Move public-profile state into a dedicated data service or viewer-context abstraction.
3. Rework section components so they accept explicit capability/view config rather than assuming owner mode.
4. Introduce consistent profile-link helpers/components so patch/rack/comment author navigation is not hand-coded in
   multiple places.
5. Add cache keys and test coverage for the new public GET paths.
6. Formalize route-level state for:
   - loading
   - public profile missing
   - public profile private
   - self-view on public route

**Acceptance shape for Structural**

- Owner/private logic and public logic are clearly separated.
- Shared UI is reused intentionally rather than copied.
- Profile linking uses one convention across comments, racks, and patches.
- The dead `updateRackData$(userId)` branch/comment in `UserAreaDataService` is either removed or clearly retired so the
  new public path does not compete with a half-implemented owner-service extension.

### Layer 3 — Polish

Goal: make profiles feel deliberate and production-ready.

1. Add copy-link/share affordances for the owner.
2. Improve empty-state copy for public profiles with no public patches/racks yet.
3. Add lightweight public profile metadata polish:
   - avatar fallback
   - website presentation
   - better stats wording
4. Decide whether self-view on `/u/:username` should show owner convenience actions.
5. Add sitemap/discovery integration for discoverable public profiles.
6. Prepare extension slots for future:
   - sale listings
   - price contributions
   - contextual activity
   - public media embeds on patch cards/blocks without needing another layout redesign

**Acceptance shape for Polish**

- Public profiles feel like a distinct product surface, not a stripped private dashboard.
- Profile URLs are shareable and presentable.
- Future Tier 2 features can be added without another route rethink.

---

## Expected File / Area Touchpoints

### Current route and shell

- `src/app/features/routes/user-area/user-area.module.ts`
- `src/app/features/routes/user-area/user-area-root/user-area-root.component.ts`
- `src/app/features/routes/user-area/user-area-root/user-area-root.component.html`
- `src/app/features/routes/user-area/user-area-data.service.ts`
- new public-profile route module/root under `src/app/features/routes/` (preferred: `public-profile/`)

### User-area section components

- `user-modules`
- `user-racks`
- `user-patches`
- `user-comments`
- `user-manuals`

These need an explicit decision on whether they are:

- reused in public mode,
- reused with stricter inputs/config,
- or left owner-only.

### Backend

- `src/app/features/backend/supabase-get.ts`
- `src/app/features/backend/supabase-queries.ts`
- `src/app/features/backend/supabase.service.ts`
- `src/app/features/backend/DatabaseStrings.ts`
- `src/backend/database.types.ts` if profile fields change

### Navigation surfaces likely to gain profile links/buttons

- comments item / author display
- patch detail / patch browser author surfaces
- rack detail / rack browser author surfaces
- current user-area profile card
- account-management surface if a profile-visibility/share affordance is added there later

### SEO / route generation

- route-level SEO calls
- SSR/server config touchpoints
- any sitemap/discovery plumbing already used for public browse pages

---

## Risks / Knots To Respect

### Privacy leak risk

The biggest implementation risk is accidentally exposing:

- private collection modules
- private racks
- private patches
- manual links
- private comment history

The public route must use dedicated public queries, not owner queries with client-side filtering.

### Username mutability

Because the URL is username-based, renames must not break profile identity logic. The route should always resolve the
current username to the stable profile ID internally. Canonical URLs should reflect the latest username.

### Username / visibility knot

`profiles.username` is nullable in the schema and `profiles.public` is the public gate. The route plan must distinguish:

- no such username
- account exists but username not completed
- profile exists but is private

Do not flatten those states into one opaque 404 during implementation.

### Public vs profile-visible knot

`PRODUCT_NEEDS.md` wants a future split between general public visibility and explicit "show on my profile" curation.
This plan intentionally simplifies v1 to `public = visible on profile`; that shortcut must be documented in code and
revisited before marketplace/profile-trust features depend on profile curation.

### RLS silent-empty knot

If public Supabase reads are blocked by RLS, public profile queries can fail as empty result sets instead of obvious
errors. Backend policy verification is therefore part of MVP, not post-launch cleanup.

### SEO rendering knot

The current production build is static, but the repo also has SSR/server capability in the Angular build. Public
profiles should prefer SSR/runtime rendering instead of inventing a brittle static-prerender strategy for unbounded
username routes.

### Component coupling knot

`UserAreaDataService` currently owns both data loading and owner actions. Retrofitting it with many "if public" branches
would raise regression risk and make future profile features harder.

### Mobile-first knot

`PRODUCT_NEEDS.md` explicitly treats profile pages as mobile-first. This must shape the shell/section extraction early;
it is not polish-only.

---

## Explicitly Deferred

These are intentionally not part of the first execution pass unless scope changes:

- public collection modules
- profile-page comment threads
- user directory / people search
- follower/social mechanics
- marketplace listings UI
- community price contributions UI
- contextual activity feed on profile

---

## Recommended Execution Order

1. Verify/enable public Supabase RLS reads for profile/racks/patches
2. Public route module + profile lookup + not-found/private/username states
3. Public racks and patches queries
4. Public profile shell and viewer-mode split
5. Owner button: View public profile
6. Author links from comments/racks/patches
7. Structural refactor for shared shell/service boundaries
8. SEO/SSR wiring for public profile response
9. Polish affordances

---

## Approval Note

This plan assumes the first public version should expose **public racks and public patches only**, while keeping the
current collection modules, manuals, and personal comments owner-only. That assumption matches current product strategy
and is the safest route for avoiding privacy leakage while still unlocking real public profiles.
