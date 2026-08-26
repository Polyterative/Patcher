/**
 * Regression-contract guard self-tests (Slice 3a + RR-3a repair round 1).
 *
 * Covers (see DeliveryHandoff-slice-3a.md / ATP-1 for the full test map):
 *   AT-G1 source-only violation      AT-G2 matching spec success
 *   AT-G3 exceptions                 AT-G4 unregistered TS
 *   AT-G5 spec-only                  AT-G6 duplicate paths
 *   O-S14 registry integrity         O-ST18 sources resolve on disk
 *   O-ST19 accepted specs resolve on disk
 *   RR-3a-F1 `--staged` reads the complete staged set atomically, independent
 *            of lint-staged argument chunking
 *   RR-3a-F2 normalizePath preserves literal backslashes on POSIX
 *
 * AT-G1-G6 and O-S14 use small synthetic fixture registries so they never
 * depend on the real repository tree. O-ST18/O-ST19 validate the real
 * production registry against the real git-tracked file list. RR-3a-F1 spawns
 * the real CLI script against an isolated, throwaway temp git repository
 * (same pattern as scripts/tests/vercel-ignore-build.test.cjs).
 */
const assert = require('node:assert/strict');
const {execFileSync, spawnSync} = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  evaluateChangedFiles,
  validateRegistry,
  validateRegistryAgainstDisk,
  matchesGlob,
  normalizePath,
  splitNulOutput,
  listTrackedFiles,
  formatViolations
} = require('../checks/check-regression-contract.cjs');
const productionRegistry = require('../checks/regression-contract-registry.cjs');

const repoRoot = path.resolve(__dirname, '..', '..');
const checkScriptSource = fs.readFileSync(
  path.join(repoRoot, 'scripts/checks/check-regression-contract.cjs'),
  'utf8'
);

function fixtureRegistry(overrides = {}) {
  return {
    version: 1,
    entries: [
      {
        source: 'src/app/components/example/example.service.ts',
        acceptedSpecGlobs: ['src/app/components/example/example.service*.spec.ts'],
        reason: 'fixture entry with an aggregate-style glob'
      },
      {
        source: 'src/app/components/example/example-helper.service.ts',
        acceptedSpecGlobs: ['src/app/components/example/example.component.spec.ts'],
        reason: 'fixture entry with an exact-file glob'
      }
    ],
    exceptions: [],
    ...overrides
  };
}

/**
 * Creates an isolated, throwaway git repository containing a real copy of
 * check-regression-contract.cjs plus a small fixture registry, so RR-3a-F1's
 * "--staged ignores chunked argv" behavior can be exercised against a REAL
 * staged git index without touching this repository's own tree/index.
 * Mirrors scripts/tests/vercel-ignore-build.test.cjs's `createRepository`.
 */
function createIsolatedRegistryRepo() {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'patcher-regression-contract-'));
  git(repo, ['init', '--quiet']);
  git(repo, ['config', 'user.name', 'Patcher Test']);
  git(repo, ['config', 'user.email', 'patcher-test@example.invalid']);

  fs.mkdirSync(path.join(repo, 'scripts/checks'), {recursive: true});
  fs.writeFileSync(path.join(repo, 'scripts/checks/check-regression-contract.cjs'), checkScriptSource);
  fs.writeFileSync(
    path.join(repo, 'scripts/checks/regression-contract-registry.cjs'),
    'module.exports = ' +
      JSON.stringify({
        version: 1,
        entries: [
          {
            source: 'source.service.ts',
            acceptedSpecGlobs: ['source.spec.ts'],
            reason: 'isolated-repo fixture for RR-3a-F1'
          }
        ],
        exceptions: []
      }) +
      ';\n'
  );

  git(repo, ['add', '--', 'scripts/checks/check-regression-contract.cjs', 'scripts/checks/regression-contract-registry.cjs']);
  git(repo, ['commit', '--quiet', '-m', 'chore: seed guard + registry']);

  return repo;
}

function git(repo, args) {
  return execFileSync('git', args, {cwd: repo, encoding: 'utf8'});
}

function runGuardCli(repo, args) {
  const result = spawnSync('node', ['scripts/checks/check-regression-contract.cjs', ...args], {
    cwd: repo,
    encoding: 'utf8'
  });
  return {status: result.status, output: `${result.stdout}${result.stderr}`};
}

test('AT-G1: reports a violation when a registered source changes with no matching accepted spec', () => {
  const result = evaluateChangedFiles(fixtureRegistry(), [
    'src/app/components/example/example.service.ts',
    'src/app/components/unrelated/unrelated.component.ts'
  ]);

  assert.equal(result.ok, false);
  assert.equal(result.violations.length, 1);
  assert.equal(result.violations[0].source, 'src/app/components/example/example.service.ts');
  assert.deepEqual(result.violations[0].acceptedSpecGlobs, ['src/app/components/example/example.service*.spec.ts']);
});

