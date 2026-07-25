import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyDisappearanceDeactivation, buildActiveListingRefreshRows, buildImportRows, calculateStaggeredNextCheckAt, filterRowsWithConflictingProductUrls, filterRowsWithExistingModules, importRows, planDisappearanceDeactivation, readCliOptions, readExistingModuleIds } from '../price-hub/import-local-snapshots.ts';
import { assertSupabaseWriteKeyCanWrite, readSupabaseJwtRole } from '../price-hub/local-env.ts';

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
  assert.equal(options.fullCatalog, false);
});

test('accepts explicit full-catalog mode for disappearance deactivation', () => {
  const options = readCliOptions([
    '--store=signal-sounds-uk',
    '--products=products.json',
    '--matches=matches.json',
    '--dry-run',
    '--full-catalog',
  ], {});

  assert.equal(options.fullCatalog, true);
});

test('reads only service-role aliases as default write credentials', () => {
  const anonOptions = readCliOptions([
    '--store=signal-sounds-uk',
    '--products=products.json',
    '--matches=matches.json',
  ], {
    SUPABASE_ANON_KEY: 'anon-key',
  });

  assert.equal(anonOptions.supabaseKey, '');

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

test('preflights existing modules in backend-safe 500-ID batches', async () => {
  const requestedBatches = [];
  const moduleIds = Array.from({ length: 1_001 }, (_, index) => index + 1);
  const supabase = {
    from(table) {
      assert.equal(table, 'modules');
      return {
        select(columns) {
          assert.equal(columns, 'id');
          return this;
        },
        async in(column, ids) {
          assert.equal(column, 'id');
          requestedBatches.push(ids);
          return {
            data: ids.map((id) => ({ id })),
            error: null,
          };
        },
      };
    },
  };

  const existingIds = await readExistingModuleIds(supabase, moduleIds);

  assert.deepEqual(requestedBatches.map((batch) => batch.length), [500, 500, 1]);
  assert.equal(existingIds.size, 1_001);
});

test('rejects anon and authenticated JWT keys for live write imports', () => {
  const anonKey = jwtForRole('anon');
  const authenticatedKey = jwtForRole('authenticated');
  const serviceRoleKey = jwtForRole('service_role');

  assert.equal(readSupabaseJwtRole(anonKey), 'anon');
  assert.equal(readSupabaseJwtRole(serviceRoleKey), 'service_role');
  assert.throws(
    () => assertSupabaseWriteKeyCanWrite(anonKey, 'help'),
    /anon keys are read-only/,
  );
  assert.throws(
    () => assertSupabaseWriteKeyCanWrite(authenticatedKey, 'help'),
    /authenticated keys are read-only/,
  );
  assert.doesNotThrow(() => assertSupabaseWriteKeyCanWrite(serviceRoleKey, 'help'));
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

test('builds refresh rows for observed active listings without current strong matches', () => {
  const productUrl = 'https://schneidersladen.de/en/doepfer-a-121d-multimode-dual-filter-silver';
  const rows = buildActiveListingRefreshRows([
    productSnapshot(productUrl, 'Doepfer A-121d Multimode Dual Filter Silver', 15900),
  ], [
    { module_id: 3438, product_url: `${productUrl}/` },
  ]);

  assert.equal(rows.length, 1);
  assert.equal(rows[0].moduleId, 3438);
  assert.equal(rows[0].productUrl, productUrl);
  assert.equal(rows[0].rawMeta.priceHubRefreshSource, 'active_listing');
});

test('does not duplicate active listing refresh rows already covered by accepted matches', () => {
  const productUrl = 'https://schneidersladen.de/en/doepfer-a-121d-multimode-dual-filter-silver';
  const existingRow = {
    moduleId: 3438,
    productUrl,
    productName: 'Doepfer A-121d Multimode Dual Filter Silver',
    priceAmountMinor: 15900,
    currency: 'EUR',
    availability: 'in_stock',
    externalProductId: null,
    externalHandle: 'doepfer-a-121d-multimode-dual-filter-silver',
    rawMeta: {},
  };
  const rows = buildActiveListingRefreshRows([
    productSnapshot(productUrl, 'Doepfer A-121d Multimode Dual Filter Silver', 15900),
  ], [
    { module_id: 3438, product_url: `${productUrl}/` },
  ], [
    existingRow,
  ]);

  assert.deepEqual(rows, []);
});

test('does not duplicate active listing refresh rows when the crawl repeats a product URL', () => {
  const productUrl = 'https://schneidersladen.de/en/ritual-electronics-pointeuse';
  const rows = buildActiveListingRefreshRows([
    productSnapshot(productUrl, 'Ritual Electronics Pointeuse', 10500),
    productSnapshot(`${productUrl}/`, 'Ritual Electronics Pointeuse', 10500),
  ], [
    { module_id: 10623, product_url: productUrl },
  ]);

  assert.equal(rows.length, 1);
  assert.equal(rows[0].moduleId, 10623);
});

test('does not add active listing refresh rows for modules already covered by accepted matches', () => {
  const refreshUrl = 'https://schneidersladen.de/en/doepfer-a-121d-multimode-dual-filter-silver';
  const matchedUrl = 'https://schneidersladen.de/en/doepfer-a-121d-multimode-dual-filter-black';
  const existingRow = {
    moduleId: 3438,
    productUrl: matchedUrl,
    productName: 'Doepfer A-121d Multimode Dual Filter Black',
    priceAmountMinor: 15900,
    currency: 'EUR',
    availability: 'in_stock',
    externalProductId: null,
    externalHandle: 'doepfer-a-121d-multimode-dual-filter-black',
    rawMeta: {},
  };
  const rows = buildActiveListingRefreshRows([
    productSnapshot(refreshUrl, 'Doepfer A-121d Multimode Dual Filter Silver', 15900),
  ], [
    { module_id: 3438, product_url: refreshUrl },
  ], [
    existingRow,
  ]);

  assert.deepEqual(rows, []);
});

test('imports observed active listing refresh rows when strong matches are empty', async () => {
  const productUrl = 'https://store.example/products/doepfer-a-121d-multimode-dual-filter-silver';
  const snapshots = [];
  const supabase = mockActiveRefreshSupabase({
    activeListings: [
      { id: 31, module_id: 3438, product_url: `${productUrl}/` },
    ],
    snapshots,
  });

  const summary = await importRows(
    supabase,
    'signal-sounds-uk',
    [],
    undefined,
    [productSnapshot(productUrl, 'Doepfer A-121d Multimode Dual Filter Silver', 15900)],
  );

  assert.equal(summary.acceptedMatches, 0);
  assert.equal(summary.upsertedListings, 1);
  assert.equal(summary.insertedSnapshots, 1);
  assert.equal(snapshots.length, 1);
  assert.equal(snapshots[0].listing_id, 31);
  assert.equal(snapshots[0].price_amount_minor, 15900);
  assert.equal(snapshots[0].raw_meta.priceHubRefreshSource, 'active_listing');
});

test('imports observed active listing refresh rows past the first active-listing page', async () => {
  const productUrl = 'https://store.example/products/doepfer-a-121d-multimode-dual-filter-silver';
  const snapshots = [];
  const supabase = mockActiveRefreshSupabase({
    activeListings: [
      ...Array.from({ length: 500 }, (_, index) => ({
        id: index + 1,
        module_id: index + 1,
        product_url: `https://store.example/products/other-${index}`,
      })),
      { id: 700, module_id: 3438, product_url: `${productUrl}/` },
    ],
    snapshots,
  });

  const summary = await importRows(
    supabase,
    'signal-sounds-uk',
    [],
    undefined,
    [productSnapshot(productUrl, 'Doepfer A-121d Multimode Dual Filter Silver', 15900)],
  );

  assert.equal(summary.upsertedListings, 1);
  assert.equal(summary.insertedSnapshots, 1);
  assert.equal(snapshots[0].listing_id, 700);
});

test('marks observed active listings stale when the current product is below the import price floor', async () => {
  const productUrl = 'https://store.example/products/make-noise-blank-panel-4hp';
  const snapshots = [];
  const updates = [];
  const supabase = mockActiveRefreshSupabase({
    activeListings: [
      { id: 41, module_id: 3146, product_url: productUrl },
    ],
    snapshots,
    updates,
  });

  const summary = await importRows(
    supabase,
    'signal-sounds-uk',
    [],
    undefined,
    [productSnapshot(productUrl, 'Make Noise Blank Panel 4HP', 600)],
  );

  assert.equal(summary.upsertedListings, 0);
  assert.equal(summary.insertedSnapshots, 0);
  assert.equal(summary.deactivatedListings, 1);
  assert.deepEqual(snapshots, []);
  assert.equal(updates.length, 1);
  assert.equal(updates[0].active, false);
  assert.equal(updates[0].verification_status, 'stale');
  assert.match(updates[0].last_error, /^not_importable_since_crawl:\d{4}-\d{2}-\d{2}$/);
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
    { module_id: 2195, store_id: 9, product_url: `${conflictingUrl}/` },
    { module_id: 4831, store_id: 10, product_url: availableUrl },
  ], 10);

  assert.deepEqual(filtered.rows, [availableRow]);
  assert.deepEqual(filtered.skippedConflictingListings, [conflictingRow]);
});

test('skips product URL conflicts even when another existing variant matches the incoming module', () => {
  const productUrl = 'https://signalsounds.eu/doepfer-a-118-2-random-noise-eurorack-module-slim';
  const conflictingRow = importRow(1872, `${productUrl}/`);

  const filtered = filterRowsWithConflictingProductUrls([conflictingRow], [
    { module_id: 2195, store_id: 9, product_url: `${productUrl}/` },
    { module_id: 1872, store_id: 10, product_url: productUrl },
  ], 10);

  assert.deepEqual(filtered.rows, []);
  assert.deepEqual(filtered.skippedConflictingListings, [conflictingRow]);
});

test('skips product URL conflicts from another existing store listing', () => {
  const productUrl = 'https://signalsounds.eu/doepfer-a-118-2-random-noise-eurorack-module-slim';
  const conflictingRow = importRow(1872, productUrl);

  const filtered = filterRowsWithConflictingProductUrls([conflictingRow], [
    { module_id: 1872, store_id: 9, product_url: `${productUrl}/` },
  ], 10);

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

test('calculates deterministic future next-check staggering for imported listings', () => {
  const importTime = '2026-07-07T09:00:00.000Z';
  const identity = {
    moduleId: 4831,
    storeId: 10,
    productUrl: 'https://signalsounds.eu/schlappi-engineering-nibbler-eurorack-digital-shift-register-module-silver/?variant=1#buy',
  };

  const firstNextCheck = calculateStaggeredNextCheckAt(importTime, identity);
  const secondNextCheck = calculateStaggeredNextCheckAt(importTime, {
    ...identity,
    productUrl: 'https://signalsounds.eu/schlappi-engineering-nibbler-eurorack-digital-shift-register-module-silver/',
  });
  const offsetMs = Date.parse(firstNextCheck) - Date.parse(importTime);

  assert.equal(firstNextCheck, secondNextCheck);
  assert.ok(offsetMs >= 1000);
  assert.ok(offsetMs <= 7 * 24 * 60 * 60 * 1000);
});

test('distributes different imported listings across the next-check window', () => {
  const importTime = '2026-07-07T09:00:00.000Z';
  const nextChecks = Array.from({ length: 24 }, (_, index) => calculateStaggeredNextCheckAt(importTime, {
    moduleId: 1000 + index,
    storeId: 10 + (index % 3),
    productUrl: `https://store.example/products/module-${index}`,
  }));
  const uniqueNextChecks = new Set(nextChecks);

  assert.ok(uniqueNextChecks.size > 18);
  for (const nextCheck of nextChecks) {
    const offsetMs = Date.parse(nextCheck) - Date.parse(importTime);
    assert.ok(offsetMs >= 1000);
    assert.ok(offsetMs <= 7 * 24 * 60 * 60 * 1000);
  }
});

test('plans missing active listing deactivation only for full-catalog evidence', () => {
  const now = '2026-07-07T08:00:00.000Z';
  const observedUrls = Array.from({ length: 25 }, (_, index) => `https://store.example/products/module-${index}`);
  const missingListing = {
    id: 10,
    module_id: 999,
    product_url: 'https://store.example/products/retired-module/',
  };
  const skippedListing = {
    id: 12,
    module_id: 1001,
    product_url: 'https://store.example/products/skipped-module/',
  };
  const keptListing = {
    id: 11,
    module_id: 1000,
    product_url: 'https://store.example/products/module-1/',
  };

  const plan = planDisappearanceDeactivation(
    [missingListing, keptListing],
    observedUrls,
    {
      productCount: 25,
      importRowCount: 5,
      hitMaxProducts: false,
      hasExplicitBounds: false,
    },
    now,
  );

  assert.equal(plan.eligible, true);
  assert.equal(plan.reason, 'not_seen_since_full_catalog:2026-07-07');
  assert.deepEqual(plan.listings, [missingListing]);

  const skippedMetadataPlan = planDisappearanceDeactivation(
    [missingListing, skippedListing, keptListing],
    observedUrls,
    {
      productCount: 25,
      importRowCount: 5,
      hitMaxProducts: false,
      skippedProducts: 1,
      skippedProductUrls: [skippedListing.product_url],
      hasExplicitBounds: false,
    },
    now,
  );

  assert.equal(skippedMetadataPlan.eligible, true);
  assert.deepEqual(skippedMetadataPlan.listings, [missingListing]);

  const goneSkippedMetadataPlan = planDisappearanceDeactivation(
    [missingListing, skippedListing, keptListing],
    observedUrls,
    {
      productCount: 25,
      importRowCount: 5,
      hitMaxProducts: false,
      skippedProducts: 1,
      skippedGoneProductUrls: [skippedListing.product_url],
      hasExplicitBounds: false,
    },
    now,
  );

  assert.equal(goneSkippedMetadataPlan.eligible, true);
  assert.deepEqual(goneSkippedMetadataPlan.listings, [missingListing, skippedListing]);
});

test('skips missing listing deactivation for partial or low-coverage crawls', () => {
  const observedUrls = Array.from({ length: 25 }, (_, index) => `https://store.example/products/module-${index}`);
  const existingListings = [{
    id: 10,
    module_id: 999,
    product_url: 'https://store.example/products/retired-module/',
  }];

  const hitCapPlan = planDisappearanceDeactivation(existingListings, observedUrls, {
    productCount: 25,
    importRowCount: 5,
    hitMaxProducts: true,
    hasExplicitBounds: false,
  });
  assert.equal(hitCapPlan.eligible, false);
  assert.match(hitCapPlan.skipReason, /hit --max-products/);
  assert.deepEqual(hitCapPlan.listings, []);

  const boundedPlan = planDisappearanceDeactivation(existingListings, observedUrls, {
    productCount: 25,
    importRowCount: 5,
    hitMaxProducts: false,
    hasExplicitBounds: true,
  });
  assert.equal(boundedPlan.eligible, false);
  assert.match(boundedPlan.skipReason, /explicit bounds/);

  const hitPageCapPlan = planDisappearanceDeactivation(existingListings, observedUrls, {
    productCount: 25,
    importRowCount: 5,
    hitMaxProducts: false,
    hitMaxPages: true,
    hasExplicitBounds: false,
  });
  assert.equal(hitPageCapPlan.eligible, false);
  assert.match(hitPageCapPlan.skipReason, /hit max pages/);

  const skippedProductsPlan = planDisappearanceDeactivation(existingListings, observedUrls, {
    productCount: 25,
    importRowCount: 5,
    hitMaxProducts: false,
    skippedProducts: 1,
    hasExplicitBounds: false,
  });
  assert.equal(skippedProductsPlan.eligible, false);
  assert.match(skippedProductsPlan.skipReason, /without preserving all skipped URLs/);

  const hitSitemapFileCapPlan = planDisappearanceDeactivation(existingListings, observedUrls, {
    productCount: 25,
    importRowCount: 5,
    hitMaxProducts: false,
    hitMaxSitemapFiles: true,
    hasExplicitBounds: false,
  });
  assert.equal(hitSitemapFileCapPlan.eligible, false);
  assert.match(hitSitemapFileCapPlan.skipReason, /max sitemap files/);

  const lowCoveragePlan = planDisappearanceDeactivation(existingListings, observedUrls.slice(0, 24), {
    productCount: 24,
    importRowCount: 5,
    hitMaxProducts: false,
    hasExplicitBounds: false,
  });
  assert.equal(lowCoveragePlan.eligible, false);
  assert.match(lowCoveragePlan.skipReason, /below deactivation minimum/);
});

test('dry-run disappearance deactivation reports count without writing', async () => {
  const updates = [];
  const supabase = mockDisappearanceSupabase(updates);

  const summary = await applyDisappearanceDeactivation(
    supabase,
    'signal-sounds-uk',
    Array.from({ length: 25 }, (_, index) => `https://store.example/products/module-${index}`),
    {
      productCount: 25,
      importRowCount: 5,
      hitMaxProducts: false,
      hasExplicitBounds: false,
    },
    { dryRun: true },
  );

  assert.deepEqual(summary, {
    deactivatedListings: 1,
    deactivationSkippedReason: null,
  });
  assert.deepEqual(updates, []);
});

test('full-catalog disappearance deactivation writes stale inactive state for missing listings', async () => {
  const updates = [];
  const supabase = mockDisappearanceSupabase(updates);

  const summary = await applyDisappearanceDeactivation(
    supabase,
    'signal-sounds-uk',
    Array.from({ length: 25 }, (_, index) => `https://store.example/products/module-${index}`),
    {
      productCount: 25,
      importRowCount: 5,
      hitMaxProducts: false,
      hasExplicitBounds: false,
    },
  );

  assert.equal(summary.deactivatedListings, 1);
  assert.equal(summary.deactivationSkippedReason, null);
  assert.equal(updates.length, 1);
  assert.equal(updates[0].active, false);
  assert.equal(updates[0].verification_status, 'stale');
  assert.match(updates[0].last_error, /^not_seen_since_full_catalog:\d{4}-\d{2}-\d{2}$/);
});

test('max-page-truncated disappearance evidence does not write stale inactive state', async () => {
  const updates = [];
  const supabase = mockDisappearanceSupabase(updates);

  const summary = await applyDisappearanceDeactivation(
    supabase,
    'signal-sounds-uk',
    Array.from({ length: 25 }, (_, index) => `https://store.example/products/module-${index}`),
    {
      productCount: 25,
      importRowCount: 5,
      hitMaxProducts: false,
      hitMaxPages: true,
      hasExplicitBounds: false,
    },
  );

  assert.equal(summary.deactivatedListings, 0);
  assert.match(summary.deactivationSkippedReason, /hit max pages/);
  assert.deepEqual(updates, []);
});

test('skipped metadata product pages protect skipped active listings from stale deactivation', async () => {
  const updates = [];
  const supabase = mockDisappearanceSupabase(updates);
  const skippedUrl = 'https://store.example/products/missing-module/';

  const summary = await applyDisappearanceDeactivation(
    supabase,
    'signal-sounds-uk',
    Array.from({ length: 25 }, (_, index) => `https://store.example/products/module-${index}`),
    {
      productCount: 25,
      importRowCount: 5,
      hitMaxProducts: false,
      skippedProducts: 1,
      skippedProductUrls: [skippedUrl],
      hasExplicitBounds: false,
    },
  );

  assert.equal(summary.deactivatedListings, 0);
  assert.equal(summary.deactivationSkippedReason, null);
  assert.deepEqual(updates, []);
});

test('partial disappearance deactivation does not write stale inactive state', async () => {
  const updates = [];
  const supabase = mockDisappearanceSupabase(updates);

  const summary = await applyDisappearanceDeactivation(
    supabase,
    'signal-sounds-uk',
    Array.from({ length: 25 }, (_, index) => `https://store.example/products/module-${index}`),
    {
      productCount: 25,
      importRowCount: 5,
      hitMaxProducts: true,
      hasExplicitBounds: false,
    },
  );

  assert.equal(summary.deactivatedListings, 0);
  assert.match(summary.deactivationSkippedReason, /hit --max-products/);
  assert.deepEqual(updates, []);
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

function mockDisappearanceSupabase(updates) {
  return {
    from(table) {
      if (table === 'stores') {
        return {
          select(columns) {
            assert.equal(columns, 'id,slug,name,country_code,base_url,search_url_template,adapter_kind,currency_hint,active,price_tracking_enabled,rate_limit_per_day,created_at,updated_at');
            return this;
          },
          eq(column, value) {
            assert.equal(column, 'slug');
            assert.equal(value, 'signal-sounds-uk');
            return this;
          },
          async single() {
            return {
              data: {
                id: 7,
                slug: 'signal-sounds-uk',
                name: 'Signal Sounds UK',
                country_code: 'GB',
                base_url: 'https://signalsounds.com/',
                search_url_template: null,
                adapter_kind: 'bigcommerce_metadata',
                currency_hint: 'GBP',
                active: true,
                price_tracking_enabled: true,
                rate_limit_per_day: 100,
                created_at: '2026-07-07T00:00:00.000Z',
                updated_at: '2026-07-07T00:00:00.000Z',
              },
              error: null,
            };
          },
        };
      }
      if (table === 'module_store_listings') {
        const listingQuery = {
          select(columns) {
            assert.equal(columns, 'id,module_id,product_url');
            return this;
          },
          eq(column, value) {
            if (column === 'store_id') {
              assert.equal(value, 7);
              return this;
            }
            if (column === 'active') {
              assert.equal(value, true);
              return this;
            }
            throw new Error(`Unexpected eq ${column}`);
          },
          range(from, to) {
            assert.equal(from, 0);
            assert.equal(to, 499);
            return Promise.resolve({
              data: [
                { id: 1, module_id: 1, product_url: 'https://store.example/products/module-1/' },
                { id: 2, module_id: 2, product_url: 'https://store.example/products/missing-module/' },
              ],
              error: null,
            });
          },
          update(value) {
            updates.push(value);
            return this;
          },
          async in() {
            return { error: null };
          },
        };
        return {
          select(columns) {
            return listingQuery.select(columns);
          },
          eq(column, value) {
            return listingQuery.eq(column, value);
          },
          update(value) {
            return listingQuery.update(value);
          },
          async in() {
            return listingQuery.in();
          },
        };
      }
      throw new Error(`Unexpected table ${table}`);
    },
  };
}

function mockActiveRefreshSupabase({ activeListings, snapshots, updates = [] }) {
  return {
    from(table) {
      if (table === 'stores') {
        return {
          select(columns) {
            assert.equal(columns, 'id,slug,name,country_code,base_url,search_url_template,adapter_kind,currency_hint,active,price_tracking_enabled,rate_limit_per_day,created_at,updated_at');
            return this;
          },
          eq(column, value) {
            assert.equal(column, 'slug');
            assert.equal(value, 'signal-sounds-uk');
            return this;
          },
          async single() {
            return {
              data: {
                id: 7,
                slug: 'signal-sounds-uk',
                name: 'Signal Sounds UK',
                country_code: 'GB',
                base_url: 'https://signalsounds.com/',
                search_url_template: null,
                adapter_kind: 'bigcommerce_metadata',
                currency_hint: 'GBP',
                active: true,
                price_tracking_enabled: true,
                rate_limit_per_day: 100,
                created_at: '2026-07-07T00:00:00.000Z',
                updated_at: '2026-07-07T00:00:00.000Z',
              },
              error: null,
            };
          },
        };
      }
      if (table === 'module_store_listings') {
        return {
          select(columns) {
            assert.ok([
              'id,module_id,product_url',
              'id,module_id,store_id,product_url,external_product_id,external_handle,active,verification_status,last_checked_at,last_success_at,next_check_at,failure_count,last_error,created_at,updated_at',
            ].includes(columns));
            return this;
          },
          eq(column, value) {
            if (column === 'store_id') {
              assert.equal(value, 7);
              return this;
            }
            if (column === 'active') {
              assert.equal(value, true);
              return this;
            }
            throw new Error(`Unexpected eq ${column}`);
          },
          range(from, to) {
            const page = activeListings.slice(from, to + 1);
            return Promise.resolve({ data: page, error: null });
          },
          upsert(rows, options) {
            assert.deepEqual(options, { onConflict: 'module_id,store_id' });
            return {
              async select(columns) {
                assert.equal(columns, 'id,module_id,store_id,product_url,external_product_id,external_handle,active,verification_status,last_checked_at,last_success_at,next_check_at,failure_count,last_error,created_at,updated_at');
                return {
                  data: rows.map((row) => ({
                    id: activeListings.find((listing) => listing.module_id === row.module_id)?.id ?? 99,
                    module_id: row.module_id,
                    store_id: row.store_id,
                    product_url: row.product_url,
                    external_product_id: row.external_product_id,
                    external_handle: row.external_handle,
                    active: row.active,
                    verification_status: row.verification_status,
                    last_checked_at: row.last_checked_at,
                    last_success_at: row.last_success_at,
                    next_check_at: row.next_check_at,
                    failure_count: row.failure_count,
                    last_error: row.last_error,
                    created_at: '2026-07-07T00:00:00.000Z',
                    updated_at: '2026-07-07T00:00:00.000Z',
                  })),
                  error: null,
                };
              },
            };
          },
          update(value) {
            updates.push(value);
            return this;
          },
          async in() {
            return { error: null };
          },
        };
      }
      if (table === 'module_price_snapshots') {
        return {
          insert(rows) {
            snapshots.push(...rows);
            return Promise.resolve({ error: null });
          },
        };
      }
      throw new Error(`Unexpected table ${table}`);
    },
  };
}

function jwtForRole(role) {
  return [
    Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'),
    Buffer.from(JSON.stringify({ role })).toString('base64url'),
    'signature',
  ].join('.');
}
