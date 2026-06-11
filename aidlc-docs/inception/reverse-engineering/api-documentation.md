# API Documentation

## Internal APIs
### SupabaseService
- **Methods/Namespaces**: `GET`, `add`, `update`, `delete`, `storage`, `auth`
- **Purpose**: Central backend access layer

### RoutingService
- **Methods**: route helpers for racks and patches
- **Purpose**: Canonical link generation and navigation

### App-Level Data Services
- **Examples**: patch, rack, module, and comments data services
- **Purpose**: Drive component-specific loading and updates

## Data Models
### Core Entities
- `modules`
- `patches`
- `racks`
- `manufacturers`
- `profiles`
- `comments`
- `tags`

## External APIs
- Supabase auth
- Supabase storage
- Sentry error reporting