test('AT-G2: passes when a registered source changes alongside a file matching its accepted spec glob', () => {
  const result = evaluateChangedFiles(fixtureRegistry(), [
    'src/app/components/example/example.service.ts',
    'src/app/components/example/example.service.extra.spec.ts'
  ]);

  assert.equal(result.ok, true);
  assert.deepEqual(result.violations, []);
});

test('AT-G3: an explicit registry exception skips the requirement for that source', () => {
  const registryWithException = fixtureRegistry({
    exceptions: ['src/app/components/example/example.service.ts']
  });

  const result = evaluateChangedFiles(registryWithException, [
    'src/app/components/example/example.service.ts'
  ]);

  assert.equal(result.ok, true);
  assert.deepEqual(result.violations, []);
});

test('AT-G4: an unregistered TypeScript file never produces a violation', () => {
  const result = evaluateChangedFiles(fixtureRegistry(), [
    'src/app/components/totally-unrelated/some-random.service.ts'
  ]);

  assert.equal(result.ok, true);
  assert.deepEqual(result.violations, []);
});

test('AT-G5: changing only an accepted spec file (source untouched) never produces a violation', () => {
  const result = evaluateChangedFiles(fixtureRegistry(), [
    'src/app/components/example/example.service.extra.spec.ts'
  ]);

  assert.equal(result.ok, true);
  assert.deepEqual(result.violations, []);
});

test('AT-G6: duplicate changed-file paths do not produce duplicate violations or false passes', () => {
  const violatingResult = evaluateChangedFiles(fixtureRegistry(), [
    'src/app/components/example/example.service.ts',
    'src/app/components/example/example.service.ts',
    'src/app/components/example/example.service.ts'
  ]);
  assert.equal(violatingResult.violations.length, 1);

  const passingResult = evaluateChangedFiles(fixtureRegistry(), [
    'src/app/components/example/example.service.ts',
    'src/app/components/example/example.service.ts',
    'src/app/components/example/example.service.extra.spec.ts',
    'src/app/components/example/example.service.extra.spec.ts'
  ]);
  assert.equal(passingResult.ok, true);
});

test('O-S14: registry integrity rejects a non-numeric version', () => {
  const {valid, errors} = validateRegistry(fixtureRegistry({version: 'one'}));
  assert.equal(valid, false);
  assert.ok(errors.some(error => /version/i.test(error)), errors.join('\n'));
});

test('O-S14: registry integrity rejects a duplicate source entry', () => {
  const duplicated = fixtureRegistry();
  duplicated.entries.push({...duplicated.entries[0]});

  const {valid, errors} = validateRegistry(duplicated);
  assert.equal(valid, false);
  assert.ok(errors.some(error => /duplicate/i.test(error)), errors.join('\n'));
});

test('O-S14: registry integrity rejects an entry with no accepted spec globs', () => {
  const broken = fixtureRegistry();
  broken.entries[0].acceptedSpecGlobs = [];

  const {valid, errors} = validateRegistry(broken);
  assert.equal(valid, false);
  assert.ok(errors.some(error => /acceptedSpecGlobs/.test(error)), errors.join('\n'));
});

test('O-S14: registry integrity rejects an exception with no matching registered source', () => {
  const broken = fixtureRegistry({exceptions: ['src/app/components/example/not-registered.ts']});

  const {valid, errors} = validateRegistry(broken);
  assert.equal(valid, false);
  assert.ok(errors.some(error => /exception/i.test(error)), errors.join('\n'));
});

test('O-S14: registry integrity rejects an unsafe (absolute or traversal) source path', () => {
  const broken = fixtureRegistry();
  broken.entries[0].source = '../outside-repo.service.ts';

  const {valid, errors} = validateRegistry(broken);
  assert.equal(valid, false);
  assert.ok(errors.length > 0);
});

test('O-S14: the real production registry passes schema validation', () => {
  const {valid, errors} = validateRegistry(productionRegistry);
  assert.equal(valid, true, errors.join('\n'));
});

test('registry membership matches the intended 10 high-risk sources exactly', () => {
  assert.equal(productionRegistry.entries.length, 10);
  assert.equal(new Set(productionRegistry.entries.map(entry => entry.source)).size, 10);
});

test('O-ST18: every registered source in the real registry resolves to a real tracked file', () => {
  // Also asserts the intended final registry set explicitly here (Testing
  // seat reconciliation finding #1), in addition to the standalone
  // "registry membership matches..." case above.
  assert.equal(productionRegistry.entries.length, 10, 'registry must register exactly the 10 intended high-risk sources');

  const files = listTrackedFiles();
  const {errors} = validateRegistryAgainstDisk(productionRegistry, files);
  const missingSourceErrors = errors.filter(error => error.includes('does not exist'));
  assert.deepEqual(missingSourceErrors, []);
});

