#!/usr/bin/env node
/**
 * Guard script for authenticated e2e tests.
 * Exits 0 with a warning when credentials are not set so CI doesn't break.
 */
import {execSync} from 'child_process';
import {existsSync, readFileSync} from 'fs';
import {resolve} from 'path';

const rootDir = new URL('..', import.meta.url).pathname;

// Load .env if present (mirrors auth helper logic)
const envPath = resolve(rootDir, '.env');
if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, 'utf8').split('\n')) {
        const match = line.match(/^\s*([\w]+)\s*=\s*(.*)$/);
        if (match) process.env[match[1]] ??= match[2].replace(/^['"]|['"]$/g, '');
    }
}

if (!process.env['E2E_TEST_EMAIL'] || !process.env['E2E_TEST_PASSWORD']) {
    console.warn('[e2e-auth] Skipping authenticated e2e: E2E_TEST_EMAIL and E2E_TEST_PASSWORD are not set.');
    process.exit(0);
}

execSync('playwright test --reporter=list --project=chromium-auth', {stdio: 'inherit', cwd: rootDir});