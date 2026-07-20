const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const migrationPath = 'supabase/migrations/20260619092800_add_cool_reactions.sql';
const sql = readFileSync(migrationPath, 'utf8');
const normalized = sql.replace(/\s+/g, ' ').toLowerCase();
const hardeningMigrationPath = 'supabase/migrations/20260717100644_harden_cool_reaction_rls_functions.sql';
const hardeningSql = readFileSync(hardeningMigrationPath, 'utf8');
const normalizedHardeningSql = hardeningSql.replace(/\s+/g, ' ').toLowerCase();

test('cool reactions migration is additive and narrow', () => {
  assert.match(sql, /create table public\.reactions/i);
  assert.match(sql, /create table public\.reaction_counts/i);
  assert.match(sql, /constraint reactions_supported_entity_type check \(entity_type in \(1, 2\)\)/i);
  assert.match(sql, /constraint reactions_supported_kind check \(kind = 'COOL'\)/i);
  assert.match(sql, /when p_entity_type = 1[\s\S]+from public\.modules m[\s\S]+m\.public = true/i);
  assert.match(sql, /when p_entity_type = 2[\s\S]+from public\.racks r[\s\S]+r\.public = true/i);
  assert.doesNotMatch(normalized, /alter table public\.(modules|racks|patches)\b/);
  assert.doesNotMatch(normalized, /update public\.(modules|racks|patches)\b/);
});

test('cool reactions migration keeps user rows private and counts public-safe', () => {
  assert.match(sql, /alter table public\.reactions enable row level security/i);
  assert.match(sql, /alter table public\.reaction_counts enable row level security/i);
  assert.match(sql, /create policy "reactions_select_own"[\s\S]+using \(auth\.uid\(\) = user_id\)/i);
  assert.match(sql, /create policy "reactions_insert_own_eligible"[\s\S]+public\.is_reaction_entity_eligible\(entity_type, entity_id\)/i);
  assert.match(sql, /create policy "reaction_counts_select_public_eligible"[\s\S]+to anon, authenticated[\s\S]+using \(public\.is_reaction_entity_eligible\(entity_type, entity_id\)\)/i);
});

test('cool reactions trigger is security-definer without dynamic sql', () => {
  assert.match(sql, /create function public\.maintain_reaction_counts\(\)[\s\S]+security definer[\s\S]+set search_path = public/i);
  assert.match(sql, /after insert on public\.reactions/i);
  assert.match(sql, /after delete on public\.reactions/i);
  assert.doesNotMatch(normalized, /execute\s+format\s*\(/);
  assert.doesNotMatch(normalized, /execute\s+['"]/);
});

test('cool reaction hardening keeps eligibility public-safe without security definer exposure', () => {
  assert.match(hardeningSql, /create or replace function public\.is_reaction_entity_eligible/i);
  assert.match(hardeningSql, /security invoker/i);
  assert.match(hardeningSql, /set search_path = public/i);
  assert.match(hardeningSql, /when p_entity_type = 1[\s\S]+from public\.modules m[\s\S]+m\.public = true/i);
  assert.match(hardeningSql, /when p_entity_type = 2[\s\S]+from public\.racks r[\s\S]+r\.public = true/i);
  assert.match(hardeningSql, /when p_entity_type = 3[\s\S]+from public\.patches p[\s\S]+p\.public = true/i);
  assert.doesNotMatch(normalizedHardeningSql, /execute\s+format\s*\(/);
  assert.doesNotMatch(normalizedHardeningSql, /execute\s+['"]/);
});

test('cool reaction hardening restricts trigger execution and optimizes auth RLS calls', () => {
  assert.match(hardeningSql, /revoke execute on function public\.maintain_reaction_counts\(\) from public/i);
  assert.match(hardeningSql, /revoke execute on function public\.maintain_reaction_counts\(\) from anon/i);
  assert.match(hardeningSql, /revoke execute on function public\.maintain_reaction_counts\(\) from authenticated/i);
  assert.match(hardeningSql, /create policy "reactions_select_own"[\s\S]+using \(\(select auth\.uid\(\)\) = user_id\)/i);
  assert.match(hardeningSql, /create policy "reactions_insert_own_eligible"[\s\S]+with check \([\s\S]+\(select auth\.uid\(\)\) = user_id[\s\S]+public\.is_reaction_entity_eligible\(entity_type, entity_id\)/i);
  assert.match(hardeningSql, /create policy "reactions_delete_own"[\s\S]+using \(\(select auth\.uid\(\)\) = user_id\)/i);
  assert.doesNotMatch(normalizedHardeningSql, /alter table public\.(modules|racks|patches)\b/);
  assert.doesNotMatch(normalizedHardeningSql, /update public\./);
  assert.doesNotMatch(normalizedHardeningSql, /delete from public\.(?!reactions\b)/);
});
