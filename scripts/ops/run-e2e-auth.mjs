#!/usr/bin/env node
/**
 * Guard script for authenticated e2e tests.
 * Exits 0 with a warning when credentials are not set so CI doesn't break.
 */
import {spawnSync} from 'child_process';
import {existsSync, readFileSync} from 'fs';
import {fileURLToPath} from 'url';
import {resolve} from 'path';

const rootDir = fileURLToPath(new URL('../..', import.meta.url));

function normalizePlaywrightArgs(args) {
    const normalized = [];

    for (let index = 0; index < args.length; index++) {
        const arg = args[index];
        if (arg === '--include') {
            const include = args[index + 1];
            if (include) {
                normalized.push(include.replace(/^\*\*\//, ''));
                index++;
            }
            continue;
        }

        if (arg.startsWith('--include=')) {
            normalized.push(arg.slice('--include='.length).replace(/^\*\*\//, ''));
            continue;
        }

        normalized.push(arg);
    }

    return normalized;
}

// Load .env if present (mirrors auth helper logic)
const envPath = resolve(rootDir, '.env');
if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, 'utf8').split('\n')) {
        const match = line.match(/^\s*([\w]+)\s*=\s*(.*)$/);
        const value = match?.[2].replace(/^['"]|['"]$/g, '').trim();
        if (match && value) process.env[match[1]] ??= value;
    }
}

if (!process.env['E2E_TEST_EMAIL'] || !process.env['E2E_TEST_PASSWORD']) {
    console.warn('[e2e-auth] Skipping authenticated e2e: E2E_TEST_EMAIL and E2E_TEST_PASSWORD are not set.');
    process.exit(0);
}

const args = ['test', '--reporter=list', '--project=chromium-auth', ...normalizePlaywrightArgs(process.argv.slice(2))];
if (!args.some(arg => arg === '--workers' || arg.startsWith('--workers='))) {
    args.splice(1, 0, '--workers=1');
}
const result = spawnSync('playwright', args, {stdio: 'inherit', cwd: rootDir});

if (result.error) {
    throw result.error;
}
process.exit(result.status ?? 1);