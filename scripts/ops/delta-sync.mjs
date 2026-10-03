// Table-level sync between hosted Supabase and the self-host, in either direction.
// The rollback path after a cutover (reverse: self-host -> hosted) and the final
// refresh / drills (forward: hosted -> self-host). Design + review history live in
// the private self-host docs (ROLLBACK_DESIGN, revision 2 + R10).
//
// Subcommands
//   manifest  read-only. Per-table hashes of one database + auth user ids ->
//             backups/manifest-<label>-<ts>.json. Taken on hosted at the freeze
//             (T-10) = the cutover baseline a rollback re-checks under lock.
//   plan      read-only, both sides. Per-table compare + per-key insert/update/
//             delete counts (keys only, never row content) -> backups/.
//   apply     one transaction on the target:
//               public  every base table replaced whole (DELETE + COPY) under
//                       session_replication_role = replica (no triggers, no FK
//                       cascades, timestamps preserved)
//               auth    users / identities / mfa_factors merged by id (delete gone
//                       keys first, then upsert common columns; columns only the
//                       target's GoTrue has are left alone); session tables
//                       (sessions, refresh_tokens, mfa_amr_claims, one_time_tokens,
//                       flow_state, mfa_challenges) emptied -> everyone re-logs-in
//               seqs    setval(GREATEST(source, target)) — never re-issue an id
//             then, still inside the transaction, PROVES: every table hash equals
//             the source snapshot, zero FK orphans over every FK in public+auth,
//             same FK edge count as the source, every owned sequence >= max(col).
//             Any failure rolls everything back.
//
// Source is read in ONE repeatable-read snapshot; the target's prior content is
// saved first (pre-image) and can be re-applied with --from-files <dir> (undo —
// valid only until the target takes new writes).
//
// Guards
//   forward  target carries the patcher_selfhost_marker role, source does not.
//   reverse  source carries the marker AND is write-frozen (zz_patcher_freeze on
//            every public table); target does not carry it; --target-is-hosted;
//            --baseline <manifest> re-checked under EXCLUSIVE locks (public drift
//            aborts; auth ids not in the baseline abort; auth column drift is
//            reported only); typed phrase "ROLLBACK TO HOSTED".
//   always   direct or session-mode connections only (port 6543 refused); explicit
//            session SETs asserted before hashing; schema compatibility per table
//            (column names + types; a column holding data on one side only aborts).
//
// Usage
//   DB_URL=... node scripts/ops/delta-sync.mjs manifest --label hosted
//   SOURCE_DB_URL=... TARGET_DB_URL=... node scripts/ops/delta-sync.mjs plan
//   SOURCE_DB_URL=... TARGET_DB_URL=... node scripts/ops/delta-sync.mjs apply --direction forward
//   SOURCE_DB_URL=... TARGET_DB_URL=... node scripts/ops/delta-sync.mjs apply --direction reverse \
//     --target-is-hosted --baseline backups/manifest-hosted-<ts>.json
//   TARGET_DB_URL=... node scripts/ops/delta-sync.mjs apply --direction reverse --target-is-hosted \
//     --from-files backups/delta-sync-<ts>/preimage            (undo)
//
// Snapshot files hold user data (emails, password hashes, addresses): they stay in
// gitignored backups/ (dir 0700, files 0600). Delete them after bake-in.
// Exit codes: 0 ok / nothing to do, 1 error or proof failure, 2 refused by a guard.

import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '../..');
const BACKUP_DIR = path.join(REPO_ROOT, 'backups');
const FK_CHECK_SQL = path.join(SCRIPT_DIR, 'lib', 'fk-orphan-check.sql');
const MARKER_ROLE = 'patcher_selfhost_marker';
const FREEZE_TRIGGER = 'zz_patcher_freeze';
const FORMAT = 'patcher-delta-v2';
const PSQL = process.env.PSQL || 'psql';

const AUTH_MERGE = ['auth.users', 'auth.identities', 'auth.mfa_factors']; // parents first
const AUTH_WIPE = ['auth.mfa_challenges', 'auth.mfa_amr_claims', 'auth.refresh_tokens',
  'auth.sessions', 'auth.one_time_tokens', 'auth.flow_state']; // children first

