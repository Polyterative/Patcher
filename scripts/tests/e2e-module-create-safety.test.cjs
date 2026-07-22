const assert = require('node:assert/strict');
const test = require('node:test');

const {analyzeSource} = require('../checks/e2e-module-create-safety.cjs');

function messagesFor(source) {
  return analyzeSource('fixture.spec.ts', source).map(issue => issue.message);
}

test('rejects unsafe real browser module POST waits', () => {
  const messages = messagesFor(`
    import {test} from '@playwright/test';

    test('submits a module for real', async ({page}) => {
      const createModule = waitForResponseOk(page, '/rest/v1/modules', 'POST');
      await page.getByRole('button', {name: /confirm submission/i}).click();
      await createModule;
    });
  `);

  assert.equal(messages.length, 1);
  assert.match(messages[0], /browser module CREATE/);
});

test('accepts browser module POST waits when the spec fulfills the route', () => {
  const messages = messagesFor(`
    import {test} from '@playwright/test';

    test('submits a module through a mock', async ({page}) => {
      await page.route('**/rest/v1/modules*', async route => {
        if (route.request().method() === 'POST') {
          await route.fulfill({status: 201, body: '[]'});
          return;
        }
        await route.continue();
      });
      const createModule = waitForResponseOk(page, '/rest/v1/modules', 'POST');
      await page.getByRole('button', {name: /confirm submission/i}).click();
      await createModule;
    });
  `);

  assert.deepEqual(messages, []);
});

test('accepts private direct RLS module fixtures', () => {
  const messages = messagesFor(`
    const createTestModule = async (authedClient, testUserId) => {
      await authedClient
        .from('modules')
        .insert({
          name: '__rls-test-mod',
          hp: 4,
          manufacturerId: 1,
          standard: 1,
          public: false,
          isApproved: false,
          submitter: testUserId
        })
        .select('id')
        .single();
    };
  `);

  assert.deepEqual(messages, []);
});

test('rejects public direct module inserts', () => {
  const messages = messagesFor(`
    const createPublicModule = async authedClient => {
      await authedClient
        .from('modules')
        .insert({
          name: 'leaky module',
          hp: 4,
          manufacturerId: 1,
          standard: 1,
          public: true,
          isApproved: false
        });
    };
  `);

  assert.equal(messages.length, 1);
  assert.match(messages[0], /direct Supabase modules insert\/upsert/);
});
