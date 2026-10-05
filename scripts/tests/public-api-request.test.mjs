import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  decodeCursor,
  normalizeApiRequest,
  parseCsv,
  parseLimit,
  parseModuleIncludes,
  parseOptionalNonnegativeInteger,
  parseOptionalPositiveInteger,
  parseSort,
} from '../../cloudflare/public-api/src/request.ts';

const base = 'https://api.patcher.xyz';
const norm = path => normalizeApiRequest(`${base}${path}`);
const key = path => {
  const result = norm(path);
  assert.equal(result.ok, true, `${path} should normalise`);
  return result.cacheKey;
};
const fail = (path) => {
  const result = norm(path);
  assert.equal(result.ok, false, `${path} should be rejected`);
  return result;
};
const cursor = payload => Buffer.from(JSON.stringify(payload)).toString('base64url');

test('equivalent requests share one cache key regardless of order, case, whitespace, duplicates and trailing slashes', () => {
  const canonical = key('/v1/modules?hp=8&include=ins,tags&limit=50&sort=name');
  for (const variant of [
    '/v1/modules?sort=name&limit=50&include=ins,tags&hp=8',
    '/v1/modules/?hp=8&include=tags,ins',
    '/v1/modules//?hp=8&include=TAGS,INS',
    '/v1/modules?hp=%208%20&include=ins%2Ctags',
    '/v1/modules?hp=8&include=ins,tags,ins,tags',
    '/v1/modules?hp=8&include=%20ins%20,%20tags%20&sort=NAME',
    '/v1/modules?hp=8.0&include=ins,tags',
    '/v1/modules?hp=%2B8&include=ins,tags',
    '/v1/modules?hp=8&include=ins,tags&limit=',
    '/v1/modules?hp=8&include=ins,tags&sort=',
    '/v1/modules?hp=8&include=ins,tags&cursor=',
  ]) {
    assert.equal(key(variant), canonical, variant);
  }
});

test('different semantics never collide on a cache key', () => {
  const keys = new Map();
  for (const path of [
    '/v1/modules',
    '/v1/modules?hp=8',
    '/v1/modules?hp=9',
    '/v1/modules?limit=10',
    '/v1/modules?sort=id',
    '/v1/modules?standard=0',
    '/v1/modules?standard=1',
    '/v1/modules?manufacturer_id=8',
    '/v1/modules?tag=8',
    '/v1/modules?include=ins',
    '/v1/modules?include=outs',
    '/v1/modules?fields=name',
    '/v1/manufacturers',
    '/v1/standards',
    '/v1/tags',
    '/v1/modules/8',
    '/v1/manufacturers/8',
  ]) {
    const k = key(path);
    assert.ok(!keys.has(k), `${path} collides with ${keys.get(k)}`);
    keys.set(k, path);
  }
});

test('the cache key never contains the origin, host, auth material or fragment', () => {
  const k = key('/v1/modules?hp=8#frag');
  assert.ok(k.startsWith('GET /v1/modules?'));
  assert.ok(!k.includes('api.patcher.xyz'));
  assert.ok(!k.includes('frag'));
});

test('duplicate scalar params collapse to one value, so a cache key cannot be inflated with repeats', () => {
  const result = norm('/v1/modules?hp=8&hp=9');
  assert.equal(result.ok, true);
  assert.equal(result.url.searchParams.getAll('hp').length, 1);
});

test('limit is clamped to 100 and rejects non-positive or non-integer values', () => {
  assert.equal(norm('/v1/modules?limit=100').url.searchParams.get('limit'), '100');
  assert.equal(norm('/v1/modules?limit=101').url.searchParams.get('limit'), '100');
  assert.equal(norm('/v1/modules?limit=99999999999').url.searchParams.get('limit'), '100');
  assert.equal(norm('/v1/modules?limit=1').url.searchParams.get('limit'), '1');
  for (const bad of ['0', '-1', '1.5', 'abc', 'NaN', 'Infinity', '1e400']) {
    assert.equal(fail(`/v1/modules?limit=${bad}`).parameter, 'limit', bad);
  }
});