// Settings every hashing session must run under (PG15 and PG17 then print equal text).
const SESSION_SETTINGS = [
  ['TimeZone', 'UTC'], ['DateStyle', 'ISO, YMD'], ['IntervalStyle', 'postgres'],
  ['extra_float_digits', '1'], ['bytea_output', 'hex'], ['search_path', 'pg_catalog'],
];
const setSql = (local) => SESSION_SETTINGS.map(([k, v]) => `SET ${local ? 'LOCAL ' : ''}${k} = '${v}';`).join('\n');
const assertSql = `DO $a$ BEGIN
${SESSION_SETTINGS.map(([k, v]) => `  IF current_setting('${k}') <> '${v}' THEN RAISE EXCEPTION 'session setting ${k} is %, expected ${v} (pooler ignoring SET?)', current_setting('${k}'); END IF;`).join('\n')}
END $a$;`;

// ---------------------------------------------------------------- helpers

class Refused extends Error {}
const fail = (msg) => { throw new Error(msg); };
const refuse = (msg) => { throw new Refused(msg); };
const qi = (name) => '"' + name.replace(/"/g, '""') + '"';
const ql = (s) => "'" + String(s).replace(/'/g, "''") + "'";
const qname = (q) => q.split('.').map(qi).join('.');
const fileFor = (dir, q) => path.join(dir, q.replace(/[^A-Za-z0-9_.-]/g, '_') + '.copy');
const stamp = () => new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');

function maskUrl(url) {
  try { const u = new URL(url); return `${u.protocol}//***@${u.hostname}:${u.port || 5432}${u.pathname}`; }
  catch { return '[unparseable url]'; }
}
function looksHosted(url) { return /supabase\.(co|com|in)|pooler\.supabase/i.test(url); }
function checkUrl(url, label) {
  if (!url) refuse(`${label} must be set in the shell (never commit it).`);
  let u; try { u = new URL(url); } catch { refuse(`${label} is not a valid postgres URL.`); }
  if (u.port === '6543') refuse(`${label} uses port 6543 (transaction pooler): session SETs and snapshots are not reliable there. Use a direct or session-mode (5432) connection.`);
}

// Run SQL (may contain psql meta-commands) through stdin; rows as arrays.
function psql(url, sql, { quiet = false } = {}) {
  const r = spawnSync(PSQL, [url, '-X', '-q', '-v', 'ON_ERROR_STOP=1', '-tA', '-F', '\x1f', '-f', '-'],
    { input: sql, encoding: 'utf8', maxBuffer: 1 << 28, env: { ...process.env, PGOPTIONS: '' } });
  if (r.error) fail(`could not run ${PSQL}: ${r.error.message}`);
  if (r.status !== 0) {
    const err = (r.stderr || '').split('\n').filter((l) => /ERROR|FATAL|DETAIL|HINT/.test(l)).join('\n') || r.stderr;
    const e = new Error(`psql failed on ${maskUrl(url)}:\n${err}`); e.stderr = r.stderr; throw e;
  }
  if (!quiet && r.stderr && /WARNING|NOTICE/.test(r.stderr)) process.stdout.write(r.stderr.replace(/^psql:[^:]*:\d+: /gm, '  '));
  return r.stdout.split('\n').filter((l) => l.length).map((l) => l.split('\x1f'));
}
const one = (url, sql) => (psql(url, sql)[0] || [])[0];

async function confirmPhrase(phrase) {
  let typed = process.env.CONFIRM_PHRASE;
  if (typed === undefined) {
    process.stdout.write(`Type "${phrase}" to continue: `);
    const fd = fs.openSync('/dev/tty', 'r'); const buf = Buffer.alloc(256);
    const n = fs.readSync(fd, buf, 0, 256, null); fs.closeSync(fd);
    typed = buf.subarray(0, n).toString().trim();
  }
  if (typed !== phrase) refuse('confirmation phrase did not match; nothing written.');
}

function newRunDir(kind) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true, mode: 0o700 });
  const ignored = spawnSync('git', ['-C', REPO_ROOT, 'check-ignore', '-q', 'backups/']);
  if (ignored.status === 1) refuse('backups/ is not git-ignored; refusing to write data files.');
  const dir = path.join(BACKUP_DIR, `${kind}-${stamp()}`);
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  return dir;
}
function writePrivate(file, content) { fs.writeFileSync(file, content, { mode: 0o600 }); }

// ---------------------------------------------------------------- catalog

const hasMarker = (url) => one(url, `SELECT count(*) FROM pg_roles WHERE rolname = '${MARKER_ROLE}';`) === '1';

