# System Architecture

## System Overview
Angular 21 single-page application with SSR support, routed feature areas, shared UI packages, and a Supabase-backed data layer.

## Component Descriptions
### App Shell
- **Purpose**: Bootstraps the app, shell layout, routing, and global providers
- **Dependencies**: Angular core, Material, backbone features, shared interproject services
- **Type**: Application

### Backbone Features
- **Purpose**: Home page, auth, footer, toolbar, SEO, feedback, alerts
- **Dependencies**: Shared UI, user services, analytics, Sentry integration
- **Type**: Application

### Browser Features
- **Purpose**: Public and authenticated browsing for modules, racks, patches, manufacturers, and info pages
- **Dependencies**: Component modules, shared UI, routing helpers, Supabase-backed data services
- **Type**: Application

### Component Packages
- **Purpose**: Reusable component collections for patch, rack, module, and shared atom behavior
- **Dependencies**: Data services, shared utilities, Material, RxJS
- **Type**: Application

### Backend Layer
- **Purpose**: Supabase client, GET/add/update/delete namespaces, auth, storage, queries, and database table registration
- **Dependencies**: Supabase JS, generated database types, environment config
- **Type**: Application

## Integration Points
- **Database**: Supabase/PostgreSQL
- **Auth**: Supabase auth
- **Storage**: Supabase storage buckets
- **Monitoring**: Sentry
- **Analytics**: PostHog

## Infrastructure Components
- **Deployment model**: Web app with SSR support
- **Build tool**: Angular CLI via pnpm
- **Hosting**: Vercel per README
