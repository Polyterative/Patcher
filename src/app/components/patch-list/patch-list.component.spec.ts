import { BehaviorSubject, of } from 'rxjs';
import type { Observable } from 'rxjs';
import { PatchListComponent } from './patch-list.component';
import { LocalDataFilterService } from '../shared-atoms/local-data-filter/local-data-filter.service';
import { PatchMinimal } from 'src/app/models/patch';
import type { PatchList } from '../../features/patch-browser/patch-browser-data.service';
import type { PublicUser } from 'src/app/models/user';

type NullablePatchList = Array<PatchMinimal | null>;

type PatchListComponentInputHarness = Omit<PatchListComponent, 'data$' | 'showSearch'> & {
  data$: Observable<PatchList | NullablePatchList>;
  showSearch: boolean;
};

const TEST_USER: PublicUser = { id: 'u1', username: 'user' };

function makePatch(overrides: Partial<PatchMinimal> = {}): PatchMinimal {
  return {
    id: 1,
    name: 'My Patch',
    description: 'A test patch',
    author: TEST_USER,
    created: '',
    updated: '',
    public: true,
    ...overrides
  };
}

function makeFilterService(): LocalDataFilterService {
  return new LocalDataFilterService();
}

function makeComp(filterService = makeFilterService()): PatchListComponent {
  return new PatchListComponent(filterService);
}

function setDataStream(comp: PatchListComponent, data$: Observable<PatchList | NullablePatchList>): void {
  (comp as PatchListComponentInputHarness).data$ = data$;
}

function enableLocalSearch(comp: PatchListComponent): void {
  (comp as PatchListComponentInputHarness).showSearch = true;
}

function setExternalSearchQuery(comp: PatchListComponent, value: string | null | undefined): void {
  expect(Reflect.set(comp, 'externalSearchQuery', value)).toBeTrue();
}

function expectCurrentFilteredData(comp: PatchListComponent): PatchList {
  let result: PatchList | undefined;
  comp.filteredData$.subscribe(v => (result = v)).unsubscribe();
  if (!result) {
    fail('Expected filteredData$ to emit a patch list');
    return [];
  }
  return result;
}

describe('PatchListComponent', () => {
  describe('construction', () => {
    it('creates without error', () => {
      expect(() => makeComp()).not.toThrow();
    });
    it('filteredData$ starts as []', () => {
      const comp = makeComp();
      const initial = expectCurrentFilteredData(comp);
      expect(initial).toEqual([]);
    });

    it('showSearch defaults to false', () => {
      expect(makeComp().showSearch).toBeFalse();
    });
  });

  describe('externalSearchQuery setter', () => {
    it('filters items by external query', () => {
      const comp = makeComp();
      const patches = [makePatch({ name: 'Ambient' }), makePatch({ name: 'Techno' })];
      setDataStream(comp, of(patches));
      comp.ngOnInit();

      comp.externalSearchQuery = 'ambient';

      const result = expectCurrentFilteredData(comp);
      expect(result.length).toBe(1);
      expect(result[0].name).toBe('Ambient');
    });

    it('treats undefined as empty string (no filter)', () => {
      const comp = makeComp();
      const patches = [makePatch({ name: 'A' }), makePatch({ name: 'B' })];
      setDataStream(comp, of(patches));
      comp.ngOnInit();

      setExternalSearchQuery(comp, undefined);

      const result = expectCurrentFilteredData(comp);
      expect(result.length).toBe(2);
    });
  });

  describe('ngOnInit — showSearch=false', () => {
    it('emits all patches from data$ when no search terms', () => {
      const comp = makeComp();
      const patches = [makePatch({ name: 'A' }), makePatch({ name: 'B' })];
      setDataStream(comp, of(patches));
      comp.ngOnInit();

      const result = expectCurrentFilteredData(comp);
      expect(result.length).toBe(2);
    });

    it('filters by name', () => {
      const comp = makeComp();
      setDataStream(comp, of([makePatch({ name: 'Roland' }), makePatch({ name: 'Moog' })]));
      comp.ngOnInit();
      comp.externalSearchQuery = 'moog';

      const result = expectCurrentFilteredData(comp);
      expect(result.length).toBe(1);
    });

    it('filters by description', () => {
      const comp = makeComp();
      setDataStream(comp, of([
        makePatch({ description: 'ambient drone' }),
        makePatch({ description: 'bass line' })
      ]));
      comp.ngOnInit();
      comp.externalSearchQuery = 'drone';

      const result = expectCurrentFilteredData(comp);
      expect(result.length).toBe(1);
    });

    it('filters by tags', () => {
      const comp = makeComp();
      setDataStream(comp, of([
        makePatch({ name: 'P1', tags: ['ambient', 'drone'] }),
        makePatch({ name: 'P2', tags: ['techno', 'kick'] })
      ]));
      comp.ngOnInit();
      comp.externalSearchQuery = 'drone';

      const result = expectCurrentFilteredData(comp);
      expect(result.length).toBe(1);
      expect(result[0].name).toBe('P1');
    });

    it('returns empty array when no patches match', () => {
      const comp = makeComp();
      setDataStream(comp, of([makePatch({ name: 'Alpha' })]));
      comp.ngOnInit();
      comp.externalSearchQuery = 'zzznomatch';

      const result = expectCurrentFilteredData(comp);
      expect(result).toEqual([]);
    });

    it('is case-insensitive', () => {
      const comp = makeComp();
      setDataStream(comp, of([makePatch({ name: 'Ambient Patch' })]));
      comp.ngOnInit();
      comp.externalSearchQuery = 'AMBIENT';

      const result = expectCurrentFilteredData(comp);
      expect(result.length).toBe(1);
    });

    it('skips null patch items gracefully', () => {
      const comp = makeComp();
      setDataStream(comp, of([makePatch({ name: 'Valid' }), null]));
      comp.ngOnInit();

      const result = expectCurrentFilteredData(comp);
      expect(result.length).toBe(1);
    });
  });

  describe('ngOnInit — showSearch=true', () => {
    it('uses filterService.filterEvent$ for local search', () => {
      const filterService = makeFilterService();
      const comp = makeComp(filterService);
      enableLocalSearch(comp);
      setDataStream(comp, of([makePatch({ name: 'Alpha' }), makePatch({ name: 'Beta' })]));
      comp.ngOnInit();

      filterService.filterEvent$.next('beta');

      const result = expectCurrentFilteredData(comp);
      expect(result.length).toBe(1);
      expect(result[0].name).toBe('Beta');
    });
  });

  describe('ngOnDestroy', () => {
    it('stops reacting to data$ changes after destroy', () => {
      const comp = makeComp();
      const data$ = new BehaviorSubject<PatchList>([makePatch({ name: 'Before' })]);
      setDataStream(comp, data$);
      comp.ngOnInit();
      comp.ngOnDestroy();

      data$.next([makePatch({ name: 'After' })]);

      const result = expectCurrentFilteredData(comp);
      expect(result[0].name).not.toBe('After');
    });
  });
});