function publicTables(url) {
  return psql(url, `SELECT 'public.' || relname FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relkind IN ('r','p') ORDER BY 1;`).map((r) => r[0]);
}
function existing(url, quals) {
  if (!quals.length) return [];
  const rows = psql(url, `SELECT q FROM unnest(ARRAY[${quals.map(ql).join(',')}]) q WHERE to_regclass(q) IS NOT NULL;`);
  const have = new Set(rows.map((r) => r[0]));
  return quals.filter((q) => have.has(q));
}
// Non-generated columns, ordered by name: [{name, type}]
function columns(url, q) {
  return psql(url, `SELECT attname, format_type(atttypid, atttypmod) FROM pg_attribute WHERE attrelid = ${ql(q)}::regclass AND attnum > 0 AND NOT attisdropped AND attgenerated = '' ORDER BY attname COLLATE "C";`)
    .map(([name, type]) => ({ name, type }));
}
// Primary key, else the first non-partial unique index.
function keyColumns(url, q) {
  const rows = psql(url, `SELECT i.indexrelid, a.attname FROM pg_index i
      JOIN LATERAL unnest(i.indkey::int2[]) WITH ORDINALITY k(attnum, ord) ON true
      JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum
     WHERE i.indrelid = ${ql(q)}::regclass AND i.indisunique AND i.indpred IS NULL AND i.indexprs IS NULL
     ORDER BY i.indisprimary DESC, i.indexrelid, k.ord;`);
  if (!rows.length) return null;
  return rows.filter((r) => r[0] === rows[0][0]).map((r) => r[1]);
}
function fkEdgeCount(url) {
  return Number(one(url, `SELECT count(*) FROM pg_constraint c WHERE c.contype = 'f' AND (c.connamespace IN ('public'::regnamespace, 'auth'::regnamespace) OR (SELECT relnamespace FROM pg_class WHERE oid = c.confrelid) IN ('public'::regnamespace, 'auth'::regnamespace));`));
}
function unfrozenTables(url) {
  return psql(url, `SELECT c.relname FROM pg_class c WHERE c.relnamespace = 'public'::regnamespace AND c.relkind IN ('r','p')
      AND NOT EXISTS (SELECT 1 FROM pg_trigger t WHERE t.tgrelid = c.oid AND t.tgname = '${FREEZE_TRIGGER}' AND t.tgenabled = 'O') ORDER BY 1;`).map((r) => r[0]);
}

const hashExpr = (cols) =>
  `count(*)::text || ':' || coalesce(sum(('x' || substr(md5(ROW(${cols.map((c) => 't.' + qi(c)).join(', ')})::text), 1, 16))::bit(64)::bigint::numeric), 0)::text`;
const hashQuery = (q, cols) => `SELECT ${ql(q)}, ${hashExpr(cols)} FROM ${qname(q)} t;`;
const seqQuery = `SELECT 'seq:' || schemaname || '.' || sequencename, coalesce(last_value::text, '') FROM pg_sequences WHERE schemaname = 'public' ORDER BY 1;`;

// ---------------------------------------------------------------- scope + compatibility

// Decide what moves and with which columns. Aborts on schema incompatibility.
function buildScope(src, tgt, srcMeta) {
  const errors = [];
  const tTables = publicTables(tgt);
  const sTables = srcMeta ? Object.keys(srcMeta.tables).filter((q) => q.startsWith('public.')) : publicTables(src);
  const onlyS = sTables.filter((q) => !tTables.includes(q));
  const onlyT = tTables.filter((q) => !sTables.includes(q));
  if (onlyS.length) errors.push(`tables only on source: ${onlyS.join(', ')}`);
  if (onlyT.length) errors.push(`tables only on target: ${onlyT.join(', ')} (schema changed during bake-in?)`);

  const authMerge = existing(tgt, AUTH_MERGE).filter((q) => (srcMeta ? q in srcMeta.tables : existing(src, [q]).length));
  const authWipe = existing(tgt, AUTH_WIPE);
  const tables = {};
  for (const q of [...tTables.filter((t) => sTables.includes(t)), ...authMerge]) {
    const tc = columns(tgt, q);
    const sc = srcMeta ? srcMeta.tables[q].cols.map((name) => ({ name, type: srcMeta.tables[q].types?.[name] })) : columns(src, q);
    const tMap = new Map(tc.map((c) => [c.name, c.type]));
    const sMap = new Map(sc.map((c) => [c.name, c.type]));
    const common = sc.filter((c) => tMap.has(c.name)).map((c) => c.name);
    for (const c of common) {
      if (sMap.get(c) && sMap.get(c) !== tMap.get(c)) errors.push(`${q}.${c}: type ${sMap.get(c)} on source vs ${tMap.get(c)} on target`);
    }
    const sourceOnly = sc.filter((c) => !tMap.has(c.name)).map((c) => c.name);
    const targetOnly = tc.filter((c) => !sMap.has(c.name)).map((c) => c.name);
    if (sourceOnly.length && !srcMeta) {
      const withData = sourceOnly.filter((c) => one(src, `SELECT count(*) FROM ${qname(q)} WHERE ${qi(c)} IS NOT NULL;`) !== '0');
      if (withData.length) errors.push(`${q}: source-only column(s) holding data: ${withData.join(', ')}`);
    } else if (sourceOnly.length) errors.push(`${q}: snapshot column(s) missing on target: ${sourceOnly.join(', ')}`);
    // public tables are replaced whole: a target-only column with data would be wiped.
    if (targetOnly.length && q.startsWith('public.')) {
      const withData = targetOnly.filter((c) => one(tgt, `SELECT count(*) FROM ${qname(q)} WHERE ${qi(c)} IS NOT NULL;`) !== '0');
      if (withData.length) errors.push(`${q}: target-only column(s) holding data would be wiped: ${withData.join(', ')}`);
    }
    tables[q] = { cols: common, targetOnly };
  }
  if (errors.length) refuse('schema incompatibility:\n  - ' + errors.join('\n  - '));
  return { tables, authMerge, authWipe, publicList: Object.keys(tables).filter((q) => q.startsWith('public.')) };
}

