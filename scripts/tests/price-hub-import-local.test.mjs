import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildImportRows, filterRowsWithConflictingProductUrls, filterRowsWithExistingModules, readCliOptions } from '../price-hub/import-local-snapshots.ts';

test('builds import rows only from strong matches with matching products', () => {
  const productUrl = 'https://signalsounds.eu/noise-engineering-melotus-versio-eurorack-stereo-grnaular-processor-module-black';
  const rows = buildImportRows([
    {
      priceAmountMinor: 42500,
      currency: 'EUR',
      availability: 'in_stock',
      productName: 'Noise Engineering Melotus Versio Eurorack Stereo Granular Processor Module (Black)',
      productUrl,
      imageUrl: null,
      rawMeta: {
        adapter: 'bigcommerce_metadata',
        slug: 'noise-engineering-melotus-versio-eurorack-stereo-grnaular-processor-module-black',
      },
    },
  ], [
    {
      moduleId: '3337',
      moduleName: 'Melotus Versio',
      manufacturerName: 'Noise Engineering',
      productUrl: `${productUrl}/`,
      productName: 'Noise Engineering Melotus Versio Eurorack Stereo Granular Processor Module (Black)',
      score: 1,
      status: 'strong_candidate',
      reasons: ['manufacturer phrase found in product name'],
    },
    {
      moduleId: '3337',
      moduleName: 'Melotus Versio',
      manufacturerName: 'Noise Engineering',
      productUrl: 'https://signalsounds.eu/no-price',
      productName: 'No price',
      score: 0.35,
      status: 'ignored',
      reasons: [],
    },
  ]);

  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0], {
    moduleId: 3337,
    productUrl,
    productName: 'Noise Engineering Melotus Versio Eurorack Stereo Granular Processor Module (Black)',
    priceAmountMinor: 42500,
    currency: 'EUR',
    availability: 'in_stock',
    externalProductId: null,
    externalHandle: 'noise-engineering-melotus-versio-eurorack-stereo-grnaular-processor-module-black',
    rawMeta: {
      adapter: 'bigcommerce_metadata',
      slug: 'noise-engineering-melotus-versio-eurorack-stereo-grnaular-processor-module-black',
      matchedProductName: 'Noise Engineering Melotus Versio Eurorack Stereo Granular Processor Module (Black)',
      matchedModuleName: 'Melotus Versio',
      matchedManufacturerName: 'Noise Engineering',
      matchScore: 1,
      matchReasons: ['manufacturer phrase found in product name'],
    },
  });

  test('chooses one best product per module for a single-store import', () => {
    const rows = buildImportRows([
      productSnapshot('https://signalsounds.eu/make-noise-maths-black', 'Make Noise Maths Black', 31900),
      productSnapshot('https://signalsounds.eu/make-noise-maths-silver', 'Make Noise Maths Silver', 32900),
    ], [
      matchCandidate('123', 'https://signalsounds.eu/make-noise-maths-black', 0.88),
      matchCandidate('123', 'https://signalsounds.eu/make-noise-maths-silver', 1),
    ]);

    assert.equal(rows.length, 1);
    assert.equal(rows[0].productUrl, 'https://signalsounds.eu/make-noise-maths-silver');
    assert.equal(rows[0].priceAmountMinor, 32900);
  });

  test('chooses one best module per product URL and records product match ambiguity', () => {
    const productUrl = 'https://schneidersladen.de/en/mfb-24db-vcf-ssi';
    const rows = buildImportRows([
      productSnapshot(productUrl, 'MFB - 24 dB VCF SSI - SchneidersLaden', 14900),
    ], [
      matchCandidate('99', productUrl, 1, {
        moduleName: '24 dB VCF SSI',
        manufacturerName: 'MFB',
      }),
      matchCandidate('100', productUrl, 0.96, {
        moduleName: '24 dB VCF',
        manufacturerName: 'MFB',
      }),
    ]);

    assert.equal(rows.length, 1);
    assert.equal(rows[0].moduleId, 99);
    assert.equal(rows[0].productUrl, productUrl);
    assert.equal(rows[0].rawMeta.priceHubProductMatchAmbiguity, true);
    assert.deepEqual(rows[0].rawMeta.priceHubAlternateMatchedModules, [
      {
        moduleId: 100,
        moduleName: '24 dB VCF',
        manufacturerName: 'MFB',
        matchScore: 0.96,
      },
    ]);
  });
});

test('requires explicit import paths and allows dry run without a write key', () => {
  const options = readCliOptions([
    '--store=signal-sounds-uk',
    '--products=products.json',
    '--matches=matches.json',
    '--dry-run',
  ], {});

  assert.equal(options.storeSlug, 'signal-sounds-uk');
  assert.equal(options.productsPath, 'products.json');
  assert.equal(options.matchesPath, 'matches.json');
  assert.equal(options.supabaseUrl, 'https://sozmatmywjpstwidzlss.supabase.co');
  assert.equal(options.supabaseKey, '');
  assert.equal(options.dryRun, true);
});

