import { test } from '@playwright/test';
import {
  BROWSER_DATA_CONTRACTS,
  expectBrowserDataPage,
  expectBrowserLoadMoreData,
  expectBrowserRecordsPage,
  expectBrowserTransientRecovery
} from './helpers/browser-data-contract';


const browserDataContracts = [
  BROWSER_DATA_CONTRACTS.modules,
  BROWSER_DATA_CONTRACTS.racks,
  BROWSER_DATA_CONTRACTS.patches
];

test.describe('Public browser data-source contract', () => {
  test('keeps records visible while navigating across data-backed browsers', async ({page}) => {
    await expectBrowserDataPage(page, BROWSER_DATA_CONTRACTS.modules);
    await expectBrowserDataPage(page, BROWSER_DATA_CONTRACTS.racks);
    await expectBrowserDataPage(page, BROWSER_DATA_CONTRACTS.patches);
    await expectBrowserRecordsPage(page, BROWSER_DATA_CONTRACTS.modules);
    await expectBrowserLoadMoreData(page, BROWSER_DATA_CONTRACTS.modules);
  });

  for (const contract of browserDataContracts) {
    test(`recovers ${ contract.table } records after one transient list failure`, async ({page}) => {
      await expectBrowserTransientRecovery(page, contract);
    });
  }
});
