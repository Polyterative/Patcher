#!/usr/bin/env node
/**
 * Regression-contract guard (Slice 3a).
 *
 * Enforces that a commit touching a registered high-risk source (see
 * scripts/checks/regression-contract-registry.cjs) also touches at least one
 * of that source's accepted spec files. Membership is explicit and versioned
 * - this script never infers risk from filenames, file size, diff operators,
 * or "is this any .ts file".
 *
 * Run via lint-staged on every `git commit` (see package.json
 * `lint-staged["src/**\/*.ts"]`), invoked with a fixed `--staged` flag so it
 * always re-reads the COMPLETE staged set atomically from Git instead of
 * trusting lint-staged's own argv - lint-staged can split a large matched-
 * file list across multiple chunked invocations, so a single invocation's
 * argv is not guaranteed to contain every staged file (RR-3a-F1). It can
 * also be run by hand:
 *
 *   node scripts/checks/check-regression-contract.cjs <file...>   # direct-files mode: use exactly these paths
 *   node scripts/checks/check-regression-contract.cjs --staged    # atomic complete-staged-set mode
 *   node scripts/checks/check-regression-contract.cjs             # no args: same as --staged
 *
 * The commit-time path (`main`) only runs `validateRegistry` (pure, no I/O)
 * and `evaluateChangedFiles` (pure, only looks at the already-known changed
 * files) - it never scans the repository. Full disk-resolution of every
 * registered source/spec glob (`validateRegistryAgainstDisk`, backed by
 * `listTrackedFiles`) is exercised by scripts/tests/check-regression-contract.test.cjs
 * instead, so an ordinary commit stays fast (panel synthesis: Performance vs.
 * Error-handling/Security, see DeliveryHandoff-slice-3a.md). `main()` (and its
 * `require()` of the registry) runs entirely inside the `require.main` guard's
 * try/catch below, so a corrupted registry or a failed git call always prints
 * an actionable message and exits 1 instead of an unhandled stack trace.
 */

const path = require('node:path');
const {execFileSync} = require('node:child_process');

const repoRoot = path.resolve(__dirname, '..', '..');
const registryPath = './regression-contract-registry.cjs';

function normalizePath(filePath) {
  // lint-staged's default `relative: false` passes ABSOLUTE paths to tasks
  // (see node_modules/lint-staged/README.md#--relative), so an absolute path
  // must be rebased onto repoRoot before comparing it with the registry's
  // repo-relative entries - mirrors check-explicit-any.cjs's `normalizeRel`.
  //
  // RR-3a-F2 repair: only convert "\" to "/" when the CURRENT platform's own
  // separator actually is "\" (i.e. genuinely running on Windows). A literal
  // backslash is a valid POSIX filename character, not a path separator -
  // unconditionally replacing it (the previous behavior) would corrupt such
  // a filename instead of normalizing it.
  const value = path.sep === '\\' ? String(filePath).replace(/\\/g, '/') : String(filePath);
  const rel = path.isAbsolute(value) ? path.relative(repoRoot, value) : value;
  return rel.split(path.sep).join('/').replace(/^\.\//, '');
}

function isSafeRelativePath(value) {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    !path.isAbsolute(value) &&
    !value.split('/').includes('..')
  );
}

function globToRegExp(pattern) {
  // Only `*` is supported, and it never crosses a path separator (shell-style
  // single-segment wildcard). There is no special "**" (cross-directory)
  // handling - none of this registry's globs need to match across
  // directories, so "**" simply behaves as two adjacent single-segment
  // wildcards (still bounded by the surrounding literal "/" characters).
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '[^/]*');
  return new RegExp(`^${escaped}$`);
}

function matchesGlob(filePath, pattern) {
  return globToRegExp(pattern).test(normalizePath(filePath));
}

