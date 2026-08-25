import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  LOCAL_DEV_SERVER_PORT,
  usesLocalDevServer
} from '../../e2e/helpers/local-dev-server.ts';

test('usesLocalDevServer: true for localhost on the dev server port', () => {
  assert.equal(usesLocalDevServer(`http://localhost:${ LOCAL_DEV_SERVER_PORT }`), true);
});

test('usesLocalDevServer: true for 127.0.0.1 on the dev server port', () => {
  assert.equal(usesLocalDevServer(`http://127.0.0.1:${ LOCAL_DEV_SERVER_PORT }`), true);
});

test('usesLocalDevServer: false for localhost on a different port', () => {
  assert.equal(usesLocalDevServer('http://localhost:4200'), false);
});

test('usesLocalDevServer: false for a remote/staging host', () => {
  assert.equal(usesLocalDevServer('https://staging.example.com'), false);
  assert.equal(usesLocalDevServer(`https://staging.example.com:${ LOCAL_DEV_SERVER_PORT }`), false);
});

test('usesLocalDevServer: false for a malformed URL (does not throw)', () => {
  assert.equal(usesLocalDevServer('not-a-valid-url'), false);
  assert.equal(usesLocalDevServer(''), false);
});
