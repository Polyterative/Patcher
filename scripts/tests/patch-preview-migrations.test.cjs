const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');

const migrationPath = 'supabase/migrations/20260619091200_preserve_patch_preview_image_updated.sql';

function readMigration() {
  return fs.readFileSync(migrationPath, 'utf8');
}

test('patch preview timestamp migration preserves updated only for image-only changes', () => {
  const sql = readMigration();

  assert.match(
    sql,
    /create or replace function public\.tg_preserve_patch_preview_image_updated\(\)/i,
    'migration must create the dedicated trigger function'
  );
  assert.match(
    sql,
    /NEW\.image is distinct from OLD\.image/i,
    'trigger must only run when the preview image changes'
  );
  assert.match(
    sql,
    /\(to_jsonb\(NEW\) - 'image' - 'updated'\) = \(to_jsonb\(OLD\) - 'image' - 'updated'\)/i,
    'trigger must compare the rest of the row while ignoring image and updated'
  );
  assert.match(
    sql,
    /NEW\.updated := OLD\.updated/i,
    'image-only updates must restore the previous freshness timestamp'
  );
});

test('patch preview timestamp trigger is ordered after generic updated trigger', () => {
  const sql = readMigration();

  assert.match(
    sql,
    /drop trigger if exists zz_preserve_patch_preview_image_updated on public\.patches/i,
    'migration must be idempotent for repeated local application'
  );
  assert.match(
    sql,
    /create trigger zz_preserve_patch_preview_image_updated\s+before update on public\.patches/i,
    'trigger name must sort after handle_updated_auto so it can restore OLD.updated'
  );
  assert.match(
    sql,
    /set search_path = public/i,
    'trigger function must pin search_path'
  );
});
