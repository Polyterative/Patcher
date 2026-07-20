const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const migrationPath = 'supabase/migrations/20260717114500_add_shipping_addresses.sql';
const sql = readFileSync(migrationPath, 'utf8');
const normalized = sql.replace(/\s+/g, ' ').toLowerCase();

test('shipping addresses migration creates only private owner-scoped address storage', () => {
  assert.match(sql, /create table if not exists public\.shipping_addresses/i);
  assert.match(sql, /id uuid primary key default extensions\.gen_random_uuid\(\)/i);
  assert.match(sql, /profileid uuid not null references public\.profiles\(id\) on delete cascade/i);
  assert.match(sql, /postal_code text null/i);
  assert.doesNotMatch(normalized, /\bphone\b/);
  assert.doesNotMatch(normalized, /\bupdate public\.(profiles|modules|racks|patches|module_store_listings)\b/);
  assert.doesNotMatch(normalized, /\balter table public\.(profiles|modules|racks|patches|module_store_listings)\b/);
});

test('shipping addresses migration enforces owner-only CRUD RLS for authenticated users', () => {
  assert.match(sql, /alter table public\.shipping_addresses enable row level security/i);
  assert.match(sql, /revoke all on table public\.shipping_addresses from anon, authenticated/i);
  assert.match(sql, /grant select, insert, update, delete on table public\.shipping_addresses to authenticated/i);
  assert.match(sql, /create policy "shipping_addresses_select_own"[\s\S]+to authenticated[\s\S]+using \(\(select auth\.uid\(\)\) = profileid\)/i);
  assert.match(sql, /create policy "shipping_addresses_insert_own"[\s\S]+to authenticated[\s\S]+with check \(\(select auth\.uid\(\)\) = profileid\)/i);
  assert.match(sql, /create policy "shipping_addresses_update_own"[\s\S]+using \(\(select auth\.uid\(\)\) = profileid\)[\s\S]+with check \(\(select auth\.uid\(\)\) = profileid\)/i);
  assert.match(sql, /create policy "shipping_addresses_delete_own"[\s\S]+to authenticated[\s\S]+using \(\(select auth\.uid\(\)\) = profileid\)/i);
  assert.doesNotMatch(normalized, /to anon/);
  assert.doesNotMatch(normalized, /using \(true\)/);
});

test('shipping addresses migration supports safe per-owner default switching', () => {
  assert.match(sql, /create unique index if not exists shipping_addresses_one_default_per_owner_idx[\s\S]+where is_default = true/i);
  assert.match(sql, /create or replace function public\.tg_shipping_addresses_single_default\(\)[\s\S]+set search_path = public/i);
  assert.match(sql, /if new\.is_default is true then[\s\S]+update public\.shipping_addresses[\s\S]+set is_default = false[\s\S]+profileid = new\.profileid[\s\S]+id is distinct from new\.id/i);
  assert.match(sql, /before insert or update on public\.shipping_addresses/i);
  assert.doesNotMatch(normalized, /\bsecurity definer\b/);
  assert.doesNotMatch(normalized, /execute\s+format\s*\(/);
  assert.doesNotMatch(normalized, /execute\s+['"]/);
});