test('O-ST19: every accepted spec glob in the real registry matches at least one real tracked file', () => {
  const files = listTrackedFiles();
  const {errors} = validateRegistryAgainstDisk(productionRegistry, files);
  const unmatchedGlobErrors = errors.filter(error => error.includes('matches no tracked files'));
  assert.deepEqual(unmatchedGlobErrors, []);
});

// Error-handling seat reconciliation (contested and won the "-z"/NUL-splitting
// overrule): proves a tracked/staged path containing a literal newline is not
// corrupted into two bogus entries the way naive `.split('\n')` would.
test('splitNulOutput safely splits a NUL-delimited path list, including a path containing a literal newline', () => {
  const rawGitDashZOutput = 'weird\nname.ts\0normal.ts\0';
  assert.deepEqual(splitNulOutput(rawGitDashZOutput), ['weird\nname.ts', 'normal.ts']);
});

test('splitNulOutput returns an empty list for empty git output (nothing staged/tracked)', () => {
  assert.deepEqual(splitNulOutput(''), []);
});

// Security seat reconciliation: prove a "hostile-looking" changed-file path is
// only ever treated as inert string data - no shell metacharacter gets special
// meaning, nothing throws, and formatViolations only ever prints it as text
// (this repo never passes changed-file strings to a shell: all git calls use
// execFileSync with a fixed literal argv array, never string concatenation).
test('a "hostile-looking" changed-file path is treated as inert string data, never executed or specially interpreted', () => {
  const hostileFile = 'src/app/components/example/example.service.ts; rm -rf /tmp/whatever`$(id)`';

  const result = evaluateChangedFiles(fixtureRegistry(), [hostileFile]);
  assert.equal(result.ok, true, 'an unregistered (even hostile-looking) path must simply be ignored, not crash');

  const message = formatViolations([{source: hostileFile, acceptedSpecGlobs: ['does-not-matter.spec.ts']}]);
  assert.match(message, /rm -rf \/tmp\/whatever`\$\(id\)`/, 'the string is printed verbatim, never stripped/substituted/executed');
});

test('C7: formatViolations names both the offending source and its accepted specs', () => {
  const message = formatViolations([
    {source: 'src/app/x.service.ts', acceptedSpecGlobs: ['src/app/x.service*.spec.ts']}
  ]);

  assert.match(message, /src\/app\/x\.service\.ts/);
  assert.match(message, /src\/app\/x\.service\*\.spec\.ts/);
});

test('matchesGlob treats "*" as a single path-segment wildcard that never crosses "/"', () => {
  assert.equal(matchesGlob('src/app/x/y.spec.ts', 'src/app/*.spec.ts'), false);
  assert.equal(matchesGlob('src/app/x.extra.spec.ts', 'src/app/x*.spec.ts'), true);
});

test('matchesGlob gives "**" no special cross-directory meaning (unsupported, behaves like adjacent "*")', () => {
  // No registered glob in this repo uses "**" - this only pins the behavior
  // so a future maintainer cannot silently assume shell/minimatch "**"
  // (recursive-directory) semantics.
  assert.equal(matchesGlob('src/app/x/y.spec.ts', 'src/app/**.spec.ts'), false);
  assert.equal(matchesGlob('src/app/xy.spec.ts', 'src/app/**.spec.ts'), true);
});

test('matchesGlob treats "." in a pattern literally, not as a regex any-character wildcard', () => {
  assert.equal(matchesGlob('src/appXservice.spec.ts', 'src/app.service*.spec.ts'), false);
  assert.equal(matchesGlob('src/app.service.spec.ts', 'src/app.service*.spec.ts'), true);
});

// Reconciliation fix (architecture seat, PanelRecord VIOLATED->fixed): lint-staged's
// default `relative: false` passes ABSOLUTE paths to tasks (node_modules/lint-staged/
// README.md#--relative), so this is the real shape check-regression-contract.cjs must
// handle, not just repo-relative strings.
test('normalizePath rebases an absolute (lint-staged-style) path onto the repo root', () => {
  const absolute = path.join(repoRoot, 'src/app/components/rack-parts/rack-detail-persistence-operations.service.ts');
  assert.equal(
    normalizePath(absolute),
    'src/app/components/rack-parts/rack-detail-persistence-operations.service.ts'
  );
});

