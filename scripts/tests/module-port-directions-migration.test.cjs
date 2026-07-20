const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const migrationPath = 'supabase/migrations/20260625162200_add_module_port_directions.sql';
const sql = readFileSync(migrationPath, 'utf8');
const normalized = sql.replace(/\s+/g, ' ').toLowerCase();

test('module port direction migration adds narrow direction metadata', () => {
  assert.match(
    sql,
    /alter table public\.module_ins\s+add column direction text not null default 'input'/i,
    'module_ins must get a defaulted direction column'
  );
  assert.match(
    sql,
    /constraint module_ins_direction_supported\s+check \(direction in \('input', 'bidirectional', 'passive'\)\)/i,
    'module_ins direction must only allow input-compatible semantics'
  );
  assert.match(
    sql,
    /alter table public\.module_outs\s+add column direction text not null default 'output'/i,
    'module_outs must get a defaulted direction column'
  );
  assert.match(
    sql,
    /constraint module_outs_direction_supported\s+check \(direction in \('output', 'bidirectional', 'passive'\)\)/i,
    'module_outs direction must only allow output-compatible semantics'
  );
});

test('module port direction migration documents additive compatibility', () => {
  assert.match(
    sql,
    /comment on column public\.module_ins\.direction is\s+'Semantic port direction\.[\s\S]+additive\.'/i,
    'module_ins.direction must be commented with additive intent'
  );
  assert.match(
    sql,
    /comment on column public\.module_outs\.direction is\s+'Semantic port direction\.[\s\S]+additive\.'/i,
    'module_outs.direction must be commented with additive intent'
  );
});

test('module port direction migration avoids destructive or remote semantics', () => {
  assert.doesNotMatch(normalized, /\bupdate\s+public\./, 'migration must not backfill with UPDATE public.*');
  assert.doesNotMatch(normalized, /enable\s+row\s+level\s+security/, 'migration must not alter RLS');
  assert.doesNotMatch(normalized, /\bcreate\s+policy\b/, 'migration must not create policies');
  assert.doesNotMatch(normalized, /\bgrant\b/, 'migration must not grant privileges');
  assert.doesNotMatch(normalized, /\brevoke\b/, 'migration must not revoke privileges');
  assert.doesNotMatch(normalized, /\bdrop\s+(table|column|constraint|function|trigger|policy)\b/, 'migration must not drop schema objects');
  assert.doesNotMatch(normalized, /\bsupabase\b|\bdeploy\b|\bcron\b|\btypegen\b/, 'migration must not include remote/deploy semantics');
});
