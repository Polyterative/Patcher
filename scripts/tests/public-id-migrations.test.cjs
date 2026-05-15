const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const migrationFiles = [
  'supabase/migrations/20260515112000_add_public_id_to_racks_and_patches.sql',
  'supabase/migrations/20260515125800_fix_generate_public_id_pgcrypto_schema.sql',
  'supabase/migrations/20260515130200_harden_generate_public_id_search_path.sql',
  'supabase/migrations/20260515130400_make_public_id_helpers_security_definer.sql',
  'supabase/migrations/20260515130500_harden_public_id_trigger_search_path.sql',
  'supabase/migrations/20260515130700_revoke_public_id_helper_execute.sql'
];

function readMigration(filePath) {
  return fs.readFileSync(path.resolve(process.cwd(), filePath), 'utf8');
}

function normalizeSql(sql) {
  return sql.toLowerCase().replace(/\s+/g, ' ').trim();
}

function helperDefinitions(helperName) {
  const definitions = [];
  const definitionPattern = new RegExp(
    String.raw`create\s+or\s+replace\s+function\s+public\.${helperName}\s*\([^)]*\)[\s\S]*?\$\$;`,
    'gi'
  );

  for (const filePath of migrationFiles) {
    const sql = readMigration(filePath);
    for (const match of sql.matchAll(definitionPattern)) {
      definitions.push({
        filePath,
        sql: match[0]
      });
    }
  }

  return definitions;
}

test('public_id migrations schema-qualify pgcrypto randomness', () => {
  const calls = [];

  for (const filePath of migrationFiles) {
    const sql = readMigration(filePath);

    assert.doesNotMatch(
      sql,
      /(?<!extensions\.)\bgen_random_bytes\s*\(/i,
      `${filePath} must call extensions.gen_random_bytes(...)`
    );

    for (const match of sql.matchAll(/\b(?:[a-z_][a-z0-9_]*\.)?gen_random_bytes\s*\(/gi)) {
      calls.push({filePath, call: match[0]});
    }
  }

  assert.ok(calls.length > 0, 'public_id migrations must continue using pgcrypto randomness');
  for (const {filePath, call} of calls) {
    assert.match(
      call,
      /^extensions\.gen_random_bytes\s*\(/i,
      `${filePath} must schema-qualify ${call} as extensions.gen_random_bytes(...)`
    );
  }
});

test('public_id base migration creates pgcrypto in extensions schema', () => {
  const baseMigration = normalizeSql(
    readMigration('supabase/migrations/20260515112000_add_public_id_to_racks_and_patches.sql')
  );

  assert.match(
    baseMigration,
    /\bcreate extension if not exists pgcrypto with schema extensions\b/,
    'base public_id migration must install pgcrypto in the extensions schema'
  );
});

test('generate_public_id definitions remain security definer with pinned search path', () => {
  const definitions = helperDefinitions('generate_public_id');

  assert.ok(definitions.length > 0, 'generate_public_id must be defined in public_id migrations');
  for (const {filePath, sql} of definitions) {
    const normalized = normalizeSql(sql);

    assert.match(normalized, /\bsecurity definer\b/, `${filePath} must keep generate_public_id as SECURITY DEFINER`);
    assert.match(
      normalized,
      /\bset search_path = pg_catalog\b/,
      `${filePath} must pin generate_public_id search_path to pg_catalog`
    );
  }
});

test('tg_set_public_id definitions remain security definer with pinned search path', () => {
  const definitions = helperDefinitions('tg_set_public_id');

  assert.ok(definitions.length > 0, 'tg_set_public_id must be defined in public_id migrations');
  for (const {filePath, sql} of definitions) {
    const normalized = normalizeSql(sql);

    assert.match(normalized, /\bsecurity definer\b/, `${filePath} must keep tg_set_public_id as SECURITY DEFINER`);
    assert.match(
      normalized,
      /\bset search_path = pg_catalog\b/,
      `${filePath} must pin tg_set_public_id search_path to pg_catalog`
    );
  }
});

test('public_id helper execute grants are revoked from API roles', () => {
  const revokeMigration = normalizeSql(
    readMigration('supabase/migrations/20260515130700_revoke_public_id_helper_execute.sql')
  );

  assert.match(
    revokeMigration,
    /\brevoke execute on function public\.generate_public_id\(int\) from public, anon, authenticated\b/,
    'revoke migration must revoke generate_public_id(int) from public, anon, and authenticated'
  );
  assert.match(
    revokeMigration,
    /\brevoke execute on function public\.tg_set_public_id\(\) from public, anon, authenticated\b/,
    'revoke migration must revoke tg_set_public_id() from public, anon, and authenticated'
  );
});
