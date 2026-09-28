import {
  normalizeManufacturerRow,
  normalizeModuleRow,
  normalizeStandardRow,
  normalizeTagRow,
} from './catalogue-mapping.ts';

export type PublicDatasetName = 'modules' | 'manufacturers' | 'standards' | 'tags';

const encoder = new TextEncoder();

/**
 * Encode already-read public catalogue rows as newline-delimited JSON chunks.
 * The caller owns query pagination and must provide rows in strictly increasing
 * ID order so an export can be produced deterministically without buffering it.
 */
export function* streamPublicDatasetJsonl(
  dataset: PublicDatasetName,
  rows: Iterable<unknown>
): Generator<Uint8Array> {
  let previousId = -1;

  for (const row of rows) {
    const publicRow = normalizeDatasetRow(dataset, row);
    if (publicRow.id <= previousId) {
      throw new Error(`${dataset} dataset rows must have strictly increasing IDs`);
    }

    previousId = publicRow.id;
    yield encoder.encode(`${JSON.stringify(publicRow)}\n`);
  }
}

function normalizeDatasetRow(dataset: PublicDatasetName, row: unknown) {
  switch (dataset) {
    case 'modules':
      return normalizeModuleRow(row);
    case 'manufacturers':
      return normalizeManufacturerRow(row);
    case 'standards':
      return normalizeStandardRow(row);
    case 'tags':
      return normalizeTagRow(row);
  }
}