// ---------------------------------------------------------------- snapshots

// One repeatable-read session: hashes + sequences + COPY files. Returns meta.
function snapshot(url, dir, tableCols, { label, extraFull = [] } = {}) {
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const hashFile = path.join(dir, 'hashes.tsv');
  const lines = ['BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;', setSql(false), assertSql,
    `\\o ${hashFile}`, `\\pset fieldsep '\\t'`];
  for (const [q, cols] of Object.entries(tableCols)) lines.push(hashQuery(q, cols));
  lines.push(seqQuery, '\\o');
  for (const [q, cols] of Object.entries(tableCols)) {
    lines.push(`\\copy (SELECT ${cols.map(qi).join(', ')} FROM ${qname(q)}) TO ${ql(fileFor(dir, q))}`);
  }
  for (const q of extraFull) lines.push(`\\copy ${qname(q)} TO ${ql(fileFor(dir, q))}`);
  lines.push('COMMIT;');
  psql(url, lines.join('\n'), { quiet: true });
  const hashes = {}; const sequences = {};
  for (const line of fs.readFileSync(hashFile, 'utf8').split('\n').filter(Boolean)) {
    const [k, v] = line.split('\t');
    if (k.startsWith('seq:')) sequences[k.slice(4)] = v === '' ? null : v; else hashes[k] = v;
  }
  fs.rmSync(hashFile);
  const meta = {
    format: FORMAT, label, taken_at: new Date().toISOString(), from: maskUrl(url),
    server_version: one(url, 'SHOW server_version;'), fk_edges: fkEdgeCount(url),
    tables: Object.fromEntries(Object.entries(tableCols).map(([q, cols]) => [q, { cols, hash: hashes[q] }])),
    extra_full: extraFull, sequences,
  };
  for (const f of fs.readdirSync(dir)) fs.chmodSync(path.join(dir, f), 0o600);
  writePrivate(path.join(dir, 'meta.json'), JSON.stringify(meta, null, 2));
  return meta;
}

function liveHashes(url, tableCols) {
  const sql = [setSql(false), assertSql, ...Object.entries(tableCols).map(([q, cols]) => hashQuery(q, cols))].join('\n');
  return Object.fromEntries(psql(url, sql).map(([q, h]) => [q, h]));
}

// ---------------------------------------------------------------- manifest

function cmdManifest(args) {
  const url = process.env.DB_URL; checkUrl(url, 'DB_URL');
  const label = args.label || 'db';
  const tableCols = {};
  for (const q of [...publicTables(url), ...existing(url, AUTH_MERGE)]) tableCols[q] = columns(url, q).map((c) => c.name);
  const sql = ['BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;', setSql(false), assertSql,
    ...Object.entries(tableCols).map(([q, cols]) => hashQuery(q, cols)), seqQuery,
    existing(url, ['auth.users']).length ? `SELECT 'auth_user_ids', coalesce(string_agg(id::text, ',' ORDER BY id), '') FROM auth.users;` : '', 'COMMIT;'].join('\n');
  const rows = psql(url, sql);
  const tables = {}; const sequences = {}; let authUserIds = [];
  for (const [k, v] of rows) {
    if (k === 'auth_user_ids') authUserIds = v ? v.split(',') : [];
    else if (k.startsWith('seq:')) sequences[k.slice(4)] = v === '' ? null : v;
    else tables[k] = { cols: tableCols[k], hash: v };
  }
  const manifest = { format: FORMAT, kind: 'manifest', label, taken_at: new Date().toISOString(), from: maskUrl(url),
    server_version: one(url, 'SHOW server_version;'), fk_edges: fkEdgeCount(url), tables, sequences, auth_user_ids: authUserIds };
  fs.mkdirSync(BACKUP_DIR, { recursive: true, mode: 0o700 });
  const file = path.join(BACKUP_DIR, `manifest-${label.replace(/[^A-Za-z0-9_-]/g, '_')}-${stamp()}.json`);
  writePrivate(file, JSON.stringify(manifest, null, 2));
  console.log(`manifest (read-only): ${path.relative(REPO_ROOT, file)} — ${Object.keys(tables).length} tables, ${authUserIds.length} auth users, ${Object.keys(sequences).length} sequences`);
}

