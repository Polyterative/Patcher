import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { NormalizedStoreListingSnapshot } from '../../../supabase/functions/_shared/price-hub/woocommerce-store-api.ts';

export async function writeCrawledProducts(
  outputRoot: string,
  storeSlug: string,
  products: NormalizedStoreListingSnapshot[],
): Promise<string> {
  const outputDirectory = join(outputRoot, storeSlug);
  await mkdir(outputDirectory, { recursive: true });
  const outputPath = join(outputDirectory, 'products.json');
  await writeFile(outputPath, `${JSON.stringify(products, null, 2)}\n`, 'utf8');
  return outputPath;
}
