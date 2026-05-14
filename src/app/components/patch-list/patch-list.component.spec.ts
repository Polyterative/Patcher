import { BehaviorSubject, of, Subject } from 'rxjs';
import { PatchListComponent } from './patch-list.component';
import { LocalDataFilterService } from '../shared-atoms/local-data-filter/local-data-filter.service';
import { PatchMinimal } from 'src/app/models/patch';

function makePatch(overrides: Partial<PatchMinimal> = {}): PatchMinimal {
  return {
    id: 1,
    name: 'My Patch',
    description: 'A test patch',
    author: { id: 'u1', username: 'user' } as any,
    created: '',
    updated: '',
    public: true,
    ...overrides
  };
}

function makeFilterService(): LocalDataFilterService {
  return { filterEvent$: new Subject<string>() } as any;
}

function makeComp(filterService = makeFilterService()): PatchListComponent {
  return new PatchListComponent(filterService);
}

describe('PatchListComponent', () => {
  describe('construction', () => {
    it('creates without error', () => {
      expect(() => makeComp()).not.toThrow();
    });

    it('filteredData$ starts as []', () => {
      const comp = makeComp();
      let initial: any;
      comp.filteredData$.subscribe(v => (initial = v)).unsubscribe();
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
      (comp as any).data$ = of(patches);
      comp.ngOnInit();

      comp.externalSearchQuery = 'ambient';

      let result: any;
      comp.filteredData$.subscribe(v => (result = v)).unsubscribe();
      expect(result.length).toBe(1);
      expect(result[0].name).toBe('Ambient');
    });

    it('treats undefined as empty string (no filter)', () => {
      const comp = makeComp();
      const patches = [makePatch({ name: 'A' }), makePatch({ name: 'B' })];
      (comp as any).data$ = of(patches);
      comp.ngOnInit();

      comp.externalSearchQuery = undefined as any;

      let result: any;
      comp.filteredData$.subscribe(v => (result = v)).unsubscribe();
      expect(result.length).toBe(2);
    });
  });

  describe('ngOnInit — showSearch=false', () => {
    it('emits all patches from data$ when no search terms', () => {
      const comp = makeComp();
      const patches = [makePatch({ name: 'A' }), makePatch({ name: 'B' })];
      (comp as any).data$ = of(patches);
      comp.ngOnInit();

      let result: any;
      comp.filteredData$.subscribe(v => (result = v)).unsubscribe();
      expect(result.length).toBe(2);
    });

    it('filters by name', () => {
      const comp = makeComp();
      (comp as any).data$ = of([makePatch({ name: 'Roland' }), makePatch({ name: 'Moog' })]);
      comp.ngOnInit();
      comp.externalSearchQuery = 'moog';

      let result: any;
      comp.filteredData$.subscribe(v => (result = v)).unsubscribe();
      expect(result.length).toBe(1);
    });

    it('filters by description', () => {
      const comp = makeComp();
      (comp as any).data$ = of([
        makePatch({ description: 'ambient drone' }),
        makePatch({ description: 'bass line' })
      ]);
      comp.ngOnInit();
      comp.externalSearchQuery = 'drone';

      let result: any;
      comp.filteredData$.subscribe(v => (result = v)).unsubscribe();
      expect(result.length).toBe(1);
    });

    it('filters by tags', () => {
      const comp = makeComp();
      (comp as any).data$ = of([
        makePatch({ name: 'P1', tags: ['ambient', 'drone'] }),
        makePatch({ name: 'P2', tags: ['techno', 'kick'] })
      ]);
      comp.ngOnInit();
      comp.externalSearchQuery = 'drone';

      let result: any;
      comp.filteredData$.subscribe(v => (result = v)).unsubscribe();
      expect(result.length).toBe(1);
      expect(result[0].name).toBe('P1');
    });

    it('returns empty array when no patches match', () => {
      const comp = makeComp();
      (comp as any).data$ = of([makePatch({ name: 'Alpha' })]);
      comp.ngOnInit();
      comp.externalSearchQuery = 'zzznomatch';

      let result: any;
      comp.filteredData$.subscribe(v => (result = v)).unsubscribe();
      expect(result).toEqual([]);
    });

    it('is case-insensitive', () => {
      const comp = makeComp();
      (comp as any).data$ = of([makePatch({ name: 'Ambient Patch' })]);
      comp.ngOnInit();
      comp.externalSearchQuery = 'AMBIENT';

      let result: any;
      comp.filteredData$.subscribe(v => (result = v)).unsubscribe();
      expect(result.length).toBe(1);
    });

    it('skips null patch items gracefully', () => {
      const comp = makeComp();
      (comp as any).data$ = of([makePatch({ name: 'Valid' }), null] as any);
      comp.ngOnInit();

      let result: any;
      comp.filteredData$.subscribe(v => (result = v)).unsubscribe();
      expect(result.length).toBe(1);
    });
  });

  describe('ngOnInit — showSearch=true', () => {
    it('uses filterService.filterEvent$ for local search', () => {
      const filterService = makeFilterService();
      const comp = makeComp(filterService);
      (comp as any).showSearch = true;
      (comp as any).data$ = of([makePatch({ name: 'Alpha' }), makePatch({ name: 'Beta' })]);
      comp.ngOnInit();

      (filterService.filterEvent$ as Subject<string>).next('beta');

      let result: any;
      comp.filteredData$.subscribe(v => (result = v)).unsubscribe();
      expect(result.length).toBe(1);
      expect(result[0].name).toBe('Beta');
    });
  });

  describe('ngOnDestroy', () => {
    it('stops reacting to data$ changes after destroy', () => {
      const comp = makeComp();
      const data$ = new BehaviorSubject<any>([makePatch({ name: 'Before' })]);
      (comp as any).data$ = data$;
      comp.ngOnInit();
      comp.ngOnDestroy();

      data$.next([makePatch({ name: 'After' })]);

      let result: any;
      comp.filteredData$.subscribe(v => (result = v)).unsubscribe();
      expect(result[0].name).not.toBe('After');
    });
  });
});