// ---------------------------------------------------------------- plan

function keyedDelta(src, tgt, q, cols, key) {
  const keyExpr = key.map((k) => `t.${qi(k)}::text`).join(` || '|' || `);
  const sql = (url) => psql(url, `${setSql(false)}\nSELECT ${keyExpr}, md5(ROW(${cols.map((c) => 't.' + qi(c)).join(', ')})::text) FROM ${qname(q)} t;`);
  const s = new Map(sql(src)); const t = new Map(sql(tgt));
  const ins = [...s.keys()].filter((k) => !t.has(k));
  const del = [...t.keys()].filter((k) => !s.has(k));
  const upd = [...s.keys()].filter((k) => t.has(k) && t.get(k) !== s.get(k));
  return { ins, upd, del };
}

function cmdPlan(args) {
  const src = process.env.SOURCE_DB_URL; const tgt = process.env.TARGET_DB_URL;
  checkUrl(src, 'SOURCE_DB_URL'); checkUrl(tgt, 'TARGET_DB_URL');
  if (src === tgt) refuse('source and target are identical.');
  const scope = buildScope(src, tgt, null);
  const tableCols = Object.fromEntries(Object.entries(scope.tables).map(([q, v]) => [q, v.cols]));
  const sh = liveHashes(src, tableCols); const th = liveHashes(tgt, tableCols);
  const out = [`# delta-sync plan (${args.direction || 'unspecified'} direction)`, '',
    `source ${maskUrl(src)} · target ${maskUrl(tgt)} · ${new Date().toISOString()}`, '',
    'Keys only — never row content. Counts are source vs target.', '',
    '| table | source rows | target rows | insert | update | delete | sample keys |', '|---|---|---|---|---|---|---|'];
  let changed = 0;
  for (const q of Object.keys(tableCols)) {
    if (sh[q] === th[q]) continue;
    changed++;
    const key = keyColumns(tgt, q);
    const [sc] = sh[q].split(':'); const [tc] = th[q].split(':');
    if (!key) { out.push(`| ${q} | ${sc} | ${tc} | ? | ? | ? | no unique key — replaced whole |`); continue; }
    const d = keyedDelta(src, tgt, q, tableCols[q], key);
    const sample = [...d.ins.slice(0, 3).map((k) => '+' + k), ...d.upd.slice(0, 3).map((k) => '~' + k), ...d.del.slice(0, 3).map((k) => '-' + k)].join(' ');
    out.push(`| ${q} | ${sc} | ${tc} | ${d.ins.length} | ${d.upd.length} | ${d.del.length} | ${sample} |`);
  }
  out.push('', `${changed} of ${Object.keys(tableCols).length} tables differ. Session tables emptied on apply: ${scope.authWipe.join(', ') || 'none'}.`);
  const dir = newRunDir('delta-plan');
  const file = path.join(dir, 'reconciliation.md'); writePrivate(file, out.join('\n') + '\n');
  console.log(out.join('\n'));
  console.log(`\nwritten: ${path.relative(REPO_ROOT, file)}`);
}

// ---------------------------------------------------------------- apply

function baselineRecheckSql(baseline, scope) {
  const checks = [];
  for (const q of scope.publicList) {
    const b = baseline.tables[q];
    if (!b) { checks.push(`  bad := bad || ${ql(q + ': not in baseline manifest')}::text;`); continue; }
    checks.push(`  SELECT ${hashExpr(b.cols)} INTO h FROM ${qname(q)} t;
  IF h <> ${ql(b.hash)} THEN bad := bad || ${ql(q + ' changed since the baseline (leaked write on the frozen side)')}::text; END IF;`);
  }
  if (scope.authMerge.includes('auth.users')) {
    checks.push(`  SELECT count(*) INTO n FROM auth.users WHERE id::text <> ALL (${ql('{' + (baseline.auth_user_ids || []).join(',') + '}')}::text[]);
  IF n > 0 THEN bad := bad || format('auth.users: %s id(s) not in the baseline (signup on the frozen side)', n); END IF;`);
    if (baseline.tables['auth.users']) {
      checks.push(`  SELECT ${hashExpr(baseline.tables['auth.users'].cols)} INTO h FROM auth.users t;
  IF h <> ${ql(baseline.tables['auth.users'].hash)} THEN RAISE WARNING 'auth.users columns changed since the baseline (e.g. last_sign_in_at from stale tabs) — merge overwrites them; reported only'; END IF;`);
    }
  }
  return `DO $baseline$
DECLARE bad text[] := '{}'; h text; n bigint;
BEGIN
${checks.join('\n')}
  IF cardinality(bad) > 0 THEN RAISE EXCEPTION 'baseline re-check FAILED: %', array_to_string(bad, '; '); END IF;
  RAISE NOTICE 'baseline re-check OK (under lock)';
END $baseline$;`;
}

