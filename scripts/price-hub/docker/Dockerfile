# Price Hub scheduled refresh runner for the self-host NAS (see scripts/ops/price-hub-refresh-nas.sh).
# Build context is assembled by `price-hub-refresh-nas.sh --install`: this directory's files plus
# scripts/price-hub and supabase/functions/_shared/price-hub. Only the runtime dependency is installed.
FROM node:24-trixie-slim
LABEL org.patcher.component=price-hub
# curl >= 8.2 (--ca-native): the Shopify crawler fetches through it (crawlers/shopify.ts)
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund && npm cache clean --force
COPY scripts/price-hub scripts/price-hub
COPY supabase/functions/_shared/price-hub supabase/functions/_shared/price-hub
USER node
ENV NODE_OPTIONS=--max-old-space-size=8192
ENTRYPOINT ["node", "--disable-warning=ExperimentalWarning", "scripts/price-hub/scheduled-refresh.ts"]
