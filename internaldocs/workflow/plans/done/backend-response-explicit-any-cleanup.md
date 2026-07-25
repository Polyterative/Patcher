<!-- Section: INFRA (independent; pick any time a product task is blocked) -->

# Backend response explicit-any cleanup

## Goal

Replace two local Supabase response `any` casts with concrete row and response types while preserving all current backend-client behavior.

## Layers

### MVP

- [x] Type the admin flag reporter lookup response and module collection validation response.
- [x] Preserve reporter-name enrichment and public-module validation behavior in focused specs.

### Structural

- [x] Re-baseline the explicit-`any` tracker only after focused verification.

### Polish

- [x] Archive this internal-only maintenance slice without a schema, API, or user-interface change.

## Acceptance criteria

- No explicit `any` remains in `admin-flags-data.service.ts` or `supabase-module-collections.ts`.
- Reporter-name fallback and public-only collection validation retain their existing behavior.
- Focused backend specs and `pnpm lint` pass.
- The generated explicit-`any` baseline decreases without adding entries.

## Documentation impact

- Classification: internal-only
- Production visibility: immediate
- Public docs paths: none
- Screenshot targets: none
- Changelog summary: N/A

## Decision log

- 2026-07-25: Selected the next two one-occurrence files from the explicit-any baseline because both have focused tests and can reuse existing generated database rows and `SupabaseSingleResponse` aliases without changing external behavior.
- 2026-07-25: Replaced the admin reporter cast with `SupabaseSingleResponse<Pick<profiles, 'id' | 'username'>>` and the collection result cast with `SupabaseListResponse<Pick<modules, 'id' | 'public'>>`; focused specs passed 26 assertions, the independent reviewer approved with no findings, lint passed with pre-existing warnings only, and the generated baseline fell from 642 to 640.
- 2026-07-25: Archived after the verified implementation checkpoint; no public documentation, schema, RLS, API, or user-interface change was made.
