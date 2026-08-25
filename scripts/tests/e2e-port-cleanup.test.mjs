import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  collectProtectedPids,
  findPidsListeningOnPort,
  getParentPidViaPs,
  killAnyProcessListeningOnPort,
  selectPidsToKill
} from '../../e2e/helpers/port-cleanup.ts';

// --- collectProtectedPids (AT-TD1) ---------------------------------------

test('collectProtectedPids: includes the start pid and every ancestor up to root', () => {
  const parents = new Map([[300, 200], [200, 100], [100, 1]]);
  const getParentPid = pid => parents.get(pid) ?? null;

  const protectedPids = collectProtectedPids(300, getParentPid);

  assert.deepEqual([...protectedPids].sort((a, b) => a - b), [100, 200, 300]);
});

test('collectProtectedPids: stops safely when the ancestor lookup returns null', () => {
  const getParentPid = () => null;

  const protectedPids = collectProtectedPids(42, getParentPid);

  assert.deepEqual([...protectedPids], [42]);
});

test('collectProtectedPids: stops at pid 1 (never walks past init)', () => {
  const parents = new Map([[50, 1]]);
  const getParentPid = pid => parents.get(pid) ?? null;

  const protectedPids = collectProtectedPids(50, getParentPid);

  assert.deepEqual([...protectedPids].sort((a, b) => a - b), [50]);
});

test('collectProtectedPids: does not loop forever on a cyclical parent map', () => {
  const getParentPid = pid => (pid === 10 ? 20 : 10);

  const protectedPids = collectProtectedPids(10, getParentPid, 5);

  // The cycle (10 -> 20 -> 10 -> ...) is detected via the "already seen"
  // check and breaks after one full loop, well before maxDepth — assert the
  // exact expected members, not just a loose upper bound on set size.
  assert.deepEqual([...protectedPids].sort((a, b) => a - b), [10, 20]);
});

test('collectProtectedPids: a non-repeating chain is bounded by maxDepth, not left to run unbounded', () => {
  // Every pid is new (pid + 1), so the cycle/"already seen" guard never
  // fires — only maxDepth can stop this walk. Proves the cap is real.
  const getParentPid = pid => pid + 1;

  const protectedPids = collectProtectedPids(1000, getParentPid, 5);

  assert.deepEqual(
    [...protectedPids].sort((a, b) => a - b),
    [1000, 1001, 1002, 1003, 1004, 1005]
  );
});

// --- selectPidsToKill (AT-TD1 / AT-TD3) ----------------------------------

test('selectPidsToKill: is a pure passthrough when nothing is protected', () => {
  const result = selectPidsToKill([111, 222], new Set());
  assert.deepEqual(result, [111, 222]);
});

test('selectPidsToKill: drops every protected pid from the candidate list', () => {
  const result = selectPidsToKill([111, 222, 333], new Set([222]));
  assert.deepEqual(result, [111, 333]);
});

test('selectPidsToKill (AT-TD3): de-duplicates repeated candidate pids', () => {
  const result = selectPidsToKill([111, 111, 222], new Set());
  assert.deepEqual(result, [111, 222]);
});

test('selectPidsToKill (AT-TD3): drops malformed candidate values (NaN, zero, negative, non-integer)', () => {
  const result = selectPidsToKill([111, Number.NaN, -1, 0, 1.5, 222], new Set());
  assert.deepEqual(result, [111, 222]);
});

// --- killAnyProcessListeningOnPort: the direct regression (AT-TD1) ------

test('killAnyProcessListeningOnPort (AT-TD1): never signals the current process', () => {
  const killed = [];
  const fakeOrphanPid = 4242;

  killAnyProcessListeningOnPort(5556, {
    findPids: () => [fakeOrphanPid, process.pid],
    getParentPid: () => null,
    kill: pid => killed.push(pid)
  });

  assert.deepEqual(killed, [fakeOrphanPid]);
  assert.ok(!killed.includes(process.pid));
});

test('killAnyProcessListeningOnPort (AT-TD1): never signals an ancestor of the current process', () => {
  const killed = [];
  const fakeOrphanPid = 4243;
  const fakeAncestorPid = 999;

  killAnyProcessListeningOnPort(5556, {
    findPids: () => [fakeOrphanPid, fakeAncestorPid],
    getParentPid: pid => (pid === process.pid ? fakeAncestorPid : null),
    kill: pid => killed.push(pid)
  });

  assert.deepEqual(killed, [fakeOrphanPid]);
  assert.ok(!killed.includes(fakeAncestorPid));
});

