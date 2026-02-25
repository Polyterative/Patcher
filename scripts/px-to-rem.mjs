#!/usr/bin/env node
/**
 * px-to-rem.mjs
 * Converts hardcoded px values → rem in SCSS and TypeScript source files.
 *
 * Usage:
 *   node scripts/px-to-rem.mjs              # dry-run: preview all changes
 *   node scripts/px-to-rem.mjs --write      # apply changes in place
 *   node scripts/px-to-rem.mjs --write src/app/foo.scss   # specific files
 *
 * Skipped automatically:
 *   - 0px  (zero positions)
 *   - 1px  (hairline borders)
 *   - Lines containing  // px-ok  or  /* px-ok  (manual exemptions)
 */

import {readFileSync, writeFileSync} from 'fs';
import {execSync} from 'child_process';
import {relative} from 'path';

const ROOT = process.cwd();
const WRITE = process.argv.includes('--write');
const EXPLICIT = process.argv.slice(2).filter(a => !a.startsWith('--'));

// Matches any complete px value (integer or decimal, including negatives).
// The replacement function decides what to keep vs. convert.
const PX_RE = /(-?(?:\d+\.)?\d+)px\b/g;

function pxToRem(px) {
    const rem = Number(px) / 16;
    return `${parseFloat(rem.toFixed(4))}rem`;
}

function convert(match, px) {
    const num = Number(px);
    // Keep exact-integer 0 and ±1 (zero positions, hairline borders)
    if (Number.isInteger(num) && Math.abs(num) <= 1) return match;
    return pxToRem(px);
}

function getFiles() {
    if (EXPLICIT.length > 0) return EXPLICIT;
    const out = execSync(
        'find src -type f \\( -name "*.scss" -o -name "*.ts" \\) -not -path "*/node_modules/*"',
        {cwd: ROOT, encoding: 'utf8'}
    );
    return out.trim().split('\n').filter(Boolean);
}

let totalFiles = 0;
let totalChanges = 0;

for (const file of getFiles()) {
    const original = readFileSync(file, 'utf8');
    const lines = original.split('\n');
    let changed = false;

    const next = lines.map(line => {
        if (/px-ok/.test(line)) return line;          // honour exemption marker
        const replaced = line.replace(PX_RE, convert);
        if (replaced !== line) changed = true;
        return replaced;
    });

    if (!changed) continue;

    totalFiles++;
    const rel = relative(ROOT, file);

    if (WRITE) {
        writeFileSync(file, next.join('\n'), 'utf8');
        console.log(`✔  ${rel}`);
    } else {
        console.log(`\n── ${rel}`);
        lines.forEach((line, i) => {
            if (next[i] !== line) {
                console.log(`  ${String(i + 1).padStart(4)}  - ${line.trimEnd()}`);
                console.log(`  ${String(i + 1).padStart(4)}  + ${next[i].trimEnd()}`);
                totalChanges++;
            }
        });
    }
}

if (totalFiles === 0) {
    console.log('✔  No px values found. Nothing to do.');
} else if (!WRITE) {
    console.log(`\n${totalChanges} line(s) across ${totalFiles} file(s) would change.`);
    console.log('Run with --write to apply.');
} else {
    console.log(`\n✔  Converted ${totalFiles} file(s).`);
}