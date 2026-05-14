# Current Task

## Title
SEO — Manufacturer detail metadata in middleware

## Source
`internaldocs/workflow/TODO.md` → INFRA → ON HOLD: SEO — OG Image Generation (now unblocked: Manufacturer Page Phase 1 shipped commit `72478744`)

## Goal
The SEO middleware handles module/patch/rack detail routes but is unaware of manufacturer detail pages (`/manufacturers/details/:id`). Add manufacturer metadata so bots and social crawlers get correct title, description, og:image (logo if available), canonical URL, and JSON-LD structured data when sharing manufacturer pages — consistent with the existing module/patch/rack pattern.

## Acceptance criteria
(see agent/acceptance-checklist.md)

## Affected files
- `middleware.ts` — add ManufacturerRow, parseDetailRoute manufacturer branch, getManufacturerMetadata, wire in buildMetadata
- `middleware.spec.ts` (if exists) — add manufacturer route tests

## Out of scope
- OG image generation endpoint (`@vercel/og`) — separate piece
- E2E / social preview debugger validation — requires live deployment
- Changing any Supabase schema or RLS

## Risk notes
- Middleware runs as Vercel Edge Function — must stay plain JS/TS, no Node-only APIs
- Manufacturer table has no `description` field — use module count copy as fallback
- `logo` in manufacturers table is a filename, not a URL — must construct via SUPABASE_URL env var same as module panels
