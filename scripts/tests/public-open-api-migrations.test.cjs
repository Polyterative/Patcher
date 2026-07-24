const { readdirSync, readFileSync } = require('node:fs');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const migrationDir = 'supabase/migrations';
const rolePath = `${migrationDir}/20260724133100_api_reader_roles.sql`;
const identityPath = `${migrationDir}/20260724133200_api_identity.sql`;
const viewsPath = `${migrationDir}/20260724133300_api_v1_views.sql`;
const roleSql = readFileSync(rolePath, 'utf8');
const identitySql = readFileSync(identityPath, 'utf8');
const viewsSql = readFileSync(viewsPath, 'utf8');
const combinedSql = `${roleSql}\n${identitySql}\n${viewsSql}`;
const normalize = (sql) => sql.replace(/\s+/g, ' ').toLowerCase();
const viewDefinition = (view) => {
  const pattern = new RegExp(`create or replace view public\\.${view}[\\s\\S]+?;`, 'i');
  const match = viewsSql.match(pattern);
  assert.ok(match, `missing ${view} definition`);
  return match[0];
};
const selectList = (definition) => {
  const match = definition.match(/\bas\s+select([\s\S]+?)\bfrom\b/i);
  assert.ok(match, 'missing select list');
  return match[1];
};
const roleNorm = normalize(roleSql);
const identityNorm = normalize(identitySql);
const viewsNorm = normalize(viewsSql);
const allNorm = normalize(combinedSql);

test('public open api migrations exist in the approved role, identity, view order', () => {
  const publicApiMigrations = readdirSync(migrationDir)
    .filter((name) => /api_(reader_roles|identity|v1_views)\.sql$/.test(name))
    .sort();

  assert.deepEqual(publicApiMigrations, [
    '20260724133100_api_reader_roles.sql',
    '20260724133200_api_identity.sql',
    '20260724133300_api_v1_views.sql',
  ]);
});

test('role migration creates only credential-free NOLOGIN roles with schema usage', () => {
  assert.match(roleSql, /create role api_view_owner nologin/i);
  assert.match(roleSql, /create role api_reader nologin/i);
  assert.match(roleSql, /alter role api_view_owner nologin/i);
  assert.match(roleSql, /alter role api_reader nologin/i);
  assert.match(roleSql, /grant usage on schema public to api_view_owner/i);
  assert.match(roleSql, /grant usage on schema public to api_reader/i);
  assert.doesNotMatch(roleNorm, /\bpassword\b/);
  assert.doesNotMatch(roleNorm, /\blogin\b/);
  assert.doesNotMatch(roleNorm, /\bcreate user\b/);
});

