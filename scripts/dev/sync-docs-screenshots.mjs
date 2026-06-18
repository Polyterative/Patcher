#!/usr/bin/env node
/**
 * Copies reviewed in-repo docs screenshots into the sibling Patcher-docs checkout.
 * Never commits or pushes; use --dry-run to preview without writing.
 */
import {execFileSync} from 'node:child_process';
import {copyFileSync, existsSync, readdirSync, statSync} from 'node:fs';
import {relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const rootDir = fileURLToPath(new URL('../..', import.meta.url));
const docsDir = resolve(rootDir, '../Patcher-docs');
const sourceDir = resolve(rootDir, 'src/assets/screenshots/major-area-screenshots');
const docsAssetsDir = resolve(docsDir, '.gitbook/assets');
const expectedDocsBranch = process.env['PATCHER_DOCS_SCREENSHOTS_BRANCH'] || 'main';
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const help = args.has('--help') || args.has('-h');

const screenshotMap = [
  ['01-home.jpg', 'patcher-home.jpg'],
  ['02-modules.jpg', 'patcher-modules.jpg'],
  ['04-patches.jpg', 'patcher-patches.jpg'],
  ['06-racks.jpg', 'patcher-racks.jpg'],
  ['08-user-area.jpg', 'patcher-user-area.jpg'],
  ['09-account.jpg', 'patcher-account.jpg'],
  ['10-public-profile.jpg', 'patcher-public-profile.jpg']
];

function usage() {
  console.log(`Usage: pnpm sync:docs-screenshots [--dry-run]\n\nCopies reviewed screenshots from ${ relative(rootDir, sourceDir) } to ../Patcher-docs/.gitbook/assets. The docs worktree must be clean and on ${ expectedDocsBranch }. Override with PATCHER_DOCS_SCREENSHOTS_BRANCH. The script never commits or pushes.`);
}

function git(argsForGit, cwd) {
  return execFileSync('git', argsForGit, {cwd, encoding: 'utf8'}).trim();
}

function assertDirectory(path, label) {
  if (!existsSync(path) || !statSync(path).isDirectory()) {
    throw new Error(`${ label } does not exist: ${ path }`);
  }
}

function assertDocsWorktreeReady() {
  assertDirectory(docsDir, '../Patcher-docs');

  if (resolve(docsDir) === resolve(rootDir)) {
    throw new Error('../Patcher-docs resolves to this repository; refusing to sync.');
  }

  if (git(['rev-parse', '--is-inside-work-tree'], docsDir) !== 'true') {
    throw new Error('../Patcher-docs is not a git worktree.');
  }

  const docsTopLevel = resolve(git(['rev-parse', '--show-toplevel'], docsDir));
  if (docsTopLevel !== resolve(docsDir)) {
    throw new Error(`../Patcher-docs top-level is ${ docsTopLevel }; expected ${ resolve(docsDir) }.`);
  }

  const status = git(['status', '--porcelain'], docsDir);
  if (status) {
    throw new Error('../Patcher-docs has uncommitted changes; review or stash them before syncing screenshots.');
  }

  const branch = git(['branch', '--show-current'], docsDir);
  if (branch !== expectedDocsBranch) {
    throw new Error(`../Patcher-docs is on ${ branch || 'detached HEAD' }; expected ${ expectedDocsBranch }. Set PATCHER_DOCS_SCREENSHOTS_BRANCH to override intentionally.`);
  }

  assertDirectory(docsAssetsDir, '../Patcher-docs/.gitbook/assets');
}

function bytes(path) {
  return statSync(path).size;
}

function summarizeAssetInventory() {
  const docsAssets = readdirSync(docsAssetsDir)
    .filter(fileName => /^patcher-.*\.(png|jpe?g)$/i.test(fileName))
    .sort();
  const sourceAssets = readdirSync(sourceDir)
    .filter(fileName => /^\d{2}-.*\.jpe?g$/i.test(fileName))
    .sort();
  const mappedDocsAssets = new Set(screenshotMap.map(([, target]) => target));
  const unmappedDocsAssets = docsAssets.filter(fileName => !mappedDocsAssets.has(fileName) && !fileName.startsWith('patcher-promo-'));
  const unmappedSourceAssets = sourceAssets.filter(fileName => !screenshotMap.some(([source]) => source === fileName));

  return {
    docsAssets,
    sourceAssets,
    unmappedDocsAssets,
    unmappedSourceAssets
  };
}

function main() {
  if (help) {
    usage();
    return;
  }

  assertDirectory(sourceDir, 'Screenshot source directory');
  assertDocsWorktreeReady();

  const inventory = summarizeAssetInventory();
  const operations = screenshotMap.map(([sourceName, targetName]) => {
    const sourcePath = resolve(sourceDir, sourceName);
    const targetPath = resolve(docsAssetsDir, targetName);

    if (!existsSync(sourcePath)) {
      throw new Error(`Missing source screenshot: ${ relative(rootDir, sourcePath) }`);
    }

    return {
      sourceName,
      targetName,
      sourcePath,
      targetPath,
      sourceBytes: bytes(sourcePath),
      targetBytes: existsSync(targetPath) ? bytes(targetPath) : 0,
      targetExists: existsSync(targetPath)
    };
  });

  console.log(`[docs-screenshots] ${ dryRun ? 'Dry run: reviewed' : 'Preparing' } ${ operations.length } screenshot mappings for ../Patcher-docs/.gitbook/assets.`);
  for (const operation of operations) {
    const sourceLabel = relative(rootDir, operation.sourcePath);
    const targetLabel = relative(rootDir, operation.targetPath);
    const status = operation.targetExists ? 'overwrite' : 'create';
    console.log(`- ${ sourceLabel } (${ operation.sourceBytes } bytes) -> ${ targetLabel } (${ operation.targetBytes } bytes currently) [${ status }]`);

    if (!dryRun) {
      copyFileSync(operation.sourcePath, operation.targetPath);
    }
  }

  if (inventory.unmappedSourceAssets.length) {
    console.log(`[docs-screenshots] In-repo screenshots not synced yet: ${ inventory.unmappedSourceAssets.join(', ') }`);
  }
  if (inventory.unmappedDocsAssets.length) {
    console.log(`[docs-screenshots] Existing docs assets not covered by current captures: ${ inventory.unmappedDocsAssets.join(', ') }`);
  }

  if (!dryRun) {
    const status = git(['status', '--short', '--', '.gitbook/assets'], docsDir);
    console.log(status ? `[docs-screenshots] Docs asset diff:\n${ status }` : '[docs-screenshots] No docs asset changes detected.');
  }
}

try {
  main();
} catch (error) {
  console.error(`[docs-screenshots] ${ error instanceof Error ? error.message : String(error) }`);
  process.exit(1);
}
