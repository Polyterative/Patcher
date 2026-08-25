# Architecture

> **Rules for AI agents using this file:**
> 1. **Structural reference only** — layers, service types, file layout, and state strategy.
> 2. **Code patterns belong in the split pattern docs** — do not add code examples here.
> 3. **Enforcement rules → [../AGENTS.md](../AGENTS.md).**

> ⚠️ Architectural patterns are MANDATORY. See [../AGENTS.md](../AGENTS.md) for enforcement rules.

## Stack

- Angular 22 + TypeScript + RxJS
- Angular Material
- Supabase (PostgreSQL + Auth)
- SCSS

## Service Layers

```
Component (Presentation)
    ↓
Data Service (State + Logic)
    ↓
API Service (Backend)
    ↓
Supabase
```

### Data Services (`*-data.service.ts`)

- **Scoped to component**: `@Injectable()` (no `providedIn`)
- Manage BehaviorSubject state
- Handle business logic
- Extend `SubManager`
- Examples: `module-detail-data.service.ts`, `user-login-data.service.ts`

### API Services

- **Root singletons**: `@Injectable({ providedIn: 'root' })`
- Backend calls only
- Examples: `supabase.service.ts`, `user-management.service.ts`

## SubManager

- Shared lifecycle helper used by components and component-scoped services
- Provides `destroy$` for cleanup
- Reactive wiring details live in [patterns/REACTIVE_SERVICES.md](./patterns/REACTIVE_SERVICES.md)

## File Structure

```
src/app/
├── components/          # Feature UI, grouped by category (module-parts, rack-parts, patch-parts, …)
├── features/            # Feature modules
│   ├── backbone/        # Auth, core
│   ├── backend/
│   │   ├── supabase.service.ts    # All backend calls (GET/get/add/update/delete namespaces)
│   │   └── DatabaseStrings.ts     # DbPaths (table names), QueryJoins (select joins) — register new tables here first
│   └── [features]/
├── models/              # TypeScript interfaces
├── shared-interproject/ # Shared utils
└── style/               # Global SCSS
```

```
src/backend/
└── database.types.ts    # Supabase-generated schema types — update when adding new tables
```

## State Management

- BehaviorSubject in data services (no NgRx)
- Observables as `readonly`
- Actions via Subjects
- Components use `async` pipe


## Opaque URL Token Pattern (`public_id` + SECURITY DEFINER RPC)

Used for: racks, patches (any entity that can be privately shared via link).

**Problem solved:** sequential numeric `/racks/details/:id` URLs allow enumeration of private
content. Anyone can iterate IDs and discover private racks.

**Pattern:**

1. **DB column:** `public_id text UNIQUE NOT NULL` — 12-char nanoid-style token, alphabet
   `[A-Za-z0-9_-]` (~71 bits entropy). Generated server-side by a `BEFORE INSERT` trigger using
   `pgcrypto`. Backfill existing rows with the same helper function.

2. **SECURITY DEFINER RPC:** `get_<entity>_by_public_id(token text)` — bypasses RLS so anonymous
   callers with the token can read a private row. Returns the same column shape as the regular
   authenticated read. The 71-bit keyspace makes brute-force infeasible.

3. **Legacy resolver RPC:** `resolve_public_<entity>_legacy_id(p_id int)` — returns `public_id`
   for **public** rows only, NULL for private/missing. Used by redirect components.

4. **Angular routing:**
   - Canonical URL: `/<entities>/:publicId` — routed to the detail component, loads via the
     SECURITY DEFINER RPC.
   - Legacy URL: `/<entities>/details/:id` — routed to `Legacy<Entity>RedirectComponent`:
     - public row → `router.navigate(['/<entities>', publicId], { replaceUrl: true })`
     - private/missing → `router.navigate(['/links/retired'], { replaceUrl: true })`

5. **`RoutingService` helpers:** `linkToRack(rack)` / `linkToPatch(patch)` prefer `public_id`,
   fall back to `/details/:id` so old cached objects without a token still deep-link.

**Re-use this pattern for any new privately-shareable entity.** Migration reference:
`supabase/migrations/20260515112000_add_public_id_to_racks_and_patches.sql`