test('evaluateChangedFiles correctly matches registered sources when given absolute paths, as lint-staged provides by default', () => {
  const absoluteSource = path.join(repoRoot, 'src/app/components/example/example.service.ts');
  const absoluteSpec = path.join(repoRoot, 'src/app/components/example/example.service.extra.spec.ts');

  const violatingResult = evaluateChangedFiles(fixtureRegistry(), [absoluteSource]);
  assert.equal(violatingResult.ok, false, 'an absolute-path-only source change must still be flagged');

  const passingResult = evaluateChangedFiles(fixtureRegistry(), [absoluteSource, absoluteSpec]);
  assert.equal(passingResult.ok, true, 'an absolute-path source + matching absolute-path spec must still pass');
});

// --- RR-3a repair round 1 -------------------------------------------------

// RR-3a-F2: the pre-repair `normalizePath` unconditionally rewrote every "\"
// to "/", which corrupts a legal POSIX filename containing a literal
// backslash. The repair only does that conversion when the CURRENT
// platform's own separator is "\" (i.e. actually on Windows).
test('RR-3a-F2: normalizePath preserves a literal backslash in a filename on POSIX', () => {
  assert.equal(path.sep, '/', 'this assertion pins POSIX behavior; this suite only runs on POSIX CI/dev machines');

  const withBackslash = 'src/app/components/weird\\name.spec.ts';
  assert.equal(normalizePath(withBackslash), withBackslash);

  // Also prove it survives a full evaluateChangedFiles round-trip unmangled:
  // a registered source containing a literal backslash must still match
  // itself, not some corrupted "directory-split" variant.
  const registryWithBackslashSource = fixtureRegistry({
    entries: [
      {
        source: withBackslash,
        acceptedSpecGlobs: ['src/app/components/weird\\name-partner.spec.ts'],
        reason: 'fixture proving backslash-containing paths are not corrupted'
      }
    ]
  });
  const result = evaluateChangedFiles(registryWithBackslashSource, [withBackslash]);
  assert.equal(result.ok, false, 'still correctly detected as the exact registered source (a violation, since no spec was staged)');
  assert.equal(result.violations[0].source, withBackslash);
});

// RR-3a-F1: lint-staged can split a large matched-file list across multiple
// chunked invocations, each receiving only a subset of the staged files as
// argv. `--staged` must ignore that argv entirely and always re-read the
// COMPLETE staged set atomically from Git, so a registered source staged in
// one "chunk" and its accepted spec staged in a different "chunk" still
// resolves correctly. Exercised against a real isolated git repo + real CLI
// subprocess (not a unit-level fixture) because the bug is specifically about
// argv-vs-git-index behavior.
test('RR-3a-F1: --staged reads the complete staged set atomically, independent of simulated lint-staged chunking', () => {
  const repo = createIsolatedRegistryRepo();

  fs.writeFileSync(path.join(repo, 'source.service.ts'), 'export class Source {}\n');
  fs.writeFileSync(path.join(repo, 'source.spec.ts'), 'describe("Source", () => {});\n');
  git(repo, ['add', '--', 'source.service.ts', 'source.spec.ts']);

  // Simulate lint-staged splitting the single "git commit" into 2 chunked
  // invocations, each seeing only ONE of the two staged files as argv.
  const chunkA = runGuardCli(repo, ['--staged', 'source.service.ts']);
  const chunkB = runGuardCli(repo, ['--staged', 'source.spec.ts']);

  assert.equal(chunkA.status, 0, `chunk A (source only in argv) must still pass:\n${chunkA.output}`);
  assert.equal(chunkB.status, 0, `chunk B (spec only in argv) must still pass:\n${chunkB.output}`);

  // Sanity control: direct-files mode (no --staged) trusts argv literally
  // (C3), so passing only the source WITHOUT --staged must still report the
  // violation - proving the fixture/registry genuinely can fail, and that
  // --staged's chunk-independence is what makes the difference above, not an
  // accidentally-unreachable check.
  const directFilesMode = runGuardCli(repo, ['source.service.ts']);
  assert.equal(directFilesMode.status, 1, `direct-files mode with a partial list must still violate:\n${directFilesMode.output}`);
  assert.match(directFilesMode.output, /source\.service\.ts/);

  fs.rmSync(repo, {recursive: true, force: true});
});

test('RR-3a-F1: --staged still reports a genuine violation when only the source is actually staged', () => {
  const repo = createIsolatedRegistryRepo();

  fs.writeFileSync(path.join(repo, 'source.service.ts'), 'export class Source {}\n');
  git(repo, ['add', '--', 'source.service.ts']);

  const result = runGuardCli(repo, ['--staged', 'source.service.ts']);

  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /source\.service\.ts/);
  assert.match(result.output, /source\.spec\.ts/);

  fs.rmSync(repo, {recursive: true, force: true});
});
