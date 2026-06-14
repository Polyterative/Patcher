# Acceptance Checklist

## feat(module-collections): Creation/discovery analytics

- [x] Collection creation analytics includes created collection id when the backend returns it.
- [x] Public collection browser captures search/order filter changes without raw search text.
- [x] Public collection browser captures first-page search results with order/count metadata.
- [x] Public collection browser captures reset and load-more interactions.
- [x] Public collection card/list/root wiring captures collection click/open interactions.
- [x] Focused specs cover creation analytics and browser discovery events.
- [x] `pnpm test-headless --include="**/module-collections-browser-data.service.spec.ts" --include="**/module-collections-data.service.spec.ts"` passes.
- [x] `pnpm build` passes.
- [x] `pnpm lint` passes.
