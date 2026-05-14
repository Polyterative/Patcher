# Acceptance Checklist

## SEO — Manufacturer detail metadata in middleware

- [x] `/manufacturers/details/:id` is parsed by `parseDetailRoute`
- [x] `getManufacturerMetadata` queries `manufacturers` table with `id, name, logo, websiteURL`
- [x] Title: `{name} | Patcher.xyz`
- [x] Description: manufacturer name + module count fallback copy
- [x] og:image: logo URL if logo present, else default site image
- [x] JSON-LD: `Organization` type with `name`, `url`, `logo`, `@id` set to canonical URL
- [x] Falls back to `site` default metadata when manufacturer not found (no key, not found, fetch error)
- [x] Middleware unit tests pass (13/13, including 3 new manufacturer tests)
- [x] Angular suite green (2372/2372)
- [x] No TypeScript errors
