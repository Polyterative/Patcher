#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');

const repoRoot = path.resolve(__dirname, '..');
const forbiddenGlobalModules = new Set([
  'src/app/style/brand-globals',
  'src/app/style/brand-globals.scss',
  'src/app/style/commons_customizations',
  'src/app/style/commons_customizations.scss',
  'src/app/style/fonts',
  'src/app/style/fonts.scss',
  'src/app/style/reset',
  'src/app/style/reset.scss',
  'src/app/style/tools-utilities',
  'src/app/style/tools-utilities.scss'
]);

const scssFiles = childProcess
  .execFileSync('find', ['src/app', '-name', '*.scss'], {
    cwd: repoRoot,
    encoding: 'utf8'
  })
  .trim()
  .split('\n')
  .filter(Boolean)
  .filter((relativePath) => !relativePath.startsWith('src/app/style/'));

const violations = [];
const importPattern = /@(use|import)\s+["']([^"']+)["']/g;

for (const relativePath of scssFiles) {
  const source = fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
  let match;

  while ((match = importPattern.exec(source)) !== null) {
    const importPath = match[2].replace(/^\.\//, '');
    if (forbiddenGlobalModules.has(importPath)) {
      violations.push({
        file: relativePath,
        importPath
      });
    }
  }
}

if (violations.length === 0) {
  process.exit(0);
}

console.error('\nSCSS global import guard failed.\n');
console.error('Component SCSS must not @use/@import global-emitting style modules:');
console.error('  - src/app/style/brand-globals');
console.error('  - src/app/style/commons_customizations');
console.error('  - src/app/style/fonts');
console.error('  - src/app/style/reset');
console.error('  - src/app/style/tools-utilities');
console.error('');
console.error('Fix: import Sass-only resources instead, such as:');
console.error('  - src/app/style/brand-resources');
console.error('  - src/app/style/commons-resources');
console.error('  - src/app/style/tools');
console.error('');

for (const violation of violations) {
  console.error(`  - ${violation.file} imports ${violation.importPath}`);
}

process.exit(1);
