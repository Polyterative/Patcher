#!/usr/bin/env node
/**
 * Explicit `any` ratchet.
 *
 * Existing explicit-any usage is recorded in scripts/checks/.explicit-any-baseline.json
 * so type-safety cleanup can be incremental, but new or increased usage is
 * blocked by lint and pre-commit checks.
 *
 * Run: node scripts/checks/check-explicit-any.cjs
 * Update baseline: node scripts/checks/check-explicit-any.cjs --update-baseline
 * Staged check: node scripts/checks/check-explicit-any.cjs --staged <files...>
 */

const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const ts = require('typescript');

const repoRoot = path.resolve(__dirname, '..', '..');
const baselinePath = path.join(__dirname, '.explicit-any-baseline.json');
const updateBaseline = process.argv.includes('--update-baseline');
const stagedMode = process.argv.includes('--staged');

const IGNORED_FILES = new Set(['src/backend/database.types.ts']);

function runGit(args, options = {}) {
  return childProcess.execFileSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
    stdio: options.quiet ? ['pipe', 'pipe', 'ignore'] : ['pipe', 'pipe', 'inherit']
  });
}

function normalizeRel(file) {
  const rel = path.isAbsolute(file) ? path.relative(repoRoot, file) : file;
  return rel.split(path.sep).join('/');
}

function isTrackedTsFile(rel) {
  return rel.endsWith('.ts') && !IGNORED_FILES.has(rel);
}

function listTrackedTsFiles() {
  return runGit(['ls-files', '*.ts'])
    .trim()
    .split('\n')
    .map(normalizeRel)
    .filter(isTrackedTsFile);
}

function countExplicitAny(sourceText, fileName) {
  const sourceFile = ts.createSourceFile(
    fileName,
    sourceText,
    ts.ScriptTarget.Latest,
    true
  );
  let count = 0;

  function visit(node) {
    if (node.kind === ts.SyntaxKind.AnyKeyword) {
      count += 1;
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return count;
}

function readWorktreeFile(rel) {
  return fs.readFileSync(path.join(repoRoot, rel), 'utf8');
}

function maybeReadGitObject(ref, rel) {
  const objectRef = ref === ':' ? `:${rel}` : `${ref}:${rel}`;
  try {
    return runGit(['show', objectRef], {quiet: true});
  } catch {
    return null;
  }
}

function scanFiles(files, readFile) {
  const counts = {};
  let total = 0;

  for (const rel of files) {
    const source = readFile(rel);
    if (source === null) continue;
    const count = countExplicitAny(source, rel);
    if (count > 0) {
      counts[rel] = count;
      total += count;
    }
  }

  return { total, files: counts };
}

function writeBaseline() {
  const files = listTrackedTsFiles();
  const scan = scanFiles(files, readWorktreeFile);
  const baseline = {
    _comment:
      'Grandfathered explicit `any` counts. Do not add by hand — run `node scripts/checks/check-explicit-any.cjs --update-baseline` after intentional cleanup.',
    totalExplicitAny: scan.total,
    files: Object.fromEntries(Object.entries(scan.files).sort(([a], [b]) => a.localeCompare(b)))
  };

  fs.writeFileSync(baselinePath, JSON.stringify(baseline, null, 2) + '\n');
  console.log(`Explicit-any baseline updated: ${baselinePath}`);
  console.log(`Total explicit any count: ${scan.total}`);
}

function loadBaseline() {
  if (!fs.existsSync(baselinePath)) {
    console.error(
      `Missing explicit-any baseline at ${baselinePath}.\nRun: node scripts/checks/check-explicit-any.cjs --update-baseline`
    );
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
}

function checkAgainstBaseline() {
  const baseline = loadBaseline();
  const files = listTrackedTsFiles();
  const current = scanFiles(files, readWorktreeFile);
  const baselineFiles = baseline.files || {};
  const violations = [];

  for (const [rel, count] of Object.entries(current.files)) {
    const allowed = baselineFiles[rel] || 0;
    if (count > allowed) {
      violations.push({ rel, count, allowed });
    }
  }

  if (violations.length === 0) {
    return;
  }

  console.error(
    `\nExplicit-any ratchet failed (${violations.length} file${violations.length === 1 ? '' : 's'} increased):`
  );
  for (const violation of violations) {
    console.error(
      `  - ${violation.rel}: ${violation.count} explicit any (${violation.allowed} allowed)`
    );
  }
  console.error(
    '\nFix: replace new `any` with a concrete type, a generated Supabase type, or a local typed helper. If this is intentional cleanup, regenerate the baseline only after the total count drops.'
  );
  process.exit(1);
}

function listStagedArgs() {
  const args = process.argv
    .filter((arg) => arg !== '--staged')
    .slice(2)
    .map(normalizeRel)
    .filter(isTrackedTsFile);

  if (args.length > 0) {
    return [...new Set(args)];
  }

  return runGit(['diff', '--cached', '--name-only', '--diff-filter=ACMR', '--', '*.ts'])
    .trim()
    .split('\n')
    .map(normalizeRel)
    .filter(isTrackedTsFile);
}

function checkStagedFiles() {
  const files = listStagedArgs();
  const violations = [];

  for (const rel of files) {
    const stagedSource = maybeReadGitObject(':', rel);
    if (stagedSource === null) continue;

    const headSource = maybeReadGitObject('HEAD', rel);
    const stagedCount = countExplicitAny(stagedSource, rel);
    const headCount = headSource === null ? 0 : countExplicitAny(headSource, rel);

    if (stagedCount > headCount) {
      violations.push({ rel, stagedCount, headCount });
    }
  }

  if (violations.length === 0) {
    return;
  }

  console.error(
    `\nExplicit-any staged check failed (${violations.length} file${violations.length === 1 ? '' : 's'} increased):`
  );
  for (const violation of violations) {
    console.error(
      `  - ${violation.rel}: ${violation.stagedCount} explicit any (${violation.headCount} in HEAD)`
    );
  }
  console.error(
    '\nFix: keep explicit `any` count the same or lower in changed files.'
  );
  process.exit(1);
}

if (updateBaseline) {
  writeBaseline();
} else if (stagedMode) {
  checkStagedFiles();
} else {
  checkAgainstBaseline();
}
