# Patcher Image Proxy Worker

Cloudflare Worker in front of Supabase Storage public image buckets at `images.patcher.xyz`.

## Bucket allowlist

`DEFAULT_ALLOWED_BUCKETS` in [`src/index.ts`](./src/index.ts) and `ALLOWED_BUCKETS` in
[`wrangler.jsonc`](./wrangler.jsonc) must stay in parity. Both currently allow:

```text
module-panels, racks, manufacturer-logos, module-collections, patches, marketplace-listings
```

`marketplace-listings` parity was restored in `4f573657`; `99b31a98` locks it with a test.
Do not change routing or TTLs without operator review.

## Cache observability baseline (#156)

Current proxy response headers for 2xx (`imageProxyCacheHeaders`):

```text
Cache-Control: public, max-age=604800, s-maxage=2592000
```

- Browser TTL: `604800` s (7 days, `BROWSER_CACHE_TTL_SECONDS`).
- Edge TTL: `2592000` s (30 days, `EDGE_CACHE_TTL_SECONDS`, also used as `cf.cacheTtl`).
- 404/410: `public, max-age=300`. 5xx and non-image origins: `no-store` / `502`.

Direct Supabase Storage origin serves a shorter baseline (`Cache-Control: max-age=3600`)
and reports `cf-cache-status: HIT` on repeat reads — that HIT reflects Supabase's own
Cloudflare fronting, not the proxy edge cache. Proxy-served responses carry the longer
`max-age`/`s-maxage` pair above, which is how to tell the two apart.

Operator checks (dashboards only, no credentials in repo):

- Cloudflare dashboard for `images.patcher.xyz`: cache hit ratio and origin egress.
- Supabase dashboard: storage egress/bandwidth for the same period.

R2 reassessment stays operator-gated until dashboards show measured savings that justify
the migration cost. No routing, TTL, or infrastructure change ships from this note.
