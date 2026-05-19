import { BehaviorSubject, of, Subject } from 'rxjs';
import { RackListComponent } from './rack-list.component';
import { LocalDataFilterService } from '../shared-atoms/local-data-filter/local-data-filter.service';
import { RackMinimal } from 'src/app/models/rack';

function makeRack(overrides: Partial<RackMinimal> = {}): RackMinimal {
  return {
    id: 1,
    name: 'My Rack',
    description: 'A test rack',
    hp: 84,
    rows: 1,
    author: { id: 'u1', username: 'user' } as any,
    locked: false,
    created: '',
    updated: '',
    public: true,
    ...overrides
  };
}

function makeFilterService(): LocalDataFilterService {
  return { filterEvent$: new Subject<string>() } as any;
}

function makeComp(filterService = makeFilterService()): RackListComponent {
  const comp = new RackListComponent(filterService);
  return comp;
}

describe('RackListComponent', () => {
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

    it('encloseVertically defaults to true for legacy embedded lists', () => {
      expect(makeComp().encloseVertically).toBeTrue();
    });
  });

  describe('externalSearchQuery setter', () => {
    it('updates the external query stream', () => {
      const comp = makeComp();
      const data$ = new BehaviorSubject<any>([makeRack({ name: 'Alpha' }), makeRack({ name: 'Beta' })]);
      (comp as any).data$ = data$;
      comp.ngOnInit();

      comp.externalSearchQuery = 'Alpha';

      let result: any;
      comp.filteredData$.subscribe(v => (result = v)).unsubscribe();
      expect(result.length).toBe(1);
      expect(result[0].name).toBe('Alpha');
    });

    it('treats undefined/null as empty string (no filter)', () => {
      const comp = makeComp();
      const racks = [makeRack({ name: 'A' }), makeRack({ name: 'B' })];
      (comp as any).data$ = of(racks);
      comp.ngOnInit();

      comp.externalSearchQuery = undefined as any;

      let result: any;
      comp.filteredData$.subscribe(v => (result = v)).unsubscribe();
      expect(result.length).toBe(2);
    });
  });

  describe('ngOnInit — showSearch=false', () => {
    it('emits all racks from data$ when no search terms', () => {
      const comp = makeComp();
      const racks = [makeRack({ name: 'A' }), makeRack({ name: 'B' })];
      (comp as any).data$ = of(racks);
      comp.ngOnInit();

      let result: any;
      comp.filteredData$.subscribe(v => (result = v)).unsubscribe();
      expect(result.length).toBe(2);
    });

    it('filters by name via externalSearchQuery', () => {
      const comp = makeComp();
      const racks = [makeRack({ name: 'Roland' }), makeRack({ name: 'Moog' })];
      (comp as any).data$ = of(racks);
      comp.ngOnInit();
      comp.externalSearchQuery = 'moog';

      let result: any;
      comp.filteredData$.subscribe(v => (result = v)).unsubscribe();
      expect(result.length).toBe(1);
      expect(result[0].name).toBe('Moog');
    });

    it('filters by description via externalSearchQuery', () => {
      const comp = makeComp();
      const racks = [
        makeRack({ name: 'R1', description: 'ambient machine' }),
        makeRack({ name: 'R2', description: 'generative patch' })
      ];
      (comp as any).data$ = of(racks);
      comp.ngOnInit();
      comp.externalSearchQuery = 'ambient';

      let result: any;
      comp.filteredData$.subscribe(v => (result = v)).unsubscribe();
      expect(result.length).toBe(1);
      expect(result[0].name).toBe('R1');
    });

    it('returns empty array when no racks match', () => {
      const comp = makeComp();
      (comp as any).data$ = of([makeRack({ name: 'Alpha' })]);
      comp.ngOnInit();
      comp.externalSearchQuery = 'zzznomatch';

      let result: any;
      comp.filteredData$.subscribe(v => (result = v)).unsubscribe();
      expect(result).toEqual([]);
    });

    it('starts enter animation delay from the newly appended batch', () => {
      const comp = makeComp();
      const firstPage = [
        makeRack({id: 1, name: 'Rack 1'}),
        makeRack({id: 2, name: 'Rack 2'}),
        makeRack({id: 3, name: 'Rack 3'}),
      ];
      const data$ = new BehaviorSubject<any>(firstPage);
      (comp as any).data$ = data$;
      comp.ngOnInit();

      data$.next([
        ...firstPage,
        makeRack({id: 4, name: 'Rack 4'}),
        makeRack({id: 5, name: 'Rack 5'}),
      ]);

      expect(comp.getEnterDelay(4)).toBe(50);
      expect(comp.getEnterDelay(5)).toBe(75);
    });

    it('is case-insensitive', () => {
      const comp = makeComp();
      (comp as any).data$ = of([makeRack({ name: 'Ambient Rack' })]);
      comp.ngOnInit();
      comp.externalSearchQuery = 'AMBIENT';

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
      (comp as any).data$ = of([makeRack({ name: 'Alpha' }), makeRack({ name: 'Beta' })]);
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
      const data$ = new BehaviorSubject<any>([makeRack({ name: 'Before' })]);
      (comp as any).data$ = data$;
      comp.ngOnInit();
      comp.ngOnDestroy();

      data$.next([makeRack({ name: 'After' })]);

      let result: any;
      comp.filteredData$.subscribe(v => (result = v)).unsubscribe();
      expect(result[0].name).not.toBe('After');
    });
  });
});