test('reads Supabase write key aliases and explicit import credentials', () => {
  const anonOptions = readCliOptions([
    '--store=signal-sounds-uk',
    '--products=products.json',
    '--matches=matches.json',
  ], {
    SUPABASE_ANON_KEY: 'anon-key',
  });

  assert.equal(anonOptions.supabaseKey, 'anon-key');

  const aliasOptions = readCliOptions([
    '--store=signal-sounds-uk',
    '--products=products.json',
    '--matches=matches.json',
  ], {
    SUPABASE_SERVICE_KEY: 'legacy-service-key',
  });

  assert.equal(aliasOptions.supabaseKey, 'legacy-service-key');

  const explicitOptions = readCliOptions([
    '--store=signal-sounds-uk',
    '--products=products.json',
    '--matches=matches.json',
    '--supabase-key=explicit-service-key',
  ], {
    SUPABASE_SERVICE_ROLE_KEY: 'env-service-key',
  });

  assert.equal(explicitOptions.supabaseKey, 'explicit-service-key');
});

test('skips strong matches when the source has no usable price', () => {
  const productUrl = 'https://www.thonk.co.uk/shop/befaco-trolley-bus-assembled/';
  const zeroPriceUrl = 'https://joranalogue.com/products/filter-8';
  const placeholderPriceUrl = 'https://busycircuits.com/products/alm-pg003';
  const lowPriceUrl = 'https://busycircuits.com/products/alm-pg009';
  const rows = buildImportRows([
    productSnapshot(productUrl, 'Befaco ON/OFF Module & Trolley Bus - Assembled', null, {
      adapter: 'woocommerce_store_api',
    }),
    productSnapshot(zeroPriceUrl, 'Filter 8', 0, {
      adapter: 'shopify_product_json',
    }),
    productSnapshot(placeholderPriceUrl, 'MFX DigiVerbs', 9999999900, {
      adapter: 'shopify_product_json',
    }),
    productSnapshot(lowPriceUrl, 'MUM M8 DSP', 1000, {
      adapter: 'shopify_product_json',
    }),
    productSnapshot('https://www.thonk.co.uk/shop/plinky-expander-assembled/', 'Plinky Expander - Assembled Module', 5500, {
      adapter: 'woocommerce_store_api',
    }),
  ], [
    matchCandidate('6506', productUrl, 1, {
      moduleName: 'ON/OFF',
      manufacturerName: 'Befaco',
    }),
    matchCandidate('1907', zeroPriceUrl, 1, {
      moduleName: 'Filter 8',
      manufacturerName: 'Joranalogue Audio Design',
    }),
    matchCandidate('4749', placeholderPriceUrl, 1, {
      moduleName: 'MFX DigiVerbs',
      manufacturerName: 'ALM Busy Circuits',
    }),
    matchCandidate('9211', lowPriceUrl, 1, {
      moduleName: 'MUM M8',
      manufacturerName: 'ALM Busy Circuits',
    }),
    matchCandidate('5349', 'https://www.thonk.co.uk/shop/plinky-expander-assembled/', 1, {
      moduleName: 'Plinky Eurorack Expander',
      manufacturerName: 'Making Sound Machines',
    }),
  ]);

  assert.equal(rows.length, 1);
  assert.equal(rows[0].moduleId, 5349);
  assert.equal(rows[0].priceAmountMinor, 5500);
});

test('prefers an in-stock panel variant and records variant ambiguity', () => {
  const blackUrl = 'https://schneidersladen.de/en/ajh-synth-finaliser-r-eq-black';
  const silverUrl = 'https://schneidersladen.de/en/ajh-synth-finaliser-r-eq-silver';
  const rows = buildImportRows([
    productSnapshot(blackUrl, 'AJH Synth - Finaliser R-EQ (Black) - SchneidersLaden', 47900, {
      availability: 'preorder',
      adapter: 'shopware_metadata',
      panelVariant: 'black',
    }),
    productSnapshot(silverUrl, 'AJH Synth - Finaliser R-EQ (Silver) - SchneidersLaden', 47900, {
      availability: 'in_stock',
      adapter: 'shopware_metadata',
      panelVariant: 'silver',
    }),
  ], [
    matchCandidate('4263', blackUrl, 1),
    matchCandidate('4263', silverUrl, 1),
  ]);

  assert.equal(rows.length, 1);
  assert.equal(rows[0].productUrl, silverUrl);
  assert.equal(rows[0].availability, 'in_stock');
  assert.equal(rows[0].rawMeta.panelVariant, 'silver');
  assert.equal(rows[0].rawMeta.priceHubVariantAmbiguity, true);
  assert.deepEqual(rows[0].rawMeta.priceHubPanelVariants, ['black', 'silver']);
  assert.deepEqual(rows[0].rawMeta.priceHubAlternateMatchedProducts, [
    {
      productUrl: blackUrl,
      productName: 'AJH Synth - Finaliser R-EQ (Black) - SchneidersLaden',
      availability: 'preorder',
      priceAmountMinor: 47900,
      currency: 'EUR',
      panelVariant: 'black',
      matchScore: 1,
    },
  ]);
});

