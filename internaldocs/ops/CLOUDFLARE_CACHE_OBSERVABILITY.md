# Cloudflare image-proxy cache observability (#156)

Baseline lives in [`cloudflare/image-proxy/README.md`](../../cloudflare/image-proxy/README.md) (§ Cache observability baseline):
proxy `Cache-Control` pair, Supabase-origin short-TTL tell, and dashboard checks.
No routing, TTL, or infrastructure change ships from observability notes.

## Re-check runbook line

When reviewing cache health, compare the Cloudflare `images.patcher.xyz` hit ratio
against Supabase storage egress over the same time window, then record both numbers
with the check date next to the baseline. R2 reassessment stays operator-gated until
the recorded windows show measured savings that justify the migration cost.
