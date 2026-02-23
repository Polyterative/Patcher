# Current Feature / AI RAM

> **Rules for AI agents:**
> 1. Read this file at the start of every session.
> 2. Keep it updated — check off steps, add discoveries.
> 3. One feature at a time — archive to [COMPLETED.md](./COMPLETED.md) when done, then reset.
> 4. This file owns implementation detail; `TODO.md` owns the backlog.
> 5. **Every feature uses three layers** (MVP → Structural → Polish). Define all three before coding. Complete each
     >      > layer before starting the next. Layout before interactions.

---

## Active: SEO Tagging & Rich Link Previews

Goal: search engines, AI discovery bots, and messaging apps (WhatsApp, Telegram, Slack, Discord, iMessage, LinkedIn)
should see rich, entity-specific previews when any Patcher link is shared — title, description, and a branded image.

---

### Audit — Current State (2026-02-22)

#### What exists

- `src/index.html` — has `<meta name="description">`, `<title>Patcher.xyz</title>`, favicons. **Zero** OG/Twitter Card
  tags in static HTML.
- `robots.txt` — allows all, points to sitemap.
- `sitemap.xml` — static, hand-written, all `lastmod` dates are 2021/2022, mixes `www.patcher.xyz` and `patcher.xyz`
  (canonical mismatch), only covers `/modules/details/:id` and a few browser pages. No patches, racks, or new modules.
- `SeoAndUtilsService` (`features/backbone/seo-and-utils.service.ts`) — Angular service that updates `<title>`, `og:*`,
  `twitter:*` tags at runtime via `Meta.updateTag()`. Detail pages for modules, patches, and racks each call
  `updateSeo()` with entity-specific data (name, description, keywords, manufacturer, etc.).
- `SeoSocialShareData` model (`models/seo.model.ts`) — interface with title, description, image, url, type, author,
  keywords, published, modified.
- `patcher_seo_hero.png` — generic hero image (1200×630-ish), used as default `og:image` for all pages.
- **No SSR / no Angular Universal / no prerendering.** App is a pure client-side SPA on Vercel.

#### Critical problems

| # | Problem                                  | Impact                                                                                                                         |
|---|------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------|
| 1 | **No SSR → social previews are broken**  | Crawlers (WhatsApp, Telegram, Slack, Discord, Twitter, Facebook, LinkedIn) don't execute JS. They see the bare `index.html` with generic title/description and **no** OG tags. Every shared link looks the same. |
| 2 | No OG/Twitter meta in `index.html`       | Even the generic fallback tags are missing from the static shell. `SeoAndUtilsService` adds them via JS only.                  |
| 3 | Sitemap stale & incomplete               | Dates from 2021/2022; missing patches, racks, info pages; mixes `www` and non-`www` URLs.                                     |
| 4 | No `<link rel="canonical">`               | Duplicate-content risk across `www` vs non-`www`, trailing slashes, etc.                                                       |
| 5 | No structured data (JSON-LD / Schema.org) | Search engines and AI cannot identify entity types (Product, MusicGroup, SoftwareApplication, etc.).                           |
| 6 | No entity-specific OG images             | Even if tags worked, every page falls back to the same generic hero PNG. No "GitHub-style" per-entity preview.                 |
| 7 | No AI-discovery files                    | No `llms.txt`, no `/.well-known/ai-plugin.json` — AI crawlers get nothing structured.                                         |

**Bottom line:** sharing `patcher.xyz/modules/details/72` on any messaging app currently shows the same generic
"Patcher.xyz" card as sharing `patcher.xyz/home`. The dynamic SEO work in `SeoAndUtilsService` is invisible to all
crawlers.

---

### Plan

Recommended approach: **Vercel Edge Middleware** to intercept bot requests and serve a lightweight HTML page with
correct
meta tags, fetching entity data from Supabase at the edge. Regular users still get the SPA unchanged. This avoids an
Angular SSR migration while fully solving the crawler problem.

#### MVP Layer — Bot-aware meta tag injection

**Deliverable:** when a bot/crawler requests any page, it receives a minimal HTML document with correct `og:title`,
`og:description`, `og:image`, `og:url`, `twitter:card`, canonical URL. Human users are unaffected.

Steps:

