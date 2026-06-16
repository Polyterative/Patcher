#!/usr/bin/env node

import { execFileSync } from 'node:child_process';

const PRODUCTION_BRANCH = 'production';
const REMOTE = 'origin';
const REMOTE_PRODUCTION = `${REMOTE}/${PRODUCTION_BRANCH}`;

function git(args, options = {}) {
  const output = execFileSync('git', args, {
    encoding: 'utf8',
    stdio: options.stdio ?? ['ignore', 'pipe', 'pipe'],
  });

  return typeof output === 'string' ? output.trim() : '';
}

function gitSucceeds(args) {
  try {
    execFileSync('git', args, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function fail(message, details = []) {
  console.error(`release preflight failed: ${message}`);

  for (const detail of details) {
    console.error(`  ${detail}`);
  }

  process.exit(1);
}

const branch = git(['branch', '--show-current']);

if (branch !== PRODUCTION_BRANCH) {
  fail(`release must be run from ${PRODUCTION_BRANCH}`, [
    `current branch: ${branch || '(detached HEAD)'}`,
    `run: pnpm switch:${PRODUCTION_BRANCH}`,
  ]);
}

const status = git(['status', '--porcelain']);

if (status) {
  fail('working tree must be clean before release', [
    'commit or stash local changes before running release',
  ]);
}

git(['fetch', '--no-tags', REMOTE, `${PRODUCTION_BRANCH}:refs/remotes/${REMOTE}/${PRODUCTION_BRANCH}`], {
  stdio: 'inherit',
});

const localHead = git(['rev-parse', 'HEAD']);
const remoteHead = git(['rev-parse', REMOTE_PRODUCTION]);

if (localHead === remoteHead) {
  console.log(`release preflight passed: ${PRODUCTION_BRANCH} matches ${REMOTE_PRODUCTION}`);
  process.exit(0);
}

if (gitSucceeds(['merge-base', '--is-ancestor', REMOTE_PRODUCTION, 'HEAD'])) {
  console.log(`release preflight passed: ${PRODUCTION_BRANCH} is ahead of ${REMOTE_PRODUCTION}`);
  process.exit(0);
}

if (gitSucceeds(['merge-base', '--is-ancestor', 'HEAD', REMOTE_PRODUCTION])) {
  fail(`${PRODUCTION_BRANCH} is behind ${REMOTE_PRODUCTION}`, [
    `run: git pull --ff-only ${REMOTE} ${PRODUCTION_BRANCH}`,
  ]);
}

fail(`${PRODUCTION_BRANCH} has diverged from ${REMOTE_PRODUCTION}`, [
  'do not force-push a release',
  `inspect: git log --oneline --graph --decorate --left-right HEAD...${REMOTE_PRODUCTION}`,
]);
