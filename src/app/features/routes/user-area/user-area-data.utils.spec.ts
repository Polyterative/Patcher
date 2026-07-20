import {
  buildDiscoverySnapshot,
  collectPatchTags,
  filterModules,
  filterPatches,
  filterRacks,
  filterManuals,
  filterComments,
  hasMoreFromTake$,
  hasMoreLoaded$,
  pagedSlice$,
  remainingFromTake$,
  remainingLoaded$,
} from './user-area-data.utils';
import {
  BehaviorSubject,
  firstValueFrom,
} from 'rxjs';
import { Patch } from 'src/app/models/patch';

const makeModule = (name: string, mfr = '', desc = '', tags: string[] = []) => ({
  name, description: desc,
  manufacturer: { name: mfr },
  tags: tags.map(t => ({ tag: { name: t, id: 0 } }))
} as any);

const makeRack = (name: string, desc = '') => ({ name, description: desc } as any);
const makeManual = (name: string, mfr = '', desc = '') => ({ name, description: desc, manufacturer: { name: mfr } } as any);
const makeComment = (content: string, username = '') => ({ content, profile: { username } } as any);
const makePatch = (name: string, desc = '', tags: string[] = []) => ({ name, description: desc, tags } as Patch);

describe('user-area-data.utils', () => {
  describe('buildDiscoverySnapshot', () => {
    it('builds snapshot with all counts', () => {
      const result = buildDiscoverySnapshot(
        [makeModule('A'), makeModule('B')],
        [makeRack('R')],
        [{} as any],
        [{} as any],
        [{} as any],
        ''
      );
      expect(result.modulesCount).toBe(2);
      expect(result.racksCount).toBe(1);
      expect(result.totalCount).toBe(4);
      expect(result.hasSearchQuery).toBeFalse();
    });

    it('marks hasSearchQuery true when query is non-empty', () => {
      const result = buildDiscoverySnapshot([], [], [], [], [], 'test');
      expect(result.hasSearchQuery).toBeTrue();
    });

    it('handles undefined arrays gracefully', () => {
      const result = buildDiscoverySnapshot(undefined, undefined, undefined, undefined, undefined, '');
      expect(result.modulesLoaded).toBeFalse();
      expect(result.totalCount).toBe(0);
    });
  });

  describe('filterModules', () => {
    it('returns undefined for undefined input', () => {
      expect(filterModules(undefined, 'q')).toBeUndefined();
    });

    it('returns all when query is empty', () => {
      const modules = [makeModule('Moog'), makeModule('Make Noise')];
      expect(filterModules(modules, '')?.length).toBe(2);
    });

    it('filters by name match', () => {
      const modules = [makeModule('Moog Filter'), makeModule('Make Noise Wobble')];
      expect(filterModules(modules, 'moog')?.length).toBe(1);
    });
  });

  describe('filterRacks', () => {
    it('returns undefined for undefined input', () => {
      expect(filterRacks(undefined, 'q')).toBeUndefined();
    });

    it('filters by rack name', () => {
      const racks = [makeRack('Live Rack'), makeRack('Studio Setup')];
      expect(filterRacks(racks, 'live')?.length).toBe(1);
    });
  });

  describe('filterManuals', () => {
    it('returns undefined for undefined input', () => {
      expect(filterManuals(undefined, 'q')).toBeUndefined();
    });

    it('filters manuals by name', () => {
      const manuals = [makeManual('VCO Manual'), makeManual('Filter Guide')];
      expect(filterManuals(manuals, 'vco')?.length).toBe(1);
    });
  });

  describe('filterComments', () => {
    it('returns undefined for undefined input', () => {
      expect(filterComments(undefined, 'q')).toBeUndefined();
    });

    it('filters comments by content', () => {
      const comments = [makeComment('great patch'), makeComment('boring rack')];
      expect(filterComments(comments, 'great')?.length).toBe(1);
    });
  });

  describe('filterPatches', () => {
    it('returns undefined for undefined input', () => {
      expect(filterPatches(undefined, null, 'q')).toBeUndefined();
    });

    it('filters by selected tag and search query', () => {
      const patches = [
        makePatch('Ambient Clouds', 'dreamy pad', ['ambient', 'delay']),
        makePatch('Bass Growl', 'acid line', ['bass'])
      ];

      expect(filterPatches(patches, 'ambient', 'clouds')).toEqual([patches[0]]);
      expect(filterPatches(patches, 'ambient', 'bass')).toEqual([]);
    });
  });

  describe('collectPatchTags', () => {
    it('returns sorted unique patch tags', () => {
      expect(collectPatchTags([
        makePatch('A', '', ['zeta', 'alpha']),
        makePatch('B', '', ['alpha', 'mid'])
      ])).toEqual(['alpha', 'mid', 'zeta']);
    });

    it('returns an empty list before patches load', () => {
      expect(collectPatchTags(undefined)).toEqual([]);
    });
  });
});

