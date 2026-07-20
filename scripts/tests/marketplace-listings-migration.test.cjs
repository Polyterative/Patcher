const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const migrationPath = 'supabase/migrations/20260717133940_add_marketplace_listings_core_media.sql';
const sql = readFileSync(migrationPath, 'utf8');
const normalized = sql.replace(/\s+/g, ' ').toLowerCase();
const reconciliationPath = 'supabase/migrations/20260717134851_reconcile_marketplace_listing_policies.sql';
const reconciliationSql = readFileSync(reconciliationPath, 'utf8');
const mediaHardeningPath = 'supabase/migrations/20260717135944_harden_marketplace_listing_media_writes.sql';
const mediaHardeningSql = readFileSync(mediaHardeningPath, 'utf8');
const storageDeleteCleanupPath = 'supabase/migrations/20260717140921_remove_marketplace_direct_storage_delete.sql';
const storageDeleteCleanupSql = readFileSync(storageDeleteCleanupPath, 'utf8');

test('marketplace listings migration is additive and preserves existing rows', () => {
  assert.match(sql, /create table if not exists public\.marketplace_listings/i);
  assert.match(sql, /create table if not exists public\.listing_media/i);
  assert.match(sql, /seller_profileid uuid not null references public\.profiles\(id\) on delete cascade/i);
  assert.match(sql, /moduleid bigint not null references public\.modules\(id\)/i);
  assert.match(sql, /public_id text not null default public\.generate_public_id\(\)/i);
  assert.doesNotMatch(normalized, /\bupdate public\.(profiles|modules|racks|patches|user_modules|shipping_addresses)\b/);
  assert.doesNotMatch(normalized, /\bdelete from public\.(profiles|modules|racks|patches|user_modules|shipping_addresses)\b/);
  assert.doesNotMatch(normalized, /\balter table public\.(profiles|modules|racks|patches|user_modules|shipping_addresses)\b/);
});

test('marketplace listings migration enforces approved MVP constraints', () => {
  assert.match(sql, /condition in \('new', 'excellent', 'good', 'fair', 'for_parts'\)/i);
  assert.match(sql, /status in \('draft', 'active', 'paused', 'reserved', 'closed_sold', 'closed_unsold', 'expired'\)/i);
  assert.match(sql, /marketplace_listings_one_active_per_seller_module_idx[\s\S]+where status = 'active'/i);
  assert.match(sql, /shipping_options text\[\] not null default '\{\}'::text\[\]/i);
  assert.match(sql, /shipping_notes text null/i);
  assert.match(sql, /asking_price_amount_minor bigint not null/i);
});

test('marketplace listing RLS is public-safe, non-recursive, and owner-scoped', () => {
  assert.match(sql, /alter table public\.marketplace_listings enable row level security/i);
  assert.match(sql, /alter table public\.listing_media enable row level security/i);
  assert.match(sql, /private\.is_marketplace_listing_public_safe[\s\S]+security definer[\s\S]+set search_path = pg_catalog/i);
  assert.match(sql, /ml\.status in \('active', 'reserved'\)[\s\S]+p\.public = true/i);
  assert.doesNotMatch(sql, /m\.public = true/i);
  assert.match(sql, /marketplace_listings_insert_own_sellable[\s\S]+\(select auth\.uid\(\)\) = seller_profileid[\s\S]+private\.is_marketplace_listing_sellable_by_owner/i);
  assert.match(sql, /um\.kind = 'SELLS'/i);
  assert.match(sql, /listing_media_select_public_active_parent_anon[\s\S]+private\.is_marketplace_listing_public_safe\(listing_id\)/i);
  assert.match(sql, /revoke all on function private\.is_marketplace_listing_public_safe\(uuid\)/i);
});

test('marketplace listing media and private storage use owner-safe image paths', () => {
  assert.match(sql, /constraint listing_media_kind_image_only check \(kind = 'image'\)/i);
  assert.match(sql, /mime_type in \('image\/jpeg', 'image\/png', 'image\/webp'\)/i);
  assert.match(sql, /position >= 0 and position < 8/i);
  assert.match(sql, /listing_media_listing_position_uniq[\s\S]+unique \(listing_id, position\)[\s\S]+deferrable initially immediate/i);
  assert.match(sql, /pg_advisory_xact_lock\(pg_catalog\.hashtextextended\(new\.listing_id::text, 0\)\)/i);
  assert.match(sql, /'marketplace-listings'[\s\S]+false[\s\S]+10485760[\s\S]+array\['image\/jpeg', 'image\/png', 'image\/webp'\]/i);
  assert.match(sql, /marketplace_listing_images_insert_owner_path[\s\S]+lower\(storage\.extension\(name\)\) in \('jpg', 'jpeg', 'png', 'webp'\)/i);
  assert.match(sql, /ml\.id::text = split_part\(name, '\/', 2\)/i);
  assert.doesNotMatch(normalized, /for insert\s+to anon/);
  assert.doesNotMatch(normalized, /using \(true\)/);
  assert.doesNotMatch(normalized, /delete from storage\.objects/);
});