function applySql(scope, srcDir, meta, baseline) {
  const L = [];
  const pubs = scope.publicList;
  const lockList = [...pubs, ...scope.authMerge, ...scope.authWipe].map(qname).join(', ');
  L.push('BEGIN;', setSql(true), assertSql,
    `SET LOCAL lock_timeout = '${process.env.LOCK_TIMEOUT || '15s'}';`,
    'SET LOCAL statement_timeout = 0;',
    'SET LOCAL session_replication_role = replica;',
    `LOCK TABLE ${lockList} IN EXCLUSIVE MODE;`);
  if (baseline) L.push(baselineRecheckSql(baseline, scope));

  L.push('-- public: replace whole (replica mode: no triggers, no cascades)');
  for (const q of pubs) {
    const cols = meta.tables[q].cols.map(qi).join(', ');
    L.push(`DELETE FROM ${qname(q)};`, `\\copy ${qname(q)} (${cols}) FROM ${ql(fileFor(srcDir, q))}`);
  }

  L.push('-- auth: sessions emptied (forced re-login), then delete gone keys, then upsert');
  for (const q of scope.authWipe) L.push(`DELETE FROM ${qname(q)};`);
  for (const q of scope.authMerge) {
    const cols = meta.tables[q].cols;
    const tmp = 'delta_src_' + q.replace('.', '_');
    L.push(`CREATE TEMP TABLE ${tmp} ON COMMIT DROP AS SELECT ${cols.map(qi).join(', ')} FROM ${qname(q)} WITH NO DATA;`,
      `\\copy ${tmp} (${cols.map(qi).join(', ')}) FROM ${ql(fileFor(srcDir, q))}`);
  }
  for (const q of [...scope.authMerge].reverse()) {
    L.push(`DELETE FROM ${qname(q)} t WHERE NOT EXISTS (SELECT 1 FROM delta_src_${q.replace('.', '_')} s WHERE s.id = t.id);`);
  }
  for (const q of scope.authMerge) {
    const cols = meta.tables[q].cols;
    const upd = cols.filter((c) => c !== 'id').map((c) => `${qi(c)} = EXCLUDED.${qi(c)}`).join(', ');
    L.push(`INSERT INTO ${qname(q)} (${cols.map(qi).join(', ')}) SELECT ${cols.map(qi).join(', ')} FROM delta_src_${q.replace('.', '_')}
  ON CONFLICT (id) DO ${upd ? 'UPDATE SET ' + upd : 'NOTHING'};`);
  }

  L.push('-- sequences: never move backwards, never re-issue an id');
  const seqVals = Object.entries(meta.sequences || {}).filter(([, v]) => v !== null);
  if (seqVals.length) {
    L.push(`SELECT setval(format('%I.%I', s.schemaname, s.sequencename)::regclass, GREATEST(v.src, coalesce(s.last_value, 0)))
  FROM (VALUES ${seqVals.map(([k, v]) => `(${ql(k)}, ${v}::bigint)`).join(', ')}) v(name, src)
  JOIN pg_sequences s ON s.schemaname || '.' || s.sequencename = v.name;`);
  }

  // Proofs — any RAISE aborts the whole transaction.
  const hashChecks = Object.keys(scope.tables).map((q) => `  SELECT ${hashExpr(meta.tables[q].cols)} INTO h FROM ${qname(q)} t;
  IF h <> ${ql(meta.tables[q].hash)} THEN bad := bad || format('%s: target %s vs source %s', ${ql(q)}, h, ${ql(meta.tables[q].hash)}); END IF;`).join('\n');
  L.push(`DO $proof$
DECLARE bad text[] := '{}'; h text; r record; mx bigint; edges int;
BEGIN
${hashChecks}
  FOR r IN SELECT d.objid::regclass AS seq, d.refobjid::regclass AS tbl, a.attname
             FROM pg_depend d JOIN pg_class c ON c.oid = d.objid AND c.relkind = 'S'
             JOIN pg_attribute a ON a.attrelid = d.refobjid AND a.attnum = d.refobjsubid
            WHERE d.classid = 'pg_class'::regclass AND d.refclassid = 'pg_class'::regclass AND d.deptype IN ('a', 'i')
              AND c.relnamespace = 'public'::regnamespace LOOP
    EXECUTE format('SELECT max(%I)::bigint FROM %s', r.attname, r.tbl) INTO mx;
    IF mx IS NOT NULL AND mx > coalesce((SELECT last_value FROM pg_sequences WHERE format('%I.%I', schemaname, sequencename)::regclass = r.seq), 0) THEN
      bad := bad || format('sequence %s behind max(%s.%s) = %s', r.seq, r.tbl, r.attname, mx);
    END IF;
  END LOOP;
  SELECT count(*) INTO edges FROM pg_constraint c WHERE c.contype = 'f' AND (c.connamespace IN ('public'::regnamespace, 'auth'::regnamespace)
     OR (SELECT relnamespace FROM pg_class WHERE oid = c.confrelid) IN ('public'::regnamespace, 'auth'::regnamespace));
  IF edges <> ${Number(meta.fk_edges)} THEN bad := bad || format('FK edge count %s on target vs ${Number(meta.fk_edges)} on source', edges); END IF;
  IF cardinality(bad) > 0 THEN RAISE EXCEPTION 'apply proof FAILED: %', array_to_string(bad, '; '); END IF;
  RAISE NOTICE 'apply proof OK: % tables match the source snapshot, sequences ahead of their columns', ${Object.keys(scope.tables).length};
END $proof$;`);
  L.push(fs.readFileSync(FK_CHECK_SQL, 'utf8'));
  L.push(process.env.DELTA_SYNC_REHEARSAL === '1' ? 'ROLLBACK;' : 'COMMIT;');
  return L.join('\n');
}