describe('pagedSlice$', () => {
  it('slices array according to skip and take values', done => {
    const data$ = new BehaviorSubject<number[]>([1, 2, 3, 4, 5]);
    const skip$ = new BehaviorSubject<number>(1);
    const take$ = new BehaviorSubject<number>(3);

    pagedSlice$(data$, skip$, take$).subscribe(result => {
      expect(result).toEqual([2, 3, 4]);
      done();
    });
  });

  it('returns undefined when data$ emits undefined', done => {
    const data$ = new BehaviorSubject<number[] | undefined>(undefined);
    const skip$ = new BehaviorSubject<number>(0);
    const take$ = new BehaviorSubject<number>(5);

    pagedSlice$(data$, skip$, take$).subscribe(result => {
      expect(result).toBeUndefined();
      done();
    });
  });

  it('returns empty array when skip exceeds array length', done => {
    const data$ = new BehaviorSubject<number[]>([1, 2]);
    const skip$ = new BehaviorSubject<number>(10);
    const take$ = new BehaviorSubject<number>(5);

    pagedSlice$(data$, skip$, take$).subscribe(result => {
      expect(result).toEqual([]);
      done();
    });
  });

  it('emits updated slice when skip changes', done => {
    const data$ = new BehaviorSubject<number[]>([10, 20, 30, 40]);
    const skip$ = new BehaviorSubject<number>(0);
    const take$ = new BehaviorSubject<number>(2);
    const results: (number[] | undefined)[] = [];

    pagedSlice$(data$, skip$, take$).subscribe(result => {
      results.push(result);
      if (results.length === 2) {
        expect(results[0]).toEqual([10, 20]);
        expect(results[1]).toEqual([30, 40]);
        done();
      }
    });

    skip$.next(2);
  });
});

describe('pagination helpers', () => {
  it('reports whether take-based pagination has more items', async () => {
    expect(await firstValueFrom(hasMoreFromTake$(new BehaviorSubject(11), new BehaviorSubject(10)))).toBeTrue();
    expect(await firstValueFrom(hasMoreFromTake$(new BehaviorSubject(10), new BehaviorSubject(10)))).toBeFalse();
  });

  it('calculates remaining take-based items without going negative', async () => {
    expect(await firstValueFrom(remainingFromTake$(new BehaviorSubject(14), new BehaviorSubject(10)))).toBe(4);
    expect(await firstValueFrom(remainingFromTake$(new BehaviorSubject(4), new BehaviorSubject(10)))).toBe(0);
  });

  it('reports whether loaded-data pagination has more items', async () => {
    expect(await firstValueFrom(hasMoreLoaded$(new BehaviorSubject(3), new BehaviorSubject([1, 2])))).toBeTrue();
    expect(await firstValueFrom(hasMoreLoaded$(new BehaviorSubject(2), new BehaviorSubject([1, 2])))).toBeFalse();
  });

  it('calculates remaining loaded-data items without going negative', async () => {
    expect(await firstValueFrom(remainingLoaded$(new BehaviorSubject(5), new BehaviorSubject([1, 2])))).toBe(3);
    expect(await firstValueFrom(remainingLoaded$(new BehaviorSubject(1), new BehaviorSubject([1, 2])))).toBe(0);
  });
});
