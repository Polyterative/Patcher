import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { BehaviorSubject, of } from 'rxjs';
import type { Observable } from 'rxjs';
import { RackListComponent } from './rack-list.component';
import { LocalDataFilterService } from '../shared-atoms/local-data-filter/local-data-filter.service';
import { COOL_REACTIONS_ENABLED } from '../shared-atoms/cool-button/cool-button-feature.token';
import { RackMinimal } from 'src/app/models/rack';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import type { RackList } from 'src/app/features/routes/rack/rack-browser-data.service';
import type { PublicUser } from 'src/app/models/user';

type RackListComponentInputHarness = Omit<RackListComponent, 'data$' | 'showSearch'> & {
  data$: Observable<RackList>;
  showSearch: boolean;
};

type ReactionBackendSpy = {
  get: {
    currentUserReactions: jasmine.Spy<SupabaseService['get']['currentUserReactions']>;
    reactionCount: jasmine.Spy<SupabaseService['get']['reactionCount']>;
  };
  add: {
    reaction: jasmine.Spy<SupabaseService['add']['reaction']>;
  };
  delete: {
    reaction: jasmine.Spy<SupabaseService['delete']['reaction']>;
  };
};

const TEST_USER: PublicUser = { id: 'u1', username: 'user' };

function makeRack(overrides: Partial<RackMinimal> = {}): RackMinimal {
  return {
    id: 1,
    name: 'My Rack',
    description: 'A test rack',
    hp: 84,
    rows: 1,
    author: TEST_USER,
    locked: false,
    created: '',
    updated: '',
    public: true,
    ...overrides
  };
}

function makeFilterService(): LocalDataFilterService {
  return new LocalDataFilterService();
}

function makeComp(filterService = makeFilterService()): RackListComponent {
  const comp = new RackListComponent(filterService);
  return comp;
}

function setDataStream(comp: RackListComponent, data$: Observable<RackList>): void {
  (comp as RackListComponentInputHarness).data$ = data$;
}

function enableLocalSearch(comp: RackListComponent): void {
  (comp as RackListComponentInputHarness).showSearch = true;
}

function setExternalSearchQuery(comp: RackListComponent, value: string | null | undefined): void {
  expect(Reflect.set(comp, 'externalSearchQuery', value)).toBeTrue();
}

function expectCurrentFilteredData(comp: RackListComponent): RackMinimal[] {
  let result: RackList | undefined;
  comp.filteredData$.subscribe(v => (result = v)).unsubscribe();
  if (!result) {
    fail('Expected filteredData$ to emit a rack list');
    return [];
  }
  return result;
}

function makeReactionBackendSpy(): ReactionBackendSpy {
  return {
    get: {
      currentUserReactions: jasmine.createSpy<SupabaseService['get']['currentUserReactions']>('currentUserReactions').and.returnValue(of([])),
      reactionCount: jasmine.createSpy<SupabaseService['get']['reactionCount']>('reactionCount').and.returnValue(of(0)),
    },
    add: {
      reaction: jasmine.createSpy<SupabaseService['add']['reaction']>('addReaction').and.returnValue(of(null)),
    },
    delete: {
      reaction: jasmine.createSpy<SupabaseService['delete']['reaction']>('deleteReaction').and.returnValue(of([])),
    }
  };
}