test('identity migration creates tiers, keys, usage tables and seeds approved quotas', () => {
  assert.match(identitySql, /create table if not exists public\.api_tiers/i);
  assert.match(identitySql, /code text primary key/i);
  assert.match(identitySql, /code ~ '\^\[a-z_\]\+\$'/i);
  assert.match(identitySql, /\('free', 5000, 60,/i);
  assert.match(identitySql, /\('partner', 500000, 600,/i);
  assert.match(identitySql, /on conflict \(code\) do nothing/i);
  assert.doesNotMatch(identitySql, /on conflict \(code\) do update/i);
  assert.match(identitySql, /create table if not exists public\.api_keys/i);
  assert.match(identitySql, /profile_id uuid not null references public\.profiles\(id\) on delete cascade/i);
  assert.match(identitySql, /key_hash bytea not null/i);
  assert.match(identitySql, /create unique index if not exists api_keys_key_hash_uniq/i);
  assert.match(identitySql, /api_keys_active_profile_idx[\s\S]+where revoked_at is null/i);
  assert.match(identitySql, /create table if not exists public\.api_key_usage_monthly/i);
  assert.match(identitySql, /primary key \(key_id, month\)/i);
  assert.match(identitySql, /api_key_usage_monthly_month_first_check check \(month = date_trunc\('month', month\)::date\)/i);
  assert.doesNotMatch(identityNorm, /\bupdate public\.(profiles|modules|manufacturers|racks|patches)\b/);
});

test('identity RLS exposes owner and JWT-admin SELECT only, with no direct authenticated mutations', () => {
  assert.match(identitySql, /alter table public\.api_keys enable row level security/i);
  assert.match(identitySql, /alter table public\.api_key_usage_monthly enable row level security/i);
  assert.match(identitySql, /revoke all on table public\.api_keys from anon, authenticated, api_reader/i);
  assert.match(identitySql, /revoke all on table public\.api_key_usage_monthly from anon, authenticated, api_reader/i);
  assert.match(identitySql, /grant select on table public\.api_keys to authenticated/i);
  assert.match(identitySql, /grant select on table public\.api_key_usage_monthly to authenticated/i);
  assert.match(identitySql, /create policy "api_keys_select_own"[\s\S]+for select[\s\S]+to authenticated[\s\S]+using \(profile_id = auth\.uid\(\)\)/i);
  assert.match(identitySql, /create policy "api_keys_select_admin"[\s\S]+coalesce\(auth\.jwt\(\) -> 'app_metadata' ->> 'role', ''\) = 'admin'/i);
  assert.match(identitySql, /create policy "api_key_usage_monthly_select_own"[\s\S]+exists \([\s\S]+from public\.api_keys k[\s\S]+k\.profile_id = auth\.uid\(\)/i);
  assert.doesNotMatch(identityNorm, /grant (insert|update|delete|all).*api_keys to authenticated/);
  assert.doesNotMatch(identityNorm, /grant (insert|update|delete|all).*api_key_usage_monthly to authenticated/);
});

test('api key RPCs use security definer, fixed search paths, Vault read-only pepper, and strict grants', () => {
  for (const signature of [
    'private.mint_api_key(uuid, text, text)',
    'public.create_api_key(text)',
    'public.create_partner_api_key(uuid, text)',
    'public.revoke_api_key(uuid)',
    'public.verify_api_key(bytea)',
    'public.record_api_key_usage(uuid, date, integer)',
  ]) {
    assert.match(identitySql, new RegExp(`revoke all on function ${signature.replace(/[().]/g, '\\$&')} from public, anon, authenticated`, 'i'));
  }

  assert.match(identitySql, /security definer[\s\S]+set search_path = pg_catalog, public, extensions, vault/i);
  assert.match(identitySql, /from vault\.decrypted_secrets ds[\s\S]+where ds\.name = 'api_key_pepper'/i);
  assert.match(identitySql, /v_secret_count = 0[\s\S]+api_key_pepper is missing/i);
  assert.match(identitySql, /v_secret_count > 1[\s\S]+api_key_pepper is duplicated/i);
  assert.match(identitySql, /decode\(v_pepper_text, 'base64'\)/i);
  assert.match(identitySql, /octet_length\(v_pepper_bytes\) <> 32/i);
  assert.match(identitySql, /extensions\.gen_random_bytes\(16\)/i);
  assert.match(identitySql, /'pk_live_' \|\| v_suffix/i);
  assert.match(identitySql, /length\(v_suffix\) <> 22/i);
  assert.match(identitySql, /extensions\.hmac\(v_raw_bytes, v_pepper_bytes, 'sha256'\)/i);
  assert.match(identitySql, /raise exception 'authentication is required to create an API key' using errcode = '28000'/i);
  assert.match(identitySql, /coalesce\(auth\.role\(\), ''\) in \('anon', 'authenticated'\)[\s\S]+errcode = '42501'/i);
  assert.match(identitySql, /grant execute on function public\.create_api_key\(text\) to authenticated/i);
  assert.match(identitySql, /grant execute on function public\.create_partner_api_key\(uuid, text\) to service_role/i);
  assert.match(identitySql, /grant execute on function public\.verify_api_key\(bytea\) to api_reader/i);
  assert.match(identitySql, /grant execute on function public\.record_api_key_usage\(uuid, date, integer\) to api_reader/i);
  assert.match(identitySql, /auth\.uid\(\) is null[\s\S]+authentication is required to revoke an API key/i);
  assert.doesNotMatch(identityNorm, /vault\.create_secret|insert into vault\.|api_key_pepper[^;]+values/i);
});

test('verification and usage RPCs enforce active keys, effective limits, and monotonic monthly accounting', () => {
  assert.match(identitySql, /where k\.key_hash = p_hash[\s\S]+and k\.revoked_at is null/i);
  assert.match(identitySql, /coalesce\(k\.monthly_quota_override, t\.monthly_quota\) as monthly_quota/i);
  assert.match(identitySql, /coalesce\(k\.per_minute_quota_override, t\.per_minute_quota\) as per_minute_quota/i);
  assert.match(identitySql, /p_used is null or p_used < 0/i);
  assert.match(identitySql, /p_month is null or p_month <> date_trunc\('month', p_month\)::date/i);
  assert.match(identitySql, /on conflict \(key_id, month\) do update[\s\S]+used = greatest\(excluded\.used, public\.api_key_usage_monthly\.used\)/i);
});

test('view migration grants api_view_owner narrow base columns and api_reader no base tables', () => {
  assert.match(viewsSql, /revoke all on table[\s\S]+public\.modules,[\s\S]+public\.module_panels[\s\S]+from api_reader/i);
  assert.match(viewsSql, /revoke all on table[\s\S]+public\.modules,[\s\S]+public\.module_panels[\s\S]+from api_view_owner/i);
  assert.match(viewsSql, /grant select \([\s\S]+"manufacturerId"[\s\S]+"public"[\s\S]+"isApproved"[\s\S]+submitter[\s\S]+\) on table public\.modules to api_view_owner/i);
  assert.match(viewsSql, /grant select \(id, moduleid, color, description, "isApproved"\) on table public\.module_panels to api_view_owner/i);
  assert.match(viewsSql, /grant select on table[\s\S]+public\.api_v1_modules,[\s\S]+public\.api_v1_module_panels[\s\S]+to api_reader/i);
  assert.doesNotMatch(viewsNorm, /grant select(?:\s|\([^)]*\))*on table public\.(modules|manufacturers|standards|tags|module_ins|module_outs|module_tags|module_panels) to api_reader/);
});

test('view migration adds only approved RLS policies and no ancillary RLS enabling', () => {
  assert.match(viewsSql, /create policy "api_view_owner_select_publishable_modules"[\s\S]+as permissive[\s\S]+for select[\s\S]+to api_view_owner[\s\S]+using \("public" and "isApproved" and submitter is not null\)/i);
  assert.match(viewsSql, /create policy "api_view_owner_select_publishable_manufacturers"[\s\S]+as permissive[\s\S]+exists \([\s\S]+m\."manufacturerId" = manufacturers\.id[\s\S]+m\."public"[\s\S]+m\."isApproved"[\s\S]+m\.submitter is not null/i);
  for (const table of ['standards', 'tags', 'module_ins', 'module_outs', 'module_tags', 'module_panels']) {
    assert.doesNotMatch(viewsNorm, new RegExp(`alter table public\\.${table} enable row level security`, 'i'));
  }
});

test('api v1 views use actual identifiers, approved predicates, security barriers, owners, and comments', () => {
  for (const view of [
    'api_v1_modules',
    'api_v1_manufacturers',
    'api_v1_standards',
    'api_v1_tags',
    'api_v1_module_ins',
    'api_v1_module_outs',
    'api_v1_module_tags',
    'api_v1_module_panels',
  ]) {
    assert.match(viewsSql, new RegExp(`create or replace view public\\.${view}[\\s\\S]+with \\(security_barrier = on\\)`, 'i'));
    assert.match(viewsSql, new RegExp(`alter view public\\.${view} owner to api_view_owner`, 'i'));
    assert.match(viewsSql, new RegExp(`comment on view public\\.${view}[\\s\\S]+security_definer_view`, 'i'));
  }

  assert.match(viewsSql, /m\."manufacturerId"/);
  assert.match(viewsSql, /m\."public"/);
  assert.match(viewsSql, /m\."isApproved"/);
  assert.match(viewsSql, /m\.submitter is not null/);
  assert.match(viewsSql, /join public\.api_v1_modules m on m\.id = i\.moduleid/i);
  assert.match(viewsSql, /join public\.api_v1_modules m on m\.id = o\.moduleid/i);
  assert.match(viewsSql, /join public\.api_v1_modules m on m\.id = mt\.moduleid/i);
  assert.match(viewsSql, /join public\.api_v1_modules m on m\.id = p\.moduleid/i);
});

test('view output allowlists exclude private and panel-file fields', () => {
  const modulesView = selectList(viewDefinition('api_v1_modules'));
  const panelsViewDefinition = viewDefinition('api_v1_module_panels');
  const panelsView = selectList(panelsViewDefinition);

  assert.doesNotMatch(modulesView, /\bsubmitter\b/i);
  assert.doesNotMatch(modulesView, /\bcreated\b/i);
  assert.doesNotMatch(modulesView, /\bupdated\b/i);
  assert.doesNotMatch(panelsView, /\bfilename\b/i);
  assert.match(panelsViewDefinition, /select[\s\S]+p\.id,[\s\S]+p\.moduleid,[\s\S]+p\.color,[\s\S]+p\.description[\s\S]+from public\.module_panels p/i);
  assert.doesNotMatch(normalize(panelsView), /url/);
});

test('indexes and forbidden infrastructure operations match the approved local-only scope', () => {
  assert.match(viewsSql, /create index if not exists modules_public_approved_idx[\s\S]+where "public" and "isApproved" and submitter is not null/i);
  assert.match(viewsSql, /create index if not exists modules_public_approved_mfr_idx[\s\S]+on public\.modules \("manufacturerId"\)[\s\S]+where "public" and "isApproved" and submitter is not null/i);
  for (const [name, table] of [
    ['module_ins_moduleid_idx', 'module_ins'],
    ['module_outs_moduleid_idx', 'module_outs'],
    ['module_tags_moduleid_idx', 'module_tags'],
    ['module_panels_moduleid_idx', 'module_panels'],
  ]) {
    assert.match(viewsSql, new RegExp(`create index if not exists ${name}[\\s\\S]+on public\\.${table} \\(moduleid\\)`, 'i'));
  }

  assert.doesNotMatch(allNorm, /cloudflare|hyperdrive|durable object|create extension[^;]+pg_trgm|vault\.create_secret|insert into vault\.|alter role api_reader login|password/);
});