- [x] **M1 — Add default OG/Twitter meta tags to `index.html`** as a safe fallback (generic site-level).
- [x] **M2 — Create `middleware.ts`** at project root.
  - Detect bot User-Agents (facebookexternalhit, Twitterbot, Slackbot, WhatsApp, TelegramBot, LinkedInBot,
    Discordbot, Googlebot, Bingbot, ChatGPT-User, Applebot, etc.).
  - For bot requests, parse the URL path to determine entity type and ID:
    - `/modules/details/:id` → fetch module from Supabase (`name`, `manufacturer`, `description`, `hp`, `image`).
    - `/patches/details/:id` → fetch patch.
    - `/racks/details/:id` → fetch rack.
    - All other paths → use site defaults.
  - Return a minimal HTML response with `<head>` populated with correct OG, Twitter, canonical, and JSON-LD tags.
  - Include a `<meta http-equiv="refresh">` or `<noscript>` fallback so that if a real user somehow hits this path,
    they are redirected.
  - For non-bot requests, call `next()` to serve the SPA as usual.
- [x] **M3 — Update `vercel.json`** to integrate middleware (no file changes required; root `middleware.ts` is auto-detected by Vercel).
- [x] **M4 — Add fallback OG tags to `index.html`** so that `og:title`, `og:description`, `og:image` exist in the
  static shell (the middleware will override them for bots, but this ensures there's always _something_).
- [ ] **Gate:** share a module link in Telegram/WhatsApp/Slack → verify entity-specific title, description, and image
  show up. Use Facebook Sharing Debugger, Twitter Card Validator.

#### Structural Layer — Dynamic OG images & sitemap

**Deliverable:** each entity gets a branded, auto-generated preview image (like GitHub repo cards). Sitemap becomes
dynamic.

Steps:

- [ ] **S1 — Create OG image API route** (`api/og.ts` or `api/og/[type]/[id].ts`) using `@vercel/og` (Satori).
  - For modules: render module name, manufacturer, HP, panel image thumbnail, tag badges.
  - For patches: render patch name, connection count, module names involved.
  - For racks: render rack name, module count.
  - Fallback: generic Patcher branding.
  - Output: 1200×630 PNG.
- [ ] **S2 — Wire OG image URL into middleware** — bot HTML now uses
  `https://patcher.xyz/api/og/module/72` as `og:image`.
- [ ] **S3 — Dynamic sitemap endpoint** (`api/sitemap.xml.ts`).
  - Query Supabase for all modules, patches, racks.
  - Generate sitemap XML with proper `lastmod` from entity `updated` timestamps.
  - Use consistent `https://patcher.xyz/...` (no `www`).
- [ ] **S4 — Update `robots.txt`** to point to the dynamic sitemap endpoint.
- [ ] **S5 — Add `<link rel="canonical">` injection** in middleware for bots, and dynamically in
  `SeoAndUtilsService` for SPA users.
- [ ] **Gate:** OG image renders correctly for modules, patches, racks. Sitemap validates at
  `google.com/ping?sitemap=...`. Images are ≤ 1 MB and load in < 2s.

#### Polish Layer — Structured data & AI discovery

**Deliverable:** full JSON-LD structured data on every entity page, AI-friendly files, and refined OG image design.

Steps:

- [ ] **P1 — JSON-LD structured data in middleware** for bot responses.
  - Module → Schema.org `Product` with `name`, `brand`, `description`, `image`.
  - Patch → `CreativeWork` with modules as `mentions`.
  - Rack → `ItemList` with contained modules.
  - Home → `WebSite` + `Organization`.
- [ ] **P2 — Add `llms.txt`** at `/llms.txt` (Vercel rewrite or static asset) describing what Patcher is and how
  to navigate its content — aimed at AI crawlers.
- [ ] **P3 — Refine OG image design** — add Patcher logo watermark, consistent typography, color scheme matching
  the app's material theme.
- [ ] **P4 — Add `og:image:width` / `og:image:height`** to speed up preview rendering in messaging apps.
- [ ] **P5 — Cache headers** — set `Cache-Control` on OG images and bot HTML responses for CDN caching.
- [ ] **Gate:** Google Rich Results Test passes for module pages. ChatGPT/Perplexity can describe a specific module
  when given its URL. `llms.txt` is accessible.

---

### Key architectural decisions

- **Edge Middleware over SSR:** avoids touching the Angular build pipeline. The middleware is a standalone TypeScript
  file
  at the Vercel project root. The SPA continues to work exactly as before.
- **Supabase fetch at the edge:** the middleware makes a single lightweight Supabase REST call per bot request. The
  Supabase anon key is public (already used client-side), so no secret management is needed.
- **`@vercel/og` for images:** Satori renders React-like JSX to SVG→PNG at the edge. No headless browser needed. Fast,
  cheap, cacheable.
- **Existing `SeoAndUtilsService` stays:** it continues to handle title/meta for JS-rendered SPA navigation. The
  middleware only serves bots.

---

### Previous Feature: Community Tag Contributions

Users can collectively describe what a module does by voting on tags and proposing new tag→module links.
Tags are a fixed global taxonomy (`tags` table). The community signals which ones apply to each module.

---

## What Is Done

| Macro Step               | What was built                                                                                                  | Gate      |
|--------------------------|-----------------------------------------------------------------------------------------------------------------|-----------|
| MS1 — Backend plumbing   | `DbPaths.user_module_tags`, `get.tagVotesForModule`, `get.myVotes` (cached, no-arg), `add/delete.userModuleTag` | 67/67 ✅   |
| MS2 — TagVoteDataService | `loadVotes$` (preloaded counts), `toggleVote$`, `isLoggedIn$`, optimistic update, auth gate                     | 14/14 ✅   |
| MS3 — Static counts      | `voteCount:user_module_tags(count)` embedded in module join; counts show in chip `Name · N`                     | visual ✅  |
| MS4 — Interactive voting | `mat-chip-option [selected] [disabled]`; click toggles vote; count corrects itself post-auth                    | 357/357 ✅ |
| MS5 — List vs detail     | List shows top 5 chips, no counts; detail shows all chips with counts; both sorted by vote count desc           | 357/357 ✅ |
| MS6 — Visual polish      | `how_to_vote` icon on voted chips; no checkmark; zero-vote chips muted; debounce 150ms                          | 357/357 ✅ |
| MS7 — Tag contribution   | `proposeTag$` + handler; `add.moduleTagLink`; `get.allTags`; `availableTags$`; "Add perspective" UI             | 37/37 ✅   |

**Current state of `supabase.service.ts` methods added:**

- `get.tagVotesForModule(moduleTagIds[])` — public count query
- `get.myVotes()` — `@Cacheable`, busted by `'userModuleTags'`, fetches all own votes at once
- `get.allTags()` — `@Cacheable(longCacheTime)`, returns full `tags` table
- `add.userModuleTag(moduleTagId)` — inserts vote, `cacheBust(['userModuleTags'])`
- `add.moduleTagLink(moduleId, tagId)` — inserts `module_tags` row, `cacheBust(['modules','moduleWithId'])`, returns
  `{id}`
- `delete.userModuleTag(moduleTagId)` — deletes vote, `cacheBust(['userModuleTags'])`

**Key architectural decisions recorded:**

- Vote counts arrive embedded in the module query
- (`voteCount:user_module_tags(count)`) — zero extra HTTP calls
- `get.myVotes()` is a single cached call shared across all module cards on the page
- `TagVoteDataService` corrects count-from-zero after `myVotes` loads (auth timing workaround)

---

## What Remains

### ~~DB-FIX — Fix `user_module_tags` primary key~~ ✅ DONE

**Root cause:** The `user_module_tags_pk` primary key is on `authorid` alone. This limits each user
to exactly one vote row total — voting on a second tag fails with a PK violation.

**Fix (run on Supabase SQL editor):**

```sql
ALTER TABLE public.user_module_tags DROP CONSTRAINT user_module_tags_pk;
ALTER TABLE public.user_module_tags
  ADD CONSTRAINT user_module_tags_pk PRIMARY KEY (authorid, moduletagid);
```

After running: `yarn updateBackendTypes` — `isOneToOne: true` on `authorid` will become `false`.

- [ ] Run SQL above in Supabase
- [ ] Run `yarn updateBackendTypes`
- [ ] **Gate:** `isOneToOne: false` on `user_module_tags.authorid` in `database.types.ts`

---

### ~~MS5 — Separate list view from detail view~~ ✅ DONE

### ~~MS6 — Visual polish on the detail chip~~ ✅ DONE

- `how_to_vote` icon shown inside chip when user has voted; default checkmark hidden via `::ng-deep`
- Zero-vote chips at opacity 0.55, restored to 1.0 on hover or when the user has voted
- `debounceTime(150)` on `toggleVote$` to prevent double-fire on rapid clicks

| MS7 — Tag contribution | `proposeTag$` Subject + handler; `add.moduleTagLink`; `get.allTags`; UI "Add perspective"
panel | ✅ |

**Product goal:** Any module, even one with zero tags, should be completable by the community.
The tag list is fixed (contents of the `tags` table). Users click a tag to say "this module does this".
If that tag→module link doesn't exist yet, clicking creates it AND votes for it in one action.

#### Data model clarification

```
tags            — global taxonomy, fixed, admin-managed
module_tags     — links a tag to a module (currently admin-bootstrapped)
user_module_tags — one vote per user per module_tag link
```

A user "contributing a tag" means: ensure a `module_tags` row exists, then cast a `user_module_tags` vote.
Existing data is NOT changed — bootstrapped links remain. New links are added the same way, by users.

#### DB change required

`module_tags` currently requires service-role INSERT (admin only). To allow community contributions:

- Add RLS policy: `INSERT` allowed for authenticated users (`auth.role() = 'authenticated'`)
- SELECT, UPDATE, DELETE remain as-is
- The `add.module_tags()` method in `supabase.service.ts` is the admin upsert — keep it; add a separate
  user-facing method `add.userModuleTag(moduleId, tagId)` (different from the existing vote method)

Actually rename for clarity:

- `add.userModuleTag(moduleTagId)` → stays as the **vote** method (existing, unchanged)
- NEW: `add.moduleTagLink(moduleId, tagId)` → creates the `module_tags` row, returns `{id: moduleTagId}`

Then the contribution flow = `add.moduleTagLink` followed by `add.userModuleTag(result.id)`.

#### Backend additions

- [ ] Add RLS policy on `module_tags`: INSERT for authenticated users (DB migration — **manual, requires Supabase SQL
  editor**)
- [x] Add `get.allTags()` to `supabase.service.ts` — returns all rows from `tags` table, `@Cacheable`
  (the private `getTags()` already exists — expose it in the `get` namespace)
- [x] Add `add.moduleTagLink(moduleId, tagId)` to `supabase.service.ts`
    - Insert `{moduleid: moduleId, tagid: tagId}` into `module_tags`, `.select('id').single()`
    - `cacheBust(['modules', 'moduleWithId'])` so the next module load shows the new tag
    - Returns `Observable<{id: number}>`
- [x] Update api-surface unit tests
- [x] **Gate:** `yarn test-headless --include="**/__tests__/supabase-service/*.spec.ts"` — 67/67 ✅

#### Service additions in TagVoteDataService

- [x] Add `proposeTag$: Subject<{moduleId: number, tagId: number}>` action
- [x] Handler: `add.moduleTagLink(moduleId, tagId)` → on success → `add.userModuleTag(result.id)`
  → optimistically add the new tag to local state (new entry in `_tagVotes$` with count=1, in `_myVotes$`)
- [x] `loadVotes$` needs to accept new tags dynamically (or the component reloads after contribution)
- [x] **Gate:** unit tests cover propose flow — 37/37 ✅

#### UI on module detail

- [x] Load all tags: `get.allTags()` in `TagVoteDataService`, exposed as `allTags$`
- [x] Compute `availableTags$` = `allTags$` minus tags already on the module (`data.tags.map(t => t.tag.id)`)
- [x] On the detail page, below the existing voted chips:
    - Collapsed by default — show a `+ Add perspective` button
  - Expanded: show chips for each available tag
    - Click → `proposeTag$.next({moduleId: data.id, tagId: tag.id})`
  - After contribution, proposer closes; optimistic update applied to tagVotes$ and myVotes$
- [x] Logged-out users do not see the "Add perspective" section
- [ ] **Gate (manual):** open a module with no tags → click "Add perspective" → pick a tag → it appears in the main
  chip list with count=1 and voted state (requires DB RLS policy to be in place first)

---

## Phase 2 — Entity Flagging (deferred)

Backlogged. Design is in the original spec above in git history. Resume after MS7 ships.

---

## Known Issues / Gotchas

- ~~**`user_module_tags` PK bug:** PK was on `authorid` alone → fixed, now composite `(authorid, moduletagid)`.~~
- `voteCount` in module data is 0 for unauthenticated loads (RLS timing) — service corrects it post-auth for
  the current user's own votes. True aggregate counts across all users require public SELECT on `user_module_tags`
  (a DB-level RLS change, deferred).
- `module_tags` INSERT RLS must be added before MS7 UI can be tested end-to-end.
- `QueryJoins.module_tags` includes `voteCount:user_module_tags(count)` — if RLS changes later,
  this count will automatically become more accurate.