// --- killAnyProcessListeningOnPort: descendant/orphan preservation (AT-TD2) --

test('killAnyProcessListeningOnPort (AT-TD2): still kills unrelated descendant/orphan server pids when none are protected', () => {
  const killed = [];
  const orphanA = 5001;
  const orphanB = 5002;

  killAnyProcessListeningOnPort(5556, {
    findPids: () => [orphanA, orphanB],
    getParentPid: () => null,
    kill: pid => killed.push(pid)
  });

  assert.deepEqual(killed.sort((a, b) => a - b), [orphanA, orphanB]);
});

test('killAnyProcessListeningOnPort (AT-TD2): a genuine descendant of the current process (e.g. the ng serve child) is still killed', () => {
  const killed = [];
  const descendantServerPid = 5003; // its real parent is the current process
  const fakeAncestorPid = 998; // an unrelated ancestor of the current process

  // Model the real topology explicitly: descendantServerPid's parent IS
  // process.pid (a true child), and process.pid's own parent is the
  // (unrelated) fakeAncestorPid — proving protection only ever flows
  // upward from the current process, never down to something it spawned.
  const parents = new Map([
    [process.pid, fakeAncestorPid],
    [descendantServerPid, process.pid]
  ]);

  killAnyProcessListeningOnPort(5556, {
    findPids: () => [descendantServerPid, fakeAncestorPid],
    getParentPid: pid => parents.get(pid) ?? null,
    kill: pid => killed.push(pid)
  });

  assert.deepEqual(killed, [descendantServerPid]);
});

// --- killAnyProcessListeningOnPort: malformed/duplicate/vanished (AT-TD3) --

test('killAnyProcessListeningOnPort (AT-TD3): tolerates a kill() throw for a vanished pid and still processes the rest', () => {
  const killed = [];
  const vanishedPid = 6001;
  const stillAlivePid = 6002;

  assert.doesNotThrow(() => {
    killAnyProcessListeningOnPort(5556, {
      findPids: () => [vanishedPid, stillAlivePid],
      getParentPid: () => null,
      kill: pid => {
        if (pid === vanishedPid) {
          throw new Error('ESRCH: no such process');
        }
        killed.push(pid);
      }
    });
  });

  assert.deepEqual(killed, [stillAlivePid]);
});

test('killAnyProcessListeningOnPort (AT-TD3): duplicate candidate pids are only signaled once', () => {
  const killed = [];
  const orphanPid = 6003;

  killAnyProcessListeningOnPort(5556, {
    findPids: () => [orphanPid, orphanPid],
    getParentPid: () => null,
    kill: pid => killed.push(pid)
  });

  assert.deepEqual(killed, [orphanPid]);
});

test('killAnyProcessListeningOnPort: does nothing when no pids are found', () => {
  const killed = [];

  killAnyProcessListeningOnPort(5556, {
    findPids: () => [],
    getParentPid: () => null,
    kill: pid => killed.push(pid)
  });

  assert.deepEqual(killed, []);
});

// --- getParentPidViaPs: real ps-backed lookup, failure safety -----------

test('getParentPidViaPs: returns null (does not throw) for a pid that does not exist', () => {
  // A pid this large is vanishingly unlikely to be a real running process,
  // so `ps -o ppid= -p <pid>` fails (non-zero exit) — proving the real
  // implementation's failure path stays safe (null, no throw), the same
  // "any failure -> safe empty result" convention findPidsListeningOnPort
  // uses below for lsof.
  const impossiblePid = 2 ** 31 - 1;

  let parentPid;
  assert.doesNotThrow(() => {
    parentPid = getParentPidViaPs(impossiblePid);
  });
  assert.equal(parentPid, null);
});

// --- killAnyProcessListeningOnPort: production defaults are wired --------

test('killAnyProcessListeningOnPort: works with zero extra args when nothing is listening on the port', () => {
  // Confirm the real, lsof-backed findPidsListeningOnPort finds nothing on
  // this reserved, virtually-never-bound port *before* calling the full
  // function with zero overrides — so this can never risk a real SIGKILL
  // against an unrelated process even in principle.
  assert.deepEqual(findPidsListeningOnPort(1), []);

  assert.doesNotThrow(() => {
    killAnyProcessListeningOnPort(1);
  });
});
