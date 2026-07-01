import { createClient } from 'jsr:@supabase/supabase-js@2';
import {
  chooseWooCommerceProduct,
  normalizeWooCommerceStoreApiProduct,
  type NormalizedStoreListingSnapshot,
  type WooCommerceStoreApiProduct,
} from '../_shared/price-hub/woocommerce-store-api.ts';
import {
  assertSnapshotWorkerAuthorized,
  buildFailureUpdate,
  buildWooCommerceStoreApiUrl,
  normalizeErrorMessage,
  parseProbeListingInput,
  readSnapshotLimit,
  readSnapshotWorkerMode,
  SnapshotWorkerInputError,
  type StoreApiListingInput,
} from '../_shared/price-hub/snapshot-worker.ts';

const RUNTIME_BUDGET_MS = 110_000;
const FETCH_TIMEOUT_MS = 12_000;
const ONE_DAY_MS = 86_400_000;

interface StoreRow {
  id: number;
  slug: string;
  name: string;
  base_url: string;
  adapter_kind: string;
  active: boolean;
  price_tracking_enabled: boolean;
  rate_limit_per_day: number;
}

interface ListingRow {
  id: number;
  module_id: number;
  store_id: number;
  product_url: string;
  external_product_id: string | null;
  external_handle: string | null;
  verification_status: string;
  failure_count: number;
  stores: StoreRow;
}

interface ListingResult {
  listingId: number;
  status: 'success' | 'failed' | 'skipped';
  error?: string;
}

Deno.serve(async (request) => {
  const startedAt = Date.now();

  try {
    authorize(request);

    if (readSnapshotWorkerMode(request.url) === 'probe') {
      return await handleProbeRequest(request);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: 'Missing Supabase function environment.' }, 500);
    }

    const limit = readSnapshotLimit(request.url);
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await supabase
      .from('module_store_listings')
      .select(`
        id,
        module_id,
        store_id,
        product_url,
        external_product_id,
        external_handle,
        verification_status,
        failure_count,
        stores!inner(
          id,
          slug,
          name,
          base_url,
          adapter_kind,
          active,
          price_tracking_enabled,
          rate_limit_per_day
        )
      `)
      .eq('active', true)
      .eq('stores.active', true)
      .eq('stores.price_tracking_enabled', true)
      .eq('stores.adapter_kind', 'woocommerce_store_api')
      .lte('next_check_at', new Date().toISOString())
      .order('next_check_at', { ascending: true })
      .limit(limit);

    if (error) {
      throw error;
    }

    const listings = normalizeListingRows(data ?? []);
    const results: ListingResult[] = [];

    for (const listing of listings) {
      if (Date.now() - startedAt > RUNTIME_BUDGET_MS) {
        results.push({ listingId: listing.id, status: 'skipped', error: 'runtime budget reached' });
        break;
      }

      results.push(await processListing(supabase, listing));
    }

    return jsonResponse({ processed: results.length, results });
  } catch (error) {
    return jsonResponse({ error: normalizeErrorMessage(error) }, statusForError(error));
  }
});

async function handleProbeRequest(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    throw new SnapshotWorkerInputError('Probe mode requires POST.');
  }

  const listing = parseProbeListingInput(await readJsonBody(request));
  const { apiUrl, snapshot } = await fetchWooCommerceSnapshot(listing);

  return jsonResponse({
    mode: 'probe',
    wroteToDatabase: false,
    apiUrl,
    snapshot,
  });
}

async function processListing(supabase: ReturnType<typeof createClient>, listing: ListingRow): Promise<ListingResult> {
  const observedAt = new Date().toISOString();

  try {
    const { snapshot } = await fetchWooCommerceSnapshot(listing);

    const { error: insertError } = await supabase
      .from('module_price_snapshots')
      .insert({
        listing_id: listing.id,
        observed_at: observedAt,
        price_amount_minor: snapshot.priceAmountMinor,
        currency: snapshot.currency,
        availability: snapshot.availability,
        source: 'api',
        raw_meta: snapshot.rawMeta,
      });

    if (insertError) {
      throw insertError;
    }

    const { error: updateError } = await supabase
      .from('module_store_listings')
      .update({
        last_checked_at: observedAt,
        last_success_at: observedAt,
        next_check_at: new Date(Date.now() + ONE_DAY_MS).toISOString(),
        failure_count: 0,
        last_error: null,
        verification_status: 'verified',
        updated_at: observedAt,
      })
      .eq('id', listing.id);

    if (updateError) {
      throw updateError;
    }

    return { listingId: listing.id, status: 'success' };
  } catch (error) {
    const errorMessage = normalizeErrorMessage(error);
    try {
      await recordFailure(supabase, listing, observedAt, errorMessage);
    } catch (failureUpdateError) {
      const failureUpdateMessage = normalizeErrorMessage(failureUpdateError);
      return {
        listingId: listing.id,
        status: 'failed',
        error: normalizeErrorMessage(`${errorMessage}; failed to record failure: ${failureUpdateMessage}`),
      };
    }

    return { listingId: listing.id, status: 'failed', error: errorMessage };
  }
}

async function fetchWooCommerceSnapshot(
  listing: StoreApiListingInput,
): Promise<{ apiUrl: string; snapshot: NormalizedStoreListingSnapshot }> {
  const apiUrl = buildWooCommerceStoreApiUrl(listing);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let response: Response;

  try {
    response = await fetch(apiUrl, {
      signal: controller.signal,
      headers: {
        accept: 'application/json',
        'user-agent': 'PatcherPriceHubPilot/0.1 (+https://patcher.xyz)',
      },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(`WooCommerce Store API timed out after ${FETCH_TIMEOUT_MS}ms`);
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error(`WooCommerce Store API returned ${response.status}`);
  }

  const json = await response.json() as WooCommerceStoreApiProduct | WooCommerceStoreApiProduct[];
  const product = Array.isArray(json) ? chooseWooCommerceProduct(json, listing.product_url) : json;

  if (!product) {
    throw new Error('WooCommerce product not found');
  }

  return {
    apiUrl,
    snapshot: normalizeWooCommerceStoreApiProduct(product),
  };
}

async function recordFailure(
  supabase: ReturnType<typeof createClient>,
  listing: ListingRow,
  checkedAt: string,
  errorMessage: string,
): Promise<void> {
  const { error: updateError } = await supabase
    .from('module_store_listings')
    .update(buildFailureUpdate(listing, checkedAt, errorMessage))
    .eq('id', listing.id);

  if (updateError) {
    throw updateError;
  }
}

function normalizeListingRows(rows: unknown[]): ListingRow[] {
  return rows.flatMap((row) => {
    const maybeRow = row as ListingRow & { stores: StoreRow | StoreRow[] };
    const store = Array.isArray(maybeRow.stores) ? maybeRow.stores[0] : maybeRow.stores;
    return store ? [{ ...maybeRow, stores: store }] : [];
  });
}

function authorize(request: Request): void {
  assertSnapshotWorkerAuthorized(Deno.env.get('PRICE_HUB_SNAPSHOT_TOKEN'), request.headers.get('authorization'));
}

async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new SnapshotWorkerInputError('Probe body must be valid JSON.');
  }
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function statusForError(error: unknown): number {
  return error instanceof SnapshotWorkerInputError ? 400 : 500;
}
