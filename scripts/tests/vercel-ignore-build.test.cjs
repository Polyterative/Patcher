const assert = require('node:assert/strict');
const {execFileSync, spawnSync} = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');


const repoRoot = path.resolve(__dirname, '../..');
const gateSource = fs.readFileSync(path.join(repoRoot, 'scripts/build/vercel-ignore-build.sh'), 'utf8');

test('skips a normal docs-only commit', () => {
  const repo = createRepository();
  commitFile(repo, 'README.md', '# Documentation\n', 'docs: update notes');

  const result = runGate(repo);

  assert.equal(result.status, 0, result.output);
  assert.match(result.output, /Only docs\/\.github changed/);
});

test('release commit includes application changes from the preceding production merge', () => {
  const repo = createRepository();
  const previousProduction = commitFile(repo, 'README.md', '# Initial\n', 'docs: initial');
  createReleaseMerge(repo, previousProduction, {
    sourcePath: 'src/app.ts',
    sourceContent: 'export const deployed = true;\n'
  });

  const result = runGate(repo);

  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /Angular Tests completed successfully/);
  assert.doesNotMatch(result.output, /Only docs\/\.github changed/);
});

test('release commit still skips when the preceding merge contains only documentation', () => {
  const repo = createRepository();
  const previousProduction = commitFile(repo, 'README.md', '# Initial\n', 'docs: initial');
  createReleaseMerge(repo, previousProduction, {
    sourcePath: 'internaldocs/release.md',
    sourceContent: '# Release notes\n'
  });

  const result = runGate(repo);

  assert.equal(result.status, 0, result.output);
  assert.match(result.output, /Only docs\/\.github changed/);
});

function createRepository() {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'patcher-vercel-ignore-'));
  git(repo, ['init', '--quiet']);
  git(repo, ['config', 'user.name', 'Patcher Test']);
  git(repo, ['config', 'user.email', 'patcher-test@example.invalid']);

  fs.mkdirSync(path.join(repo, 'scripts/build'), {recursive: true});
  fs.writeFileSync(path.join(repo, 'scripts/build/vercel-ignore-build.sh'), gateSource);
  return repo;
}

function createReleaseMerge(repo, previousProduction, change) {
  git(repo, ['checkout', '--quiet', '-b', 'develop']);
  commitFile(repo, change.sourcePath, change.sourceContent, 'fix: application change');
  git(repo, ['checkout', '--quiet', '-b', 'production', previousProduction]);
  git(repo, ['merge', '--quiet', '--no-ff', 'develop', '-m', "Merge branch 'develop' into production"]);
  commitFile(repo, 'CHANGELOG.md', '# 1.0.1\n', 'chore(release): 1.0.1');
}

function commitFile(repo, relativePath, content, message) {
  const filePath = path.join(repo, relativePath);
  fs.mkdirSync(path.dirname(filePath), {recursive: true});
  fs.writeFileSync(filePath, content);
  git(repo, ['add', '--', relativePath]);
  git(repo, ['commit', '--quiet', '-m', message]);
  return git(repo, ['rev-parse', 'HEAD']).trim();
}

function runGate(repo) {
  const binDir = path.join(repo, 'test-bin');
  fs.mkdirSync(binDir);
  fs.writeFileSync(path.join(binDir, 'curl'), [
    '#!/usr/bin/env bash',
    'printf \'%s\\n\' \'{"workflow_runs":[{"status":"completed","conclusion":"success"}]}\''
  ].join('\n'));
  fs.chmodSync(path.join(binDir, 'curl'), 0o755);

  const result = spawnSync('bash', ['scripts/build/vercel-ignore-build.sh'], {
    cwd: repo,
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: `${binDir}:${process.env.PATH}`,
      VERCEL_GIT_REPO_OWNER: 'Polyterative',
      VERCEL_GIT_REPO_SLUG: 'Patcher',
      VERCEL_IGNORE_MAX_ATTEMPTS: '1',
      VERCEL_IGNORE_SLEEP_SECONDS: '0'
    }
  });

  return {
    status: result.status,
    output: `${result.stdout}${result.stderr}`
  };
}

function git(repo, args) {
  return execFileSync('git', args, {cwd: repo, encoding: 'utf8'});
}