async function cmdApply(args) {
  const direction = args.direction;
  if (!['forward', 'reverse'].includes(direction)) refuse('--direction forward|reverse is required.');
  const tgt = process.env.TARGET_DB_URL; checkUrl(tgt, 'TARGET_DB_URL');
  const fromFiles = args['from-files'];
  const src = fromFiles ? null : process.env.SOURCE_DB_URL;
  if (!fromFiles) { checkUrl(src, 'SOURCE_DB_URL'); if (src === tgt) refuse('source and target are identical.'); }

  // ---- guards
  const targetMarked = hasMarker(tgt);
  if (direction === 'forward') {
    if (!targetMarked) refuse(`forward needs a target carrying the ${MARKER_ROLE} role (the self-host).`);
    if (src && hasMarker(src)) refuse('source carries the self-host marker — SOURCE/TARGET look swapped.');
  } else {
    if (targetMarked) refuse('reverse target carries the self-host marker — SOURCE/TARGET look swapped.');
    if (!args['target-is-hosted']) refuse('reverse writes hosted: pass --target-is-hosted.');
    if (src) {
      if (!hasMarker(src)) refuse(`reverse source must carry the ${MARKER_ROLE} role (the self-host).`);
      const open = unfrozenTables(src);
      if (open.length) refuse(`source is not write-frozen (${open.length} public table(s) without ${FREEZE_TRIGGER}, e.g. ${open.slice(0, 3).join(', ')}). Run write-freeze.sh on (and freeze the gateway) first.`);
    }
    if (!fromFiles && !args.baseline) refuse('reverse needs --baseline <manifest taken on hosted at the freeze>.');
  }
  if (!targetMarked && looksHosted(tgt) && !args['target-is-hosted']) refuse('target looks like hosted: pass --target-is-hosted.');
  let baseline = null;
  if (args.baseline) {
    baseline = JSON.parse(fs.readFileSync(args.baseline, 'utf8'));
    if (baseline.format !== FORMAT || baseline.kind !== 'manifest') refuse(`baseline ${args.baseline} is not a ${FORMAT} manifest (re-take it with this tool).`);
  }
  let srcMeta = null;
  if (fromFiles) {
    srcMeta = JSON.parse(fs.readFileSync(path.join(fromFiles, 'meta.json'), 'utf8'));
    if (srcMeta.format !== FORMAT) refuse(`${fromFiles} is not a ${FORMAT} snapshot.`);
  }
  const superuser = one(tgt, 'SELECT rolsuper FROM pg_roles WHERE rolname = current_user;') === 't';
  if (!superuser) console.log('note: target login is not a superuser — replica mode must be granted to it (hosted: verified by probe-hosted-rights.sh).');

  console.log(`direction: ${direction}\nsource:    ${fromFiles ? 'files ' + fromFiles : maskUrl(src)}\ntarget:    ${maskUrl(tgt)}`);

  // ---- scope + source snapshot
  const scope = buildScope(src, tgt, srcMeta);
  const run = newRunDir(`delta-sync-${direction}`);
  let meta;
  if (fromFiles) {
    meta = srcMeta;
    for (const q of Object.keys(scope.tables)) scope.tables[q].cols = meta.tables[q].cols;
  } else {
    const tableCols = Object.fromEntries(Object.entries(scope.tables).map(([q, v]) => [q, v.cols]));
    meta = snapshot(src, path.join(run, 'source'), tableCols, { label: 'source' });
    if (fkEdgeCount(tgt) !== meta.fk_edges) refuse(`FK edge count differs: source ${meta.fk_edges}, target ${fkEdgeCount(tgt)} (schema drift).`);
  }
  const srcDir = fromFiles || path.join(run, 'source');

  // ---- nothing to do?
  const tableCols = Object.fromEntries(Object.keys(scope.tables).map((q) => [q, meta.tables[q].cols]));
  const th = liveHashes(tgt, tableCols);
  const differing = Object.keys(tableCols).filter((q) => th[q] !== meta.tables[q].hash);
  console.log(`scope: ${scope.publicList.length} public tables replaced whole, auth merge [${scope.authMerge.join(', ')}], sessions emptied [${scope.authWipe.join(', ')}]`);
  console.log(`differing now: ${differing.length ? differing.join(', ') : 'none'}`);
  if (!differing.length && !args.force) {
    console.log('Target already matches the source snapshot — nothing to do (idempotent). Use --force to rewrite anyway.');
    return;
  }

  // ---- pre-image (undo material)
  const preTableCols = Object.fromEntries(Object.keys(scope.tables).map((q) => [q, columns(tgt, q).map((c) => c.name)]));
  snapshot(tgt, path.join(run, 'preimage'), preTableCols, { label: 'preimage', extraFull: scope.authWipe });
  console.log(`pre-image saved: ${path.relative(REPO_ROOT, path.join(run, 'preimage'))} (undo with --from-files until the target takes new writes; emptied session tables are saved but not auto-restored)`);

  await confirmPhrase(direction === 'reverse' ? 'ROLLBACK TO HOSTED' : 'SYNC FORWARD');

  const sqlFile = path.join(run, 'apply.sql');
  writePrivate(sqlFile, applySql(scope, srcDir, meta, baseline));
  const t0 = Date.now();
  psql(tgt, fs.readFileSync(sqlFile, 'utf8'));
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  if (process.env.DELTA_SYNC_REHEARSAL === '1') { console.log(`REHEARSAL: every step and proof passed, then rolled back (${secs}s).`); return; }
  console.log(`COMMITTED in ${secs}s.`);

  // ---- after commit: derived objects (non-fatal)
  for (const [mv] of psql(tgt, `SELECT format('%I.%I', schemaname, matviewname) FROM pg_matviews WHERE schemaname = 'public';`)) {
    try { psql(tgt, `REFRESH MATERIALIZED VIEW ${mv};`); console.log(`refreshed ${mv}`); }
    catch (e) { console.log(`WARNING: refresh ${mv} failed (non-fatal): ${e.message.split('\n')[1] || e.message}`); }
  }
  try { psql(tgt, `ANALYZE ${Object.keys(scope.tables).map(qname).join(', ')};`); console.log('analyzed replaced tables'); }
  catch (e) { console.log(`WARNING: ANALYZE failed (non-fatal): ${e.message}`); }
  console.log(`run files (user data — delete after bake-in): ${path.relative(REPO_ROOT, run)}`);
}

// ---------------------------------------------------------------- main

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) { out._.push(a); continue; }
    const k = a.slice(2);
    if (['target-is-hosted', 'force'].includes(k)) out[k] = true;
    else { out[k] = argv[i + 1]; i++; }
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
const cmd = args._[0];
try {
  if (cmd === 'manifest') cmdManifest(args);
  else if (cmd === 'plan') cmdPlan(args);
  else if (cmd === 'apply') await cmdApply(args);
  else {
    const src = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n');
    console.log(src.slice(0, src.findIndex((l) => !l.startsWith('//'))).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'));
    process.exit(cmd ? 1 : 0);
  }
} catch (e) {
  console.error((e instanceof Refused ? 'REFUSED: ' : 'ERROR: ') + e.message);
  process.exit(e instanceof Refused ? 2 : 1);
}