/** Pure schema/shape validation - no filesystem access. */
function validateRegistry(candidateRegistry) {
  const errors = [];

  if (!candidateRegistry || typeof candidateRegistry !== 'object') {
    return {valid: false, errors: ['registry must be an object']};
  }

  if (!Number.isInteger(candidateRegistry.version) || candidateRegistry.version < 1) {
    errors.push('registry.version must be a positive integer');
  }

  if (!Array.isArray(candidateRegistry.entries) || candidateRegistry.entries.length === 0) {
    errors.push('registry.entries must be a non-empty array');
  }

  const seenSources = new Set();
  const knownSources = new Set();

  for (const [index, entry] of (candidateRegistry.entries || []).entries()) {
    const hasSource = entry && typeof entry.source === 'string' && entry.source.length > 0;
    const label = hasSource ? entry.source : `entries[${index}]`;

    if (!entry || !isSafeRelativePath(entry.source)) {
      errors.push(`${label}: "source" must be a non-empty repo-relative path with no ".." segments`);
      continue;
    }

    if (seenSources.has(entry.source)) {
      errors.push(`duplicate registry source: ${entry.source}`);
    }
    seenSources.add(entry.source);
    knownSources.add(entry.source);

    if (!Array.isArray(entry.acceptedSpecGlobs) || entry.acceptedSpecGlobs.length === 0) {
      errors.push(`${label}: must declare at least one "acceptedSpecGlobs" entry`);
    } else {
      for (const glob of entry.acceptedSpecGlobs) {
        if (!isSafeRelativePath(glob)) {
          errors.push(`${label}: acceptedSpecGlobs entry "${glob}" must be a repo-relative path with no ".." segments`);
        }
      }
    }
  }

  if (!Array.isArray(candidateRegistry.exceptions)) {
    errors.push('registry.exceptions must be an array (can be empty)');
  } else {
    for (const exception of candidateRegistry.exceptions) {
      if (!knownSources.has(exception)) {
        errors.push(`exception "${exception}" does not match any registered source`);
      }
    }
  }

  return {valid: errors.length === 0, errors};
}

/** Pure: only inspects the given changed-file list, never touches disk. */
function evaluateChangedFiles(candidateRegistry, changedFiles) {
  const normalizedChanged = Array.from(new Set((changedFiles || []).map(normalizePath)));
  const changedSet = new Set(normalizedChanged);
  const exceptions = new Set(candidateRegistry.exceptions || []);
  const violations = [];

  for (const entry of candidateRegistry.entries || []) {
    if (!changedSet.has(entry.source)) continue;
    if (exceptions.has(entry.source)) continue;

    const specPatterns = entry.acceptedSpecGlobs.map(globToRegExp);
    const hasMatchingSpecChange = normalizedChanged.some(
      file => file !== entry.source && specPatterns.some(pattern => pattern.test(file))
    );

    if (!hasMatchingSpecChange) {
      violations.push({source: entry.source, acceptedSpecGlobs: entry.acceptedSpecGlobs});
    }
  }

  return {ok: violations.length === 0, violations};
}

/** Pure given `files` - resolves every registered source/glob against a supplied tracked-file list. */
function validateRegistryAgainstDisk(candidateRegistry, files) {
  const fileSet = new Set(files);
  const errors = [];

  for (const entry of candidateRegistry.entries || []) {
    if (!fileSet.has(entry.source)) {
      errors.push(`registered source does not exist: ${entry.source}`);
    }

    for (const pattern of entry.acceptedSpecGlobs || []) {
      const regExp = globToRegExp(pattern);
      if (!files.some(file => regExp.test(file))) {
        errors.push(`accepted spec glob matches no tracked files: ${pattern} (source: ${entry.source})`);
      }
    }
  }

  return {valid: errors.length === 0, errors};
}

function formatViolations(violations) {
  const lines = ['[check-regression-contract] Regression-contract guard failed:', ''];

  for (const violation of violations) {
    lines.push(`  - ${violation.source}`);
    lines.push('    touched without staging any of its accepted specs:');
    for (const glob of violation.acceptedSpecGlobs) {
      lines.push(`      - ${glob}`);
    }
  }

  lines.push('');
  lines.push('Fix: stage a change to at least one accepted spec file/glob above alongside this source,');
  lines.push('or add a reviewed exception in scripts/checks/regression-contract-registry.cjs.');

  return lines.join('\n');
}

/**
 * Pure: splits raw `-z`-delimited git output (NUL-separated) into a file
 * list. Safer than newline-splitting because a tracked/staged path can
 * legally contain a literal "\n" - naive `.split('\n')` would silently
 * fragment such a path into two bogus entries.
 */
