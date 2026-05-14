import {
  buildDiscoverySnapshot,
  filterModules,
  filterRacks,
  filterManuals,
  filterComments,
  pagedSlice$,
} from './user-area-data.utils';
import {
  BehaviorSubject,
  of,
} from 'rxjs';

const makeModule = (name: string, mfr = '', desc = '', tags: string[] = []) => ({
  name, description: desc,
  manufacturer: { name: mfr },
  tags: tags.map(t => ({ tag: { name: t, id: 0 } }))
} as any);

const makeRack = (name: string, desc = '') => ({ name, description: desc } as any);
const makeManual = (name: string, mfr = '', desc = '') => ({ name, description: desc, manufacturer: { name: mfr } } as any);
const makeComment = (content: string, username = '') => ({ content, profile: { username } } as any);

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
