# Code Structure

## Build System
- **Type**: npm-style monorepo workspace via pnpm
- **Primary Framework**: Angular 21
- **SSR**: Supported

## Major Source Areas
- `src/app/app.module.ts` - application root module and global providers
- `src/app/app.component.ts` - shell component and viewport/layout coordination
- `src/app/app-routing.module.ts` - top-level route map
- `src/app/features/backbone/` - home, auth, footer, toolbar, SEO, feedback, shared shell
- `src/app/features/backend/` - Supabase client and admin backend wiring
- `src/app/features/*browser*/` - feature browsers for modules, patches, racks, manufacturers, info pages
- `src/app/components/` - reusable patch, rack, module, and shared atom components
- `src/app/shared-interproject/` - cross-cutting services, utilities, and shared UI
- `src/backend/database.types.ts` - generated Supabase types

## Design Patterns
- Component-scoped data services for feature state
- Root Supabase service with namespace composition
- Lazy-loaded feature modules and routes
- Shared shell plus reusable visual atoms

## Critical Dependencies
- Angular Material
- Supabase JS
- RxJS
- Luxon / timeago utilities
- Sentry SDK