function splitNulOutput(output) {
  return output.split('\0').filter(Boolean);
}

/** Impure: spawns `git ls-files -z` once. Used only by the test suite's disk-resolution checks. */
function listTrackedFiles() {
  let output;
  try {
    output = execFileSync('git', ['ls-files', '-z'], {
      cwd: repoRoot,
      encoding: 'utf8',
      timeout: 10000,
      maxBuffer: 32 * 1024 * 1024
    });
  } catch (error) {
    throw new Error(`Unable to list tracked files via "git ls-files": ${error.message}`);
  }
  return splitNulOutput(output);
}

/**
 * Impure: resolves the changed-file set for this invocation.
 *
 * - `--staged` (any position in argv): RR-3a-F1 repair. ALWAYS re-reads the
 *   COMPLETE currently-staged set atomically via `git diff --cached
 *   --name-only -z`, ignoring any other file arguments in argv. This is
 *   required because lint-staged can split a large matched-file list across
 *   *multiple chunked invocations* of the same command, each with only a
 *   partial subset of the staged files as argv - trusting that partial argv
 *   as "the complete set" could see a registered source in one chunk and its
 *   accepted spec in a different chunk, reporting a false violation even
 *   though both are genuinely staged together. `--staged` sidesteps chunking
 *   entirely by never trusting argv for the file list.
 * - No `--staged` flag, but other file arguments ARE given: direct-files
 *   mode (C3) - use exactly those paths as the complete/authoritative set.
 *   This is deterministic and git-independent, so self-tests and manual CLI
 *   smoke can exercise exact scenarios without a real staged git index.
 * - No `--staged` flag and no file arguments: same atomic Git read as
 *   `--staged` (sensible default for a bare invocation).
 */
function resolveChangedFiles() {
  const rawArgs = process.argv.slice(2);
  const stagedMode = rawArgs.includes('--staged');
  const fileArgs = rawArgs.filter(arg => arg !== '--staged' && arg.length > 0);

  if (!stagedMode && fileArgs.length > 0) {
    return fileArgs.map(normalizePath);
  }

  return readCompleteStagedSetFromGit();
}

/** Impure: the single, atomic source of truth for "everything currently staged". */
function readCompleteStagedSetFromGit() {
  let output;
  try {
    output = execFileSync('git', ['diff', '--cached', '--name-only', '-z'], {
      cwd: repoRoot,
      encoding: 'utf8',
      timeout: 5000,
      maxBuffer: 32 * 1024 * 1024
    });
  } catch (error) {
    throw new Error(`Unable to resolve changed files via "git diff --cached": ${error.message}`);
  }

  return splitNulOutput(output).map(normalizePath);
}

function main() {
  // Loaded inside main() (and so inside this file's require.main try/catch)
  // rather than at module scope, so a corrupted/missing registry file fails
  // through the same actionable-message path instead of an unhandled
  // require() stack trace at commit time.
  const registry = require(registryPath);

  const registryCheck = validateRegistry(registry);
  if (!registryCheck.valid) {
    console.error('[check-regression-contract] Registry integrity check failed:');
    for (const error of registryCheck.errors) {
      console.error(`  - ${error}`);
    }
    console.error('\nFix scripts/checks/regression-contract-registry.cjs before committing.');
    process.exitCode = 1;
    return;
  }

  const changedFiles = resolveChangedFiles();
  const {ok, violations} = evaluateChangedFiles(registry, changedFiles);

  if (!ok) {
    console.error(formatViolations(violations));
    process.exitCode = 1;
    return;
  }

  console.log('[check-regression-contract] Regression-contract guard passed.');
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error('[check-regression-contract] Unexpected failure:', error && error.message ? error.message : error);
    process.exitCode = 1;
  }
}

module.exports = {
  globToRegExp,
  matchesGlob,
  normalizePath,
  validateRegistry,
  evaluateChangedFiles,
  validateRegistryAgainstDisk,
  formatViolations,
  splitNulOutput,
  listTrackedFiles,
  resolveChangedFiles
};
