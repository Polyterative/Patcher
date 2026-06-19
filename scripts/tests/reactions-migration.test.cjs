const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const migrationPath = 'supabase/migrations/20260619092800_add_cool_reactions.sql';
const sql = readFileSync(migrationPath, 'utf8');
const normalized = sql.replace(/\s+/g, ' ').toLowerCase();

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