test('marketplace listing media reorder is atomic and narrow', () => {
  assert.match(sql, /create or replace function public\.reorder_listing_media\([\s\S]+p_listing_id uuid,[\s\S]+p_media_ids uuid\[\]/i);
  assert.match(sql, /cardinality\(p_media_ids\) > 8/i);
  assert.match(sql, /v_current_count <> cardinality\(p_media_ids\)/i);
  assert.match(sql, /set constraints listing_media_listing_position_uniq deferred/i);
  assert.match(sql, /update public\.listing_media lm[\s\S]+set position = ordered\.ordinal - 1/i);
  assert.match(sql, /grant execute on function public\.reorder_listing_media\(uuid, uuid\[\]\) to authenticated/i);
  assert.doesNotMatch(normalized, /execute\s+format\s*\(/);
  assert.doesNotMatch(normalized, /execute\s+['"]/);
});

test('marketplace policy reconciliation removes only duplicate marketplace exposure', () => {
  assert.match(reconciliationSql, /create or replace function private\.is_marketplace_listing_public_safe/i);
  assert.match(reconciliationSql, /ml\.status in \('active', 'reserved'\)[\s\S]+p\.public = true/i);
  assert.match(reconciliationSql, /marketplace_listings_select_public_active_anon[\s\S]+to anon/i);
  assert.match(reconciliationSql, /marketplace_listings_select_public_or_own_authenticated[\s\S]+to authenticated/i);
  assert.match(reconciliationSql, /marketplace_listing_images_select_public_active_parent_anon[\s\S]+to anon/i);
  assert.match(reconciliationSql, /marketplace_listing_images_select_public_or_owner_authenticated[\s\S]+to authenticated/i);
  assert.match(reconciliationSql, /drop function if exists public\.is_marketplace_listing_public_safe\(uuid\)/i);
  assert.match(reconciliationSql, /drop index if exists public\.marketplace_listings_public_active_idx/i);
  assert.doesNotMatch(reconciliationSql, /modules_update/i);
  assert.doesNotMatch(reconciliationSql, /alter table public\.modules/i);
});

test('marketplace media mutations retain SELLS authorization and serialize reorder writes', () => {
  assert.match(mediaHardeningSql, /pg_advisory_xact_lock[\s\S]+hashtextextended\(p_listing_id::text, 0\)/i);
  assert.match(mediaHardeningSql, /from public\.listing_media lm[\s\S]+where lm\.listing_id = p_listing_id[\s\S]+for update/i);
  assert.match(mediaHardeningSql, /reorder_listing_media[\s\S]+private\.is_marketplace_listing_sellable_by_owner\(v_owner, v_module_id\)/i);
  assert.match(mediaHardeningSql, /listing_media_insert_own_parent[\s\S]+private\.is_marketplace_listing_sellable_by_owner\(ml\.seller_profileid, ml\.moduleid\)/i);
  assert.match(mediaHardeningSql, /listing_media_update_own_parent[\s\S]+private\.is_marketplace_listing_sellable_by_owner\(ml\.seller_profileid, ml\.moduleid\)/i);
  assert.match(mediaHardeningSql, /marketplace_listing_images_insert_owner_path[\s\S]+private\.is_marketplace_listing_sellable_by_owner\(ml\.seller_profileid, ml\.moduleid\)/i);
  assert.match(mediaHardeningSql, /marketplace_listing_images_update_owner_path[\s\S]+private\.is_marketplace_listing_sellable_by_owner\(ml\.seller_profileid, ml\.moduleid\)/i);
  assert.doesNotMatch(mediaHardeningSql, /drop policy if exists "listing_media_delete_own_parent"/i);
  assert.doesNotMatch(mediaHardeningSql, /drop policy if exists "marketplace_listing_images_delete_owner_path"/i);
  assert.doesNotMatch(mediaHardeningSql, /public\.modules/i);
});

test('marketplace migration history includes remote refinements and removes direct storage metadata deletion', () => {
  for (const path of [
    'supabase/migrations/20260717133526_add_marketplace_listings_core_media.sql',
    'supabase/migrations/20260717133705_refine_marketplace_listing_select_policies.sql',
    'supabase/migrations/20260717134455_harden_listing_media_limit_locking.sql',
    'supabase/migrations/20260717134637_clean_marketplace_listing_policy_drift.sql'
  ]) {
    assert.doesNotThrow(() => readFileSync(path, 'utf8'));
  }

  assert.match(storageDeleteCleanupSql, /drop trigger if exists trg_listing_media_delete_storage_object on public\.listing_media/i);
  assert.match(storageDeleteCleanupSql, /drop function if exists public\.tg_listing_media_delete_storage_object\(\)/i);
  assert.doesNotMatch(storageDeleteCleanupSql, /delete from storage\.objects/i);
});
