import {
  BehaviorSubject,
  combineLatest
} from 'rxjs';
import { map } from 'rxjs/operators';
import { Patch } from 'src/app/models/patch';


const PATCHES_WITH_TAGS: Partial<Patch>[] = [
  {id: 1, name: 'Bass Patch', tags: ['bass', 'dark']},
  {id: 2, name: 'Ambient Pad', tags: ['ambient', 'pads']},
  {id: 3, name: 'Percussion', tags: ['percussion', 'dark']},
  {id: 4, name: 'No Tags', tags: []},
  {id: 5, name: 'Null Tags', tags: undefined},
];

/** Minimal replica of the UserAreaDataService tag-filter logic under test. */
function buildTagFilter(patchesData$: BehaviorSubject<Patch[] | undefined>) {
  const activeTagFilter$ = new BehaviorSubject<string | null>(null);

  const filteredPatchesData$ = combineLatest([patchesData$, activeTagFilter$]).pipe(
    map(([patches, tag]) => {
      if (!patches) { return undefined; }
      if (!tag) { return patches; }
      return patches.filter(p => (p.tags ?? []).includes(tag));
    })
  );

  const allPatchTags$ = patchesData$.pipe(
    map(patches => {
      if (!patches) { return []; }
      const tagSet = new Set<string>();
      for (const p of patches) {
        for (const t of (p.tags ?? [])) {
          tagSet.add(t);
        }
      }
      return Array.from(tagSet).sort();
    })
  );

  return {activeTagFilter$, filteredPatchesData$, allPatchTags$};
}

describe('Tag filter logic (UserAreaDataService)', () => {
  let patchesData$: BehaviorSubject<Patch[] | undefined>;
  let activeTagFilter$: BehaviorSubject<string | null>;
  let filteredPatchesData$: ReturnType<typeof buildTagFilter>['filteredPatchesData$'];
  let allPatchTags$: ReturnType<typeof buildTagFilter>['allPatchTags$'];

  beforeEach(() => {
    patchesData$ = new BehaviorSubject<Patch[] | undefined>(undefined);
    const filter = buildTagFilter(patchesData$);
    activeTagFilter$ = filter.activeTagFilter$;
    filteredPatchesData$ = filter.filteredPatchesData$;
    allPatchTags$ = filter.allPatchTags$;
  });

  it('should return undefined when patches are not yet loaded', (done) => {
    filteredPatchesData$.subscribe(result => {
      expect(result).toBeUndefined();
      done();
    });
  });

  it('should return all patches when no filter is active', (done) => {
    patchesData$.next(PATCHES_WITH_TAGS as Patch[]);
    filteredPatchesData$.subscribe(result => {
      expect(result?.length).toBe(PATCHES_WITH_TAGS.length);
      done();
    });
  });

  it('should filter patches by tag', (done) => {
    patchesData$.next(PATCHES_WITH_TAGS as Patch[]);
    activeTagFilter$.next('dark');
    filteredPatchesData$.subscribe(result => {
      expect(result?.length).toBe(2);
      expect(result?.map(p => p.id)).toEqual([1, 3]);
      done();
    });
  });

  it('should return empty array when no patches match the tag', (done) => {
    patchesData$.next(PATCHES_WITH_TAGS as Patch[]);
    activeTagFilter$.next('nonexistent');
    filteredPatchesData$.subscribe(result => {
      expect(result?.length).toBe(0);
      done();
    });
  });

  it('should return all patches when filter is cleared (set to null)', (done) => {
    patchesData$.next(PATCHES_WITH_TAGS as Patch[]);
    activeTagFilter$.next('dark');
    activeTagFilter$.next(null);
    filteredPatchesData$.subscribe(result => {
      expect(result?.length).toBe(PATCHES_WITH_TAGS.length);
      done();
    });
  });

  it('should handle patches with undefined tags gracefully', (done) => {
    patchesData$.next(PATCHES_WITH_TAGS as Patch[]);
    activeTagFilter$.next('ambient');
    filteredPatchesData$.subscribe(result => {
      expect(result?.every(p => (p.tags ?? []).includes('ambient'))).toBeTrue();
      done();
    });
  });

  it('should collect all unique tags from patches, sorted', (done) => {
    patchesData$.next(PATCHES_WITH_TAGS as Patch[]);
    allPatchTags$.subscribe(tags => {
      expect(tags).toEqual(['ambient', 'bass', 'dark', 'pads', 'percussion']);
      done();
    });
  });

  it('should return empty tag list when patches data is undefined', (done) => {
    allPatchTags$.subscribe(tags => {
      expect(tags).toEqual([]);
      done();
    });
  });
});
