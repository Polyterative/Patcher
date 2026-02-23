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

### Audit — Current State (2026-02-23)

#### Critical problems

| # | Problem                                 | Impact                                                                                                                                                                                  |
|---|-----------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 1 | **No SSR → social previews are broken** | Crawlers (WhatsApp, Telegram, Slack, Discord, Twitter, Facebook, LinkedIn) don't execute JS. They see the bare `index.html` with generic title/description and no reliable entity tags. |
| 2 | Sitemap stale & incomplete              | Legacy dates and incomplete route coverage reduce discovery quality.                                                                                                                    |
| 3 | Missing canonical consistency           | Risk of duplicate content between host variants and URL shapes.                                                                                                                         |
| 4 | No structured entity data for crawlers  | Search/AI systems cannot reliably infer module/patch/rack semantics.                                                                                                                    |
| 5 | No dynamic OG image pipeline            | Shared links lack per-entity visuals.                                                                                                                                                   |

---

### Plan

#### MVP Layer — Bot-aware meta tag injection

**Deliverable:** bot/crawler requests receive minimal HTML with correct OG/Twitter/canonical metadata for entity URLs,
while human SPA navigation remains unchanged.

Steps:

- [ ] **Gate:** share a module link in Telegram/WhatsApp/Slack and verify entity-specific title, description, and image.
- [ ] Validate with Facebook Sharing Debugger and Twitter Card Validator.

#### Structural Layer — Dynamic OG images & sitemap

**Deliverable:** each entity gets generated preview images; sitemap is dynamic and canonicalized.

Steps:

- [ ] **S1 — Create OG image API route** (`api/og.ts` or `api/og/[type]/[id].ts`) using `@vercel/og`.
- [ ] **S2 — Wire OG image URLs into middleware** (`og:image` points to generated endpoint).
- [x] **S3 — Add dynamic sitemap endpoint** (`api/sitemap.ts`) with real `lastmod` values.
- [x] **S4 — Update `robots.txt`** to reference dynamic sitemap.
- [x] **S5 — Ensure canonical URL injection** for bot responses and SPA metadata path.
- [ ] **Gate:** OG images render for modules/patches/racks and sitemap validates.

#### Polish Layer — Structured data & AI discovery

**Deliverable:** full JSON-LD coverage, AI-discovery assets, and final metadata polish.

Steps:

- [x] **P1 — Add JSON-LD in middleware** for module (`Product`), patch (`CreativeWork`), rack (`ItemList`), home (
  `WebSite`/`Organization`).
- [x] **P2 — Add `llms.txt`** at `/llms.txt` for AI crawler guidance.
- [ ] **P3 — Refine OG image design** (branding, typography, consistency).
- [x] **P4 — Add `og:image:width` and `og:image:height`** tags.
- [~] **P5 — Add cache headers** for bot HTML and OG image endpoints (bot HTML complete; OG endpoint pending S1).
- [ ] **Gate:** Rich Results validation and AI crawler readability checks pass.

---

### Key architectural decisions

- **Edge Middleware over full SSR** to avoid invasive Angular pipeline migration.
- **Supabase reads at the edge** for entity metadata assembly.
- **`@vercel/og` for image generation** to avoid headless browser overhead.
- **SPA SEO service remains in place** for client navigation metadata.