test('numeric filters accept only integers in range and report the offending parameter', () => {
  for (const param of ['hp', 'manufacturer_id', 'tag']) {
    for (const bad of ['0', '-1', '1.5', 'x', 'Infinity', '--1']) {
      const result = fail(`/v1/modules?${param}=${bad}`);
      assert.equal(result.code, 'invalid_parameter', `${param}=${bad}`);
      assert.equal(result.parameter, param);
    }
  }
  assert.equal(norm('/v1/modules?standard=0').ok, true);
  for (const bad of ['-1', '1.5', 'x']) {
    assert.equal(fail(`/v1/modules?standard=${bad}`).parameter, 'standard', bad);
  }
});

test('injection-shaped values are rejected before they can reach a query', () => {
  for (const value of ["8;DROP TABLE modules", "8' OR '1'='1", '8%00', '1,2', '%3Cscript%3E', '8 8']) {
    for (const param of ['hp', 'manufacturer_id', 'tag', 'standard', 'limit']) {
      assert.equal(norm(`/v1/modules?${param}=${value}`).ok, false, `${param}=${value}`);
    }
  }
});

test('include and fields are allow-listed per route and deduplicated and sorted', () => {
  assert.equal(norm('/v1/modules?include=panels,ins,panels').url.searchParams.get('include'), 'ins,panels');
  assert.equal(fail('/v1/modules?include=secret').parameter, 'include');
  assert.equal(fail('/v1/modules?include=ins,secret').parameter, 'include');
  assert.equal(fail('/v1/modules?include=,').parameter, 'include');
  assert.equal(norm('/v1/manufacturers/1?include=modules').ok, true);
  assert.equal(fail('/v1/manufacturers/1?include=ins').parameter, 'include');
  assert.equal(fail('/v1/modules/1?include=modules').parameter, 'include');
  assert.equal(fail('/v1/modules?fields=password').parameter, 'fields');
  assert.equal(fail('/v1/modules?fields=name,password').parameter, 'fields');
  assert.equal(fail('/v1/modules?fields=,,').parameter, 'fields');
});

test('fields allow-list is case-sensitive and not satisfied by prototype keys', () => {
  for (const field of ['NAME', '__proto__', 'constructor', 'toString', 'hasOwnProperty', 'name;']) {
    assert.equal(norm(`/v1/modules?fields=${encodeURIComponent(field)}`).ok, false, field);
  }
});

test('parameters are validated per route, so a list filter on a detail route is unknown', () => {
  for (const path of [
    '/v1/modules/1?limit=10',
    '/v1/modules/1?hp=8',
    '/v1/manufacturers?hp=8',
    '/v1/manufacturers/1?limit=5',
    '/v1/standards?hp=8',
    '/v1/standards?include=ins',
    '/v1/tags?standard=1',
  ]) {
    assert.equal(fail(path).code, 'unknown_parameter', path);
  }
});

test('q and unsupported sorts are explicitly unsupported rather than silently ignored', () => {
  assert.equal(fail('/v1/modules?q=osc').code, 'unsupported_parameter');
  assert.equal(fail('/v1/manufacturers?q=x').code, 'unsupported_parameter');
  assert.equal(fail('/v1/modules?sort=hp').code, 'unsupported_parameter');
  assert.equal(fail('/v1/modules?sort=name;id').code, 'unsupported_parameter');
});

test('blank q is dropped instead of rejected, and unknown parameter names are rejected even when blank', () => {
  assert.equal(norm('/v1/modules?q=').ok, true);
  assert.equal(norm('/v1/modules?q=%20').ok, true);
  assert.equal(fail('/v1/modules?debug=').code, 'unknown_parameter');
  assert.equal(fail('/v1/modules?HP=8').code, 'unknown_parameter');
});

test('unknown paths normalise with no route and reject every parameter', () => {
  const none = norm('/v1/unknown');
  assert.equal(none.ok, true);
  assert.equal(none.route, null);
  assert.equal(norm('/v1/unknown?hp=8').code, 'unknown_parameter');
  assert.equal(norm('/').route, null);
  for (const path of ['/v1/modules/abc', '/v1/modules/-1', '/v1/modules/1/2', '/v1/modules/1.5', '/V1/modules', '/v2/modules', '/v1/Modules']) {
    assert.equal(norm(path).route, null, path);
  }
});

test('detail routes extract numeric ids only', () => {
  assert.deepEqual(norm('/v1/modules/42').route, { kind: 'modules:detail', id: 42 });
  assert.deepEqual(norm('/v1/manufacturers/7/').route, { kind: 'manufacturers:detail', id: 7 });
  assert.equal(norm('/v1/modules/0').route.id, 0);
});