test('does not prefer unknown panel availability over verified out of stock', () => {
  const blackUrl = 'https://signalsounds.eu/noise-engineering-melotus-versio-eurorack-stereo-grnaular-processor-module-black';
  const silverUrl = 'https://signalsounds.eu/noise-engineering-melotus-versio-eurorack-stereo-granular-processor-module-silver';
  const rows = buildImportRows([
    productSnapshot(blackUrl, 'Noise Engineering Melotus Versio Eurorack Stereo Granular Processor Module (Black)', 42500, {
      availability: 'out_of_stock',
      adapter: 'bigcommerce_metadata',
      panelVariant: 'black',
    }),
    productSnapshot(silverUrl, 'Noise Engineering Melotus Versio Eurorack Stereo Granular Processor Module (Silver)', 42500, {
      availability: 'unknown',
      adapter: 'bigcommerce_metadata',
      panelVariant: 'silver',
    }),
  ], [
    matchCandidate('3337', blackUrl, 1, {
      moduleName: 'Melotus Versio',
      manufacturerName: 'Noise Engineering',
    }),
    matchCandidate('3337', silverUrl, 1, {
      moduleName: 'Melotus Versio',
      manufacturerName: 'Noise Engineering',
    }),
  ]);

  assert.equal(rows.length, 1);
  assert.equal(rows[0].productUrl, blackUrl);
  assert.equal(rows[0].availability, 'out_of_stock');
  assert.equal(rows[0].rawMeta.panelVariant, 'black');
});

test('skips import rows whose product URL is already linked to another module', () => {
  const conflictingUrl = 'https://signalsounds.eu/doepfer-a-118-2-random-noise-eurorack-module-slim';
  const availableUrl = 'https://signalsounds.eu/schlappi-engineering-nibbler-eurorack-digital-shift-register-module-silver/';
  const conflictingRow = importRow(1872, conflictingUrl);
  const availableRow = importRow(4831, availableUrl);

  const filtered = filterRowsWithConflictingProductUrls([conflictingRow, availableRow], [
    { module_id: 2195, product_url: `${conflictingUrl}/` },
    { module_id: 4831, product_url: availableUrl },
  ]);

  assert.deepEqual(filtered.rows, [availableRow]);
  assert.deepEqual(filtered.skippedConflictingListings, [conflictingRow]);
});

test('skips product URL conflicts even when another existing variant matches the incoming module', () => {
  const productUrl = 'https://signalsounds.eu/doepfer-a-118-2-random-noise-eurorack-module-slim';
  const conflictingRow = importRow(1872, `${productUrl}/`);

  const filtered = filterRowsWithConflictingProductUrls([conflictingRow], [
    { module_id: 2195, product_url: `${productUrl}/` },
    { module_id: 1872, product_url: productUrl },
  ]);

  assert.deepEqual(filtered.rows, []);
  assert.deepEqual(filtered.skippedConflictingListings, [conflictingRow]);
});

test('skips import rows whose module ID is not present in Patcher', () => {
  const knownRow = importRow(4831, 'https://signalsounds.eu/schlappi-engineering-nibbler-eurorack-digital-shift-register-module-silver/');
  const unknownRow = importRow(999999, 'https://signalsounds.eu/unknown-module');

  const filtered = filterRowsWithExistingModules(
    [knownRow, unknownRow],
    new Set([4831]),
  );

  assert.deepEqual(filtered.rows, [knownRow]);
  assert.deepEqual(filtered.skippedUnknownModuleRows, [unknownRow]);
});

function productSnapshot(productUrl, productName, priceAmountMinor, overrides = {}) {
  const adapter = overrides.adapter ?? 'bigcommerce_metadata';
  const availability = overrides.availability ?? 'in_stock';
  const panelVariant = overrides.panelVariant;

  return {
    priceAmountMinor,
    currency: 'EUR',
    availability,
    productName,
    productUrl,
    imageUrl: null,
    rawMeta: {
      adapter,
      slug: productUrl.split('/').at(-1),
      ...(panelVariant ? { panelVariant } : {}),
    },
  };
}

function importRow(moduleId, productUrl) {
  return {
    moduleId,
    productUrl,
    productName: 'Matched product',
    priceAmountMinor: 12300,
    currency: 'EUR',
    availability: 'in_stock',
    externalProductId: null,
    externalHandle: productUrl.split('/').filter(Boolean).at(-1),
    rawMeta: {},
  };
}

function matchCandidate(moduleId, productUrl, score, overrides = {}) {
  const moduleName = overrides.moduleName ?? 'Maths';
  const manufacturerName = overrides.manufacturerName ?? 'Make Noise';

  return {
    moduleId,
    moduleName,
    manufacturerName,
    productUrl,
    productName: `${manufacturerName} ${moduleName}`,
    score,
    status: 'strong_candidate',
    reasons: ['module phrase found in product name'],
  };
}