describe('RackListComponent', () => {
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

    it('encloseVertically defaults to true for legacy embedded lists', () => {
      expect(makeComp().encloseVertically).toBeTrue();
    });
  });

  describe('externalSearchQuery setter', () => {
    it('updates the external query stream', () => {
      const comp = makeComp();
      const data$ = new BehaviorSubject<RackList>([makeRack({ name: 'Alpha' }), makeRack({ name: 'Beta' })]);
      setDataStream(comp, data$);
      comp.ngOnInit();

      comp.externalSearchQuery = 'Alpha';

      const result = expectCurrentFilteredData(comp);
      expect(result.length).toBe(1);
      expect(result[0].name).toBe('Alpha');
    });

    it('treats undefined/null as empty string (no filter)', () => {
      const comp = makeComp();
      const racks = [makeRack({ name: 'A' }), makeRack({ name: 'B' })];
      setDataStream(comp, of(racks));
      comp.ngOnInit();

      setExternalSearchQuery(comp, undefined);

      let result = expectCurrentFilteredData(comp);
      expect(result.length).toBe(2);

      setExternalSearchQuery(comp, null);

      result = expectCurrentFilteredData(comp);
      expect(result.length).toBe(2);
    });
  });

  describe('ngOnInit — showSearch=false', () => {
    it('emits all racks from data$ when no search terms', () => {
      const comp = makeComp();
      const racks = [makeRack({ name: 'A' }), makeRack({ name: 'B' })];
      setDataStream(comp, of(racks));
      comp.ngOnInit();

      const result = expectCurrentFilteredData(comp);
      expect(result.length).toBe(2);
    });

    it('filters by name via externalSearchQuery', () => {
      const comp = makeComp();
      const racks = [makeRack({ name: 'Roland' }), makeRack({ name: 'Moog' })];
      setDataStream(comp, of(racks));
      comp.ngOnInit();
      comp.externalSearchQuery = 'moog';

      const result = expectCurrentFilteredData(comp);
      expect(result.length).toBe(1);
      expect(result[0].name).toBe('Moog');
    });

    it('filters by description via externalSearchQuery', () => {
      const comp = makeComp();
      const racks = [
        makeRack({ name: 'R1', description: 'ambient machine' }),
        makeRack({ name: 'R2', description: 'generative patch' })
      ];
      setDataStream(comp, of(racks));
      comp.ngOnInit();
      comp.externalSearchQuery = 'ambient';

      const result = expectCurrentFilteredData(comp);
      expect(result.length).toBe(1);
      expect(result[0].name).toBe('R1');
    });

    it('returns empty array when no racks match', () => {
      const comp = makeComp();
      setDataStream(comp, of([makeRack({ name: 'Alpha' })]));
      comp.ngOnInit();
      comp.externalSearchQuery = 'zzznomatch';

      const result = expectCurrentFilteredData(comp);
      expect(result).toEqual([]);
    });

    it('starts enter animation delay from the newly appended batch', () => {
      const comp = makeComp();
      const firstPage = [
        makeRack({id: 1, name: 'Rack 1'}),
        makeRack({id: 2, name: 'Rack 2'}),
        makeRack({id: 3, name: 'Rack 3'}),
      ];
      const data$ = new BehaviorSubject<RackList>(firstPage);
      setDataStream(comp, data$);
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
      setDataStream(comp, of([makeRack({ name: 'Ambient Rack' })]));
      comp.ngOnInit();
      comp.externalSearchQuery = 'AMBIENT';

      const result = expectCurrentFilteredData(comp);
      expect(result.length).toBe(1);
    });

    it('does not render or query Cool reactions in repeated rack lists', async () => {
      const reactionBackend = makeReactionBackendSpy();

      await TestBed.configureTestingModule({
        declarations: [RackListComponent],
        imports: [CommonModule, NoopAnimationsModule],
        providers: [
          {provide: LocalDataFilterService, useValue: makeFilterService()},
          {provide: COOL_REACTIONS_ENABLED, useValue: true},
          {provide: SupabaseService, useValue: reactionBackend},
          {provide: MatSnackBar, useValue: jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open'])},
        ],
        schemas: [NO_ERRORS_SCHEMA],
      }).compileComponents();

      const fixture = TestBed.createComponent(RackListComponent);
      fixture.componentRef.setInput('data$', of([makeRack({id: 42, public: true})]));
      fixture.detectChanges();

      const host: HTMLElement = fixture.nativeElement;
      expect(host.querySelector('.coolButton')).toBeNull();
      expect(reactionBackend.get.currentUserReactions).not.toHaveBeenCalled();
      expect(reactionBackend.get.reactionCount).not.toHaveBeenCalled();
      expect(reactionBackend.add.reaction).not.toHaveBeenCalled();
      expect(reactionBackend.delete.reaction).not.toHaveBeenCalled();
    });
  });

  describe('ngOnInit — showSearch=true', () => {
    it('uses filterService.filterEvent$ for local search', () => {
      const filterService = makeFilterService();
      const comp = makeComp(filterService);
      enableLocalSearch(comp);
      setDataStream(comp, of([makeRack({ name: 'Alpha' }), makeRack({ name: 'Beta' })]));
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
      const data$ = new BehaviorSubject<RackList>([makeRack({ name: 'Before' })]);
      setDataStream(comp, data$);
      comp.ngOnInit();
      comp.ngOnDestroy();

      data$.next([makeRack({ name: 'After' })]);

      const result = expectCurrentFilteredData(comp);
      expect(result[0].name).not.toBe('After');
    });
  });
});