test('list routes get default limit and sort; detail routes do not', () => {
  const list = norm('/v1/tags');
  assert.equal(list.url.searchParams.get('limit'), '50');
  assert.equal(list.url.searchParams.get('sort'), 'name');
  const detail = norm('/v1/modules/1');
  assert.equal(detail.url.search, '');
});

test('cursors are re-encoded canonically, so differently-padded or reordered forms share one key', () => {
  const payload = { v: 1, s: 'Alpha', id: 5 };
  const a = cursor(payload);
  const b = Buffer.from(JSON.stringify({ id: 5, s: 'Alpha', v: 1 })).toString('base64');
  const c = Buffer.from(JSON.stringify({ ...payload, extra: 'ignored' })).toString('base64url');
  assert.equal(key(`/v1/modules?cursor=${a}`), key(`/v1/modules?cursor=${encodeURIComponent(b)}`));
  assert.equal(key(`/v1/modules?cursor=${a}`), key(`/v1/modules?cursor=${c}`));
});

test('malformed cursors are rejected without throwing', () => {
  for (const bad of [
    'x', '!!!', '%00', 'e30', cursor({}), cursor({ v: 2, s: 'a', id: 1 }), cursor({ v: 1, s: 'a', id: -1 }),
    cursor({ v: 1, s: 'a', id: 1.5 }), cursor({ v: 1, s: 'a', id: '1' }), cursor({ v: 1, s: null, id: 1 }),
    cursor({ v: 1, s: {}, id: 1 }), cursor({ v: 1, s: [], id: 1 }), cursor([1, 2]), cursor(null),
    Buffer.from('not json').toString('base64url'), Buffer.from([0xff, 0xfe, 0xfd]).toString('base64url'),
    'A'.repeat(10_000),
  ]) {
    assert.doesNotThrow(() => norm(`/v1/modules?cursor=${bad}`));
    assert.equal(norm(`/v1/modules?cursor=${bad}`).ok, false, String(bad).slice(0, 30));
  }
});

test('cursor type must match the sort: strings for name, numbers for id', () => {
  assert.equal(norm(`/v1/modules?sort=id&cursor=${cursor({ v: 1, s: 5, id: 5 })}`).ok, true);
  assert.equal(fail(`/v1/modules?sort=id&cursor=${cursor({ v: 1, s: 'x', id: 5 })}`).parameter, 'cursor');
  assert.equal(fail(`/v1/modules?cursor=${cursor({ v: 1, s: 5, id: 5 })}`).parameter, 'cursor');
});

test('decodeCursor round-trips valid tokens and returns null for junk', () => {
  assert.deepEqual(decodeCursor(cursor({ v: 1, s: 'Ünï', id: 3 })), { v: 1, s: 'Ünï', id: 3 });
  assert.equal(decodeCursor(null), null);
  assert.equal(decodeCursor(''), null);
  assert.equal(decodeCursor('###'), null);
  assert.deepEqual(decodeCursor(Buffer.from(JSON.stringify({ v: 1, s: 'a', id: 0 })).toString('base64')), { v: 1, s: 'a', id: 0 });
});

test('parse helpers fall back safely on junk input', () => {
  assert.deepEqual(parseCsv(null), []);
  assert.deepEqual(parseCsv(' a, ,b,,'), ['a', 'b']);
  assert.deepEqual(parseModuleIncludes('ins,tags'), ['ins', 'tags']);
  assert.equal(parseLimit(null), 50);
  assert.equal(parseLimit('0'), 50);
  assert.equal(parseLimit('-5'), 50);
  assert.equal(parseLimit('abc'), 50);
  assert.equal(parseLimit('1000'), 100);
  assert.equal(parseLimit('7'), 7);
  assert.equal(parseSort('id'), 'id');
  for (const value of [null, '', 'ID', 'name', 'hp']) {
    assert.equal(parseSort(value), 'name', String(value));
  }
  assert.equal(parseOptionalPositiveInteger(null), null);
  assert.equal(parseOptionalPositiveInteger('0'), null);
  assert.equal(parseOptionalPositiveInteger('3'), 3);
  assert.equal(parseOptionalPositiveInteger('3.5'), null);
  assert.equal(parseOptionalNonnegativeInteger('0'), 0);
  assert.equal(parseOptionalNonnegativeInteger('-1'), null);
  assert.equal(parseOptionalNonnegativeInteger(''), 0);
});
