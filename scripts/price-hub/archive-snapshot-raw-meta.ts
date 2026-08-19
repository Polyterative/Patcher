/**
 * Phase 1 of the Price Hub snapshot backfill (see
 * internaldocs/workflow/plans/price-hub-snapshot-compaction.md):
 * stream every snapshot's raw_meta to a local gitignored JSONL archive
 * before interior rows are collapsed and raw_meta is stripped.
 *
 * Read-only; safe to re-run. Usage:
 *   node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/price-hub/archive-snapshot-raw-meta.ts [--out=tmp/...jsonl]
 */
import { createWriteStream, mkdirSync } from 'node:fs';
import { once } from 'node:events';
import { dirname } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../src/backend/database.types.ts';
import { readPriceHubScriptEnv, readSupabaseReadKey } from './local-env.ts';

const DEFAULT_SUPABASE_URL = 'https://sozmatmywjpstwidzlss.supabase.co';
// PostgREST may cap each response below this (e.g. db-max-rows = 500), so the
// loop only stops on an empty page, never on a short one.
const PAGE_SIZE = 1000;
const PROGRESS_EVERY_PAGES = 50;

async function main(): Promise<void> {
  const env = readPriceHubScriptEnv();
  const supabaseUrl = env.SUPABASE_URL ?? DEFAULT_SUPABASE_URL;
  const supabaseKey = readSupabaseReadKey(env);
  if (!supabaseKey) {
    throw new Error('Missing Supabase read key. Set SUPABASE_ANON_KEY (or a service key) in .env.');
  }

  const outPath = process.argv
    .slice(2)
    .find((arg) => arg.startsWith('--out='))
    ?.slice('--out='.length)
    ?? `tmp/price-hub-raw-meta-archive-${new Date().toISOString().slice(0, 10)}.jsonl`;

  const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  mkdirSync(dirname(outPath), { recursive: true });
  const out = createWriteStream(outPath, { flags: 'w' });

  let lastId = 0;
  let totalRows = 0;
  let pages = 0;

  for (;;) {
    const { data, error } = await supabase
      .from('module_price_snapshots')
      .select('id,listing_id,observed_at,raw_meta')
      .gt('id', lastId)
      .order('id', { ascending: true })
      .limit(PAGE_SIZE);
    if (error) {
      throw new Error(`Archive page after id ${lastId} failed: ${error.message}`);
    }
    if (!data || data.length === 0) {
      break;
    }

    for (const row of data) {
      if (!out.write(`${JSON.stringify(row)}\n`)) {
        await once(out, 'drain');
      }
    }

    lastId = data[data.length - 1].id;
    totalRows += data.length;
    pages += 1;
    if (pages % PROGRESS_EVERY_PAGES === 0) {
      console.log(`…archived ${totalRows} rows (up to id ${lastId})`);
    }
  }

  out.end();
  await once(out, 'finish');
  console.log(`Archived ${totalRows} snapshot rows to ${outPath} (last id ${lastId}).`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
