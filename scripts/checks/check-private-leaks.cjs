#!/usr/bin/env node
/**
 * Private-leak guard (public repo): blocks pushing commits whose added lines or
 * messages match owner-defined private patterns (LAN addresses, NAS paths, ISP
 * or hardware names, ...).
 *
 * Patterns live in the gitignored `.private-leak-patterns` at the repo root —
 * one JavaScript regex per line (case-insensitive), `#` starts a comment — so
 * the guard itself never publishes them. Missing file = guard disabled (CI and
 * fresh clones), reported once and exit 0.
 *
 * Scope: commits not yet on any remote.
 *   --pre-push   read husky pre-push stdin (`<local ref> <local sha> ...`) and
 *                scan each pushed sha's commits that no remote has yet
 *   (default)    scan `HEAD --not --remotes`
 *   --all        scan the current working tree's tracked files instead
 *
 * Exit 1 with a per-commit/per-file report on any hit.
 */
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
const patternFile = path.join(repoRoot, '.private-leak-patterns');

if (!fs.existsSync(patternFile)) {
  console.log('check-private-leaks: no .private-leak-patterns file — guard disabled.');
  process.exit(0);
}

const patterns = fs
  .readFileSync(patternFile, 'utf8')
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith('#'))
  .map((src) => ({ src, re: new RegExp(src, 'i') }));

const git = (args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 512 * 1024 * 1024 });
const ZERO = /^0+$/;

function outgoingCommits(tips) {
  const set = new Set();
  for (const tip of tips) {
    const out = git(['rev-list', tip, '--not', '--remotes']).trim();
    if (out) out.split('\n').forEach((c) => set.add(c));
  }
  return [...set];
}

function scanCommit(sha) {
  const hits = [];
  const message = git(['log', '-1', '--format=%B', sha]);
  for (const { src, re } of patterns) if (re.test(message)) hits.push({ where: 'commit message', src });
  // Root commits have no parent; --root makes `show` diff against the empty tree.
  const patch = git(['show', '--root', '--format=', '--unified=0', '--no-color', sha]);
  let file = '';
  for (const line of patch.split('\n')) {
    if (line.startsWith('+++ ')) { file = line.slice(6); continue; }
    if (!line.startsWith('+') || line.startsWith('+++')) continue;
    for (const { src, re } of patterns) if (re.test(line)) hits.push({ where: file, src });
  }
  return hits;
}

function scanTree() {
  const hits = [];
  const files = git(['ls-files', '-z']).split('\0').filter(Boolean);
  for (const f of files) {
    let text;
    try { text = fs.readFileSync(path.join(repoRoot, f), 'utf8'); } catch { continue; }
    if (text.includes('\0')) continue; // binary
    for (const { src, re } of patterns) if (re.test(text)) hits.push({ where: f, src });
  }
  return hits;
}

const args = process.argv.slice(2);
let report = [];

if (args.includes('--all')) {
  report = scanTree().map((h) => ({ sha: 'working tree', ...h }));
} else {
  let tips = ['HEAD'];
  if (args.includes('--pre-push')) {
    const stdin = fs.readFileSync(0, 'utf8');
    tips = stdin
      .split('\n')
      .map((l) => l.trim().split(/\s+/))
      .filter((p) => p.length >= 2 && !ZERO.test(p[1]))
      .map((p) => p[1]);
  }
  for (const sha of outgoingCommits(tips)) {
    for (const h of scanCommit(sha)) report.push({ sha: sha.slice(0, 8), ...h });
  }
}

if (!report.length) {
  console.log(`check-private-leaks: clean (${patterns.length} patterns).`);
  process.exit(0);
}

const seen = new Set();
console.error('check-private-leaks: private patterns found in content about to be published:');
for (const { sha, where, src } of report) {
  const key = `${sha}|${where}|${src}`;
  if (seen.has(key)) continue;
  seen.add(key);
  console.error(`  ${sha}  ${where}  matches /${src}/`);
}
console.error('Remove the details (or move the doc under gitignored internaldocs/private/) and rewrite the');
console.error('unpushed commits before pushing. Bypass only if certain: git push --no-verify');
process.exit(1);
