<!-- Section: PRODUCT — Tier 2 (requires stable public profiles / community trust layer) -->

# Marketplace — Browse, Detail, and Cockpits

## Status

Backlog intake. Priority: HIGH. Product area: marketplace / UX shell.

## User intent

Patcher needs a marketplace experience better than ModularGrid: structured module browsing, clear listing detail pages, and
seller/buyer management areas rather than scattered ad-hoc chat.

## Product / roadmap fit

This is the public and private UI shell for the market layer. It depends on public profiles because buyers must know who
is selling and sellers need a public identity that carries trust signals.

## Current system analysis

- Public profiles are routeable by username and already have privacy states.
- User-area module lists already separate owned / wanted / for-sale filters.
- Design language favors dense, precise, border-driven surfaces over generic SaaS cards and modal-heavy flows.
- Mobile strategy explicitly treats marketplace, price hub, module discovery, and profile pages as mobile-first.

## Future strategy

Build the shell as three coordinated surfaces:

1. Public marketplace browse and listing detail.
2. Seller cockpit for inventory/listing management.
3. Buyer cockpit for inquiries, purchases, and lifecycle status.

This lets listing core, structured offers, messaging, and feedback be implemented in parallel without inventing navigation
each time.

## Goals

- Add a public marketplace route with filterable module listing grid.
- Add listing detail route with module, seller, price, condition, media, shipping, and primary contact action.
- Add `/my/selling` cockpit for seller inventory/status management.
- Add `/my/buying` cockpit for buyer-side deals.
- Add marketplace entry points from public profiles and user-area for-sale modules.

## Non-goals

- No payments.
- No generic social feed.
- No unanchored direct messaging.
- No advanced analytics dashboard in this task.
- No search-ranking optimization beyond functional filters/sorts.

## Assumptions

- Desktop browse uses a persistent filter column; mobile uses a filter bottom sheet / chip strip.
- Seller management should be table-dense on desktop and card-based on mobile.
- Buyer and seller cockpits should be status-driven, not chat-first.

## Dependencies and sequencing

Depends on listing read models from `marketplace-listings-core-and-media.md`. Can be designed and stubbed in parallel with
listing schema work if fake view models are used in tests.

## MVP layer

- [ ] Add marketplace browse route and top-level navigation entry.
- [ ] Add listing card atom with canonical module image, seller, price, condition, shipping scope, and age.
- [ ] Add listing detail route with sticky mobile CTA.
- [ ] Add seller cockpit route with active/draft/paused/closed filters.
- [ ] Add buyer cockpit route with active/completed/cancelled filters.

## Structural layer

- [ ] Wire filters: manufacturer, HP, price, condition, shipping destination, and seller trust threshold.
- [ ] Add public profile "For Sale" section once profile tab structure supports it.
- [ ] Add empty-state seeding prompts for users with `SELLS` modules but no listings.
- [ ] Add shared marketplace route guards for logged-in-only cockpit surfaces.

## Polish layer

- [ ] Add saved filter chips and responsive density tuning.
- [ ] Add compact trust summary chips on cards and detail pages once feedback exists.
- [ ] Add Price Hub reference snippets on listing detail when price data exists.

## UX direction

- Browse desktop: 3-4 column grid, sticky left filter rail, border-hover cards.
- Browse mobile: single-column card stack, horizontal active-filter chips, bottom-sheet filters.
- Listing detail desktop: 60/40 split, media gallery on left, transaction facts and CTA on right.
- Listing detail mobile: gallery, price/condition, seller, description, shipping, sticky CTA.
- Seller cockpit: dense table with inline status chips/dropdowns.
- Buyer cockpit: status rows that open transaction detail or thread, not a generic inbox first.

## File / surface map

- `src/app/app-routing.module.ts`
- `src/app/features/routes/public-profile/`
- `src/app/features/routes/user-area/`
- `src/app/components/module-parts/`
- `src/app/style/tools.scss`
- Future marketplace route folder under `src/app/features/routes/marketplace/`

## Acceptance criteria

- Anonymous users can browse active listings and open listing details.
- Logged-in users can reach buyer/seller cockpits from user-area navigation.
- Mobile browse/detail flows remain usable without hover-only actions.
- Public listing data never exposes saved shipping addresses or private transaction data.

## Validation strategy

- Component tests for filter state and empty states.
- E2E smoke tests for browse -> detail -> contact flow once routes exist.
- Visual validation with Playwright snapshots before UI completion.
- `pnpm lint` and targeted route/component tests.

## Risks and open questions

- Decide whether marketplace browse is public at launch or authenticated until moderation tools exist.
- Decide launch geography/filter defaults.
- Decide if profile "For Sale" tab is visible before feedback/reputation exists.

## Coordinator-loop handoff

Pick this after listing read models are available, or pair with listing core if a single implementation cycle covers public
read UI. Use designer persona for final visual pass before code.

## Decision log

<!-- Append timestamped one-liners as the plan progresses. -->
- 2026-06-18T11:26+02:00 — UX shell split from listing schema so browse/detail/cockpits can progress in parallel with backend planning.
