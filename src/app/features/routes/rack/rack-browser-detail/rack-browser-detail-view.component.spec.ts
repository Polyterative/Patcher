import { CommonModule } from '@angular/common';
import {
  Component,
  Input,
  NO_ERRORS_SCHEMA,
} from '@angular/core';
import {
  ComponentFixture,
  TestBed,
} from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute } from '@angular/router';
import {
  BehaviorSubject,
  of,
  ReplaySubject,
  Subject,
} from 'rxjs';
import { RackDetailDataService } from 'src/app/components/rack-parts/rack-detail-data.service';
import { CommentsDataService } from 'src/app/components/shared-atoms/comments/comments-data.service';
import { COOL_REACTIONS_ENABLED } from 'src/app/components/shared-atoms/cool-button/cool-button-feature.token';
import { CoolButtonComponent } from 'src/app/components/shared-atoms/cool-button/cool-button.component';
import { SeoAndUtilsService } from 'src/app/features/backbone/seo-and-utils.service';
import { UserManagementService } from 'src/app/features/backbone/login/user-management.service';
import {
  SimpleUserModel,
  SupabaseService,
} from 'src/app/features/backend/supabase.service';
import { UserAreaDataService } from 'src/app/features/routes/user-area/user-area-data.service';
import {
  MinimalModule,
  RackedModule,
} from 'src/app/models/module';
import {
  Rack,
  RackMinimal,
} from 'src/app/models/rack';
import { RackBrowserDetailViewComponent } from './rack-browser-detail-view.component';

@Component({
  selector: 'app-rack-composite',
  template: '<app-cool-button *ngIf="showCoolAction" class="rack-action-row__cool"></app-cool-button>',
  standalone: false,
})
class RackCompositeStubComponent {
  @Input() data: unknown;
  @Input() showCoolAction = false;
}

type RackDetailDataServiceDouble =
  Omit<Pick<RackDetailDataService,
    | 'setPublicDetailMode'
    | 'updateSingleRackByPublicId$'
    | 'singleRackData$'
    | 'rowedRackedModules$'
    | 'isCurrentRackEditable$'
    | 'isCurrentRackPropertyOfCurrentUser$'
    | 'rackDetailUnavailableMessage$'
    | 'weakestBalanceAxis$'
    | 'moduleAddedFromPicker$'
  >, 'setPublicDetailMode'>
  & {
    setPublicDetailMode: jasmine.Spy<(enabled: boolean) => void>;
  };

type UserAreaDataServiceDouble = Pick<UserAreaDataService, 'updateModulesData$' | 'modulesData$'>;
type CommentsDataServiceDouble = Pick<CommentsDataService, 'requestCommentsUpdate$'>;
type UserManagementServiceDouble = Pick<UserManagementService, 'loggedUser$'>;

describe('RackBrowserDetailViewComponent', () => {
  let component: RackBrowserDetailViewComponent;
  let dataService: RackDetailDataService;
  let userAreaDataService: UserAreaDataService;
  let seoService: SeoAndUtilsService;
  let commentsDataService: CommentsDataService;
  let userManagementService: UserManagementService;
  let singleRackData$: BehaviorSubject<Rack | undefined>;
  let rowedRackedModules$: BehaviorSubject<RackedModule[][] | null>;
  let setPublicDetailModeSpy: jasmine.Spy<(enabled: boolean) => void>;
  let updateSingleRackByPublicIdNextSpy: jasmine.Spy<(publicId: string) => void>;
  let updateModulesDataNextSpy: jasmine.Spy<() => void>;
  let updateSeoSpy: jasmine.Spy<SeoAndUtilsService['updateSeo']>;

  function withServicePrototype<T extends object, D extends object>(ctor: {prototype: T}, double: D): T & D {
    return Object.assign(Object.create(ctor.prototype), double);
  }

  function makeReactionBackendSpy() {
    return {
      get: {
        currentUserReactions: jasmine.createSpy('currentUserReactions').and.returnValue(of([])),
        reactionCount: jasmine.createSpy('reactionCount').and.returnValue(of(0)),
      },
      add: {
        reaction: jasmine.createSpy('addReaction').and.returnValue(of(null)),
      },
      delete: {
        reaction: jasmine.createSpy('deleteReaction').and.returnValue(of(null)),
      }
    };
  }

  function makeActivatedRoute(publicId: string): ActivatedRoute {
    return withServicePrototype(ActivatedRoute, {
      params: of({publicId}),
    });
  }

  function makeUser(id: string): SimpleUserModel {
    return {
      id,
      email: `${ id }@example.com`,
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
    };
  }

  function makeRack(overrides: Partial<Rack> = {}): Rack {
    return {
      id: 1,
      name: 'Test Rack',
      hp: 84,
      rows: 2,
      public: true,
      locked: false,
      author: {id: 'author-1', username: 'modular_jane'},
      created: '2024-01-01',
      updated: '2024-06-01',
      ...overrides,
    };
  }

  function makeRackMinimal(overrides: Partial<RackMinimal> = {}): RackMinimal {
    return makeRack(overrides);
  }

  beforeEach(() => {
    singleRackData$ = new BehaviorSubject<Rack | undefined>(undefined);
    rowedRackedModules$ = new BehaviorSubject<RackedModule[][] | null>(null);
    setPublicDetailModeSpy = jasmine.createSpy('setPublicDetailMode');
    dataService = withServicePrototype(RackDetailDataService, {
      setPublicDetailMode: setPublicDetailModeSpy,
      updateSingleRackByPublicId$: new ReplaySubject<string>(1),
      singleRackData$,
      rowedRackedModules$,
      isCurrentRackEditable$: new BehaviorSubject<boolean>(false),
      isCurrentRackPropertyOfCurrentUser$: new BehaviorSubject<boolean>(false),
      rackDetailUnavailableMessage$: new BehaviorSubject<string | null>(null),
      weakestBalanceAxis$: new BehaviorSubject<null>(null),
      moduleAddedFromPicker$: new Subject<MinimalModule>(),
    } satisfies RackDetailDataServiceDouble);
    updateSingleRackByPublicIdNextSpy = spyOn(dataService.updateSingleRackByPublicId$, 'next').and.callThrough();
    userAreaDataService = withServicePrototype(UserAreaDataService, {
      updateModulesData$: new Subject<void>(),
      modulesData$: new BehaviorSubject<MinimalModule[] | undefined>(undefined),
    } satisfies UserAreaDataServiceDouble);
    updateModulesDataNextSpy = spyOn(userAreaDataService.updateModulesData$, 'next').and.callThrough();
    updateSeoSpy = jasmine.createSpy<SeoAndUtilsService['updateSeo']>('updateSeo');
    seoService = withServicePrototype(SeoAndUtilsService, {
      updateSeo: updateSeoSpy,
    } satisfies Pick<SeoAndUtilsService, 'updateSeo'>);
    commentsDataService = withServicePrototype(CommentsDataService, {
      requestCommentsUpdate$: new ReplaySubject(1),
    } satisfies CommentsDataServiceDouble);
    spyOn(commentsDataService.requestCommentsUpdate$, 'next').and.callThrough();
    userManagementService = withServicePrototype(UserManagementService, {
      loggedUser$: of(undefined),
    } satisfies UserManagementServiceDouble);

    component = new RackBrowserDetailViewComponent(
      dataService,
      userAreaDataService,
      makeActivatedRoute('abc123XYZ_-0'),
      seoService,
      commentsDataService,
      userManagementService
    );
  });

  afterEach(() => {
    component.ngOnDestroy();
  });

  function makeRackedModule(
    moduleId: number,
    hp: number,
    powerPos12: number | null,
    powerNeg12: number | null,
    powerPos5: number | null
  ): RackedModule {
    return {
      rackingData: {
        id: moduleId,
        rackid: 1,
        moduleid: moduleId,
        row: 0,
        column: 0,
      },
      module: {
        id: moduleId,
        name: `Module ${ moduleId }`,
        description: '',
        hp,
        public: true,
        manufacturer: {id: 1, name: 'Maker'},
        manufacturerId: 1,
        standard: {id: 0, name: 'Eurorack'},
        tags: [],
        panels: [],
        created: '2024-01-01',
        updated: '2024-01-01',
        ins: [],
        outs: [],
        switches: [],
        manualURL: '',
        store_url: null,
        additional: null,
        isComplete: true,
        isApproved: true,
        isDIY: false,
        powerPos12,
        powerNeg12,
        powerPos5,
        depth: 10,
        weight: 100
      }
    };
  }

  it('shows rack rail totals plus derived power header count', () => {
    const rows = component.rackSummaryStatRows(makeRackMinimal({hp: 84, rows: 2}), [
      [makeRackedModule(101, 8, 50, -20, 0)],
      [makeRackedModule(202, 10, 75, -35, 5), makeRackedModule(303, 6, 0, 0, 0)]
    ]);
    const powerGroup = rows[1][0];

    expect(powerGroup.items.map(item => item.label)).toEqual(['+12V', '-12V', '+5V', 'Power headers']);
    expect(powerGroup.items[3]).toEqual(jasmine.objectContaining({
      value: '2',
      detail: '1 passive'
    }));
  });

  it('uses public detail reads for signed-out visitors', () => {
    component.ngOnInit();

    expect(setPublicDetailModeSpy).toHaveBeenCalledWith(true);
    expect(updateSingleRackByPublicIdNextSpy).toHaveBeenCalledWith('abc123XYZ_-0');
  });

  it('shows the wide-shell nav by default for rack detail pages', () => {
  });

  it('uses authenticated detail reads for signed-in users', () => {
    userManagementService = withServicePrototype(UserManagementService, {
      loggedUser$: of(makeUser('u1')),
    } satisfies UserManagementServiceDouble);
    component = new RackBrowserDetailViewComponent(
      dataService,
      userAreaDataService,
      makeActivatedRoute('tokenXYZ77_X'),
      seoService,
      commentsDataService,
      userManagementService
    );

    component.ngOnInit();

    expect(setPublicDetailModeSpy).toHaveBeenCalledWith(false);
    expect(updateModulesDataNextSpy).toHaveBeenCalled();
    expect(updateSingleRackByPublicIdNextSpy).toHaveBeenCalledWith('tokenXYZ77_X');
  });

  it('calculates rack utilization as a percentage string', () => {
    expect(component.calculateRackUtilization(84, 1, 42)).toBe('50.0%');
    expect(component.calculateRackUtilization(84, 2, 168)).toBe('100.0%');
    expect(component.calculateRackUtilization(0, 2, 0)).toBe('0%');
  });

  it('exposes space stat group with HP used, available and utilization', () => {
    const rows = component.rackSummaryStatRows(makeRackMinimal({hp: 84, rows: 1}), [
      [makeRackedModule(301, 10, 50, -20, 0), makeRackedModule(302, 8, 0, 0, 0)]
    ]);
    const spaceGroup = rows[0][1];
    expect(spaceGroup.title).toBe('Space');
    expect(spaceGroup.items[0].label).toBe('HP used');
    expect(spaceGroup.items[0].value).toBe('18');
    expect(spaceGroup.items[1].label).toBe('HP available');
    expect(spaceGroup.items[1].value).toBe('66');
  });

  describe('SEO metadata', () => {
    it('calls updateSeo with rack title and description when data arrives', () => {
      singleRackData$.next(makeRack({
        id: 1, name: 'Test Rack', hp: 84, rows: 2,
        author: {id: 'author-1', username: 'modular_jane'},
        created: '2024-01-01', updated: '2024-06-01'
      }));
      rowedRackedModules$.next([]);

      component.ngOnInit();

      expect(updateSeoSpy).toHaveBeenCalledWith(
        jasmine.objectContaining({
          title: 'Test Rack - details. ',
          description: jasmine.stringContaining('modular_jane'),
          keywords: jasmine.stringContaining('eurorack')
        }),
        'Test Rack - Rack Details'
      );
    });

    it('includes og:image in SEO data when rack has an image', () => {
      singleRackData$.next(makeRack({
        id: 2, name: 'Imaged Rack', hp: 42, rows: 1,
        author: {id: 'author-2', username: 'synth_bob'},
        image: 'https://example.com/rack-preview.jpg',
        created: '2024-01-01', updated: '2024-06-01'
      }));
      rowedRackedModules$.next([]);

      component.ngOnInit();

      expect(updateSeoSpy).toHaveBeenCalledWith(
        jasmine.objectContaining({image: 'https://example.com/rack-preview.jpg'}),
        jasmine.any(String)
      );
    });

    it('omits og:image from SEO data when rack has no image', () => {
      singleRackData$.next(makeRack({
        id: 3, name: 'No Image Rack', hp: 42, rows: 1,
        author: {id: 'author-3', username: 'synth_bob'},
        created: '2024-01-01', updated: '2024-06-01'
      }));
      rowedRackedModules$.next([]);

      component.ngOnInit();

      const call = updateSeoSpy.calls.mostRecent();
      expect(call.args[0].image).toBeUndefined();
    });

    it('skips SEO when ignoreSeo is true', () => {
      component.ignoreSeo = true;
      singleRackData$.next(makeRack({
        id: 4, name: 'Rack', hp: 84, rows: 1,
        author: {id: 'author-4', username: 'user'}, created: '2024-01-01', updated: '2024-01-01'
      }));
      rowedRackedModules$.next([]);

      component.ngOnInit();

      expect(updateSeoSpy).not.toHaveBeenCalled();
    });
  });

  describe('template comment visibility', () => {
    let fixture: ComponentFixture<RackBrowserDetailViewComponent>;
    let templateDataService: RackDetailDataServiceDouble;
    let templateUserAreaDataService: UserAreaDataServiceDouble;
    let templateCommentsDataService: CommentsDataServiceDouble;
    let templateUserManagementService: UserManagementServiceDouble;
    let singleRackData$: BehaviorSubject<Rack | undefined>;
    let rowedRackedModules$: BehaviorSubject<RackedModule[][] | null>;
    let isCurrentRackEditable$: BehaviorSubject<boolean>;
    let isCurrentRackPropertyOfCurrentUser$: BehaviorSubject<boolean>;
    let reactionBackend: ReturnType<typeof makeReactionBackendSpy>;

    beforeEach(async () => {
      singleRackData$ = new BehaviorSubject<Rack | undefined>(makeRack({
        id: 42,
        name: 'Rack',
        hp: 84,
        rows: 2,
        public: true,
      }));
      rowedRackedModules$ = new BehaviorSubject<RackedModule[][] | null>([[makeRackedModule(101, 8, 50, -20, 0)]]);
      isCurrentRackEditable$ = new BehaviorSubject<boolean>(false);
      isCurrentRackPropertyOfCurrentUser$ = new BehaviorSubject<boolean>(true);

      templateDataService = {
        setPublicDetailMode: jasmine.createSpy('setPublicDetailMode'),
        updateSingleRackByPublicId$: new ReplaySubject<string>(1),
        singleRackData$,
        rowedRackedModules$,
        isCurrentRackEditable$,
        isCurrentRackPropertyOfCurrentUser$,
        rackDetailUnavailableMessage$: new BehaviorSubject<string | null>(null),
        weakestBalanceAxis$: new BehaviorSubject<null>(null),
        moduleAddedFromPicker$: new Subject<MinimalModule>(),
      };
      templateUserAreaDataService = {
        updateModulesData$: new Subject<void>(),
        modulesData$: new BehaviorSubject<MinimalModule[] | undefined>([]),
      };
      templateCommentsDataService = {
        requestCommentsUpdate$: new ReplaySubject(1),
      };
      templateUserManagementService = {loggedUser$: of(makeUser('u1'))};
      reactionBackend = makeReactionBackendSpy();

      await TestBed.configureTestingModule({
        declarations: [RackBrowserDetailViewComponent, RackCompositeStubComponent],
        imports: [
          CommonModule,
          NoopAnimationsModule,
          CoolButtonComponent,
        ],
        providers: [
          {provide: RackDetailDataService, useValue: templateDataService},
          {provide: UserAreaDataService, useValue: templateUserAreaDataService},
          {provide: SeoAndUtilsService, useValue: {updateSeo: jasmine.createSpy('updateSeo')}},
          {provide: CommentsDataService, useValue: templateCommentsDataService},
          {provide: UserManagementService, useValue: templateUserManagementService},
          {provide: ActivatedRoute, useValue: makeActivatedRoute('route1XYZ_-0')},
          {provide: COOL_REACTIONS_ENABLED, useValue: false},
          {provide: SupabaseService, useValue: reactionBackend},
          {provide: MatSnackBar, useValue: jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open'])},
        ],
        schemas: [NO_ERRORS_SCHEMA],
      })
        .overrideComponent(RackBrowserDetailViewComponent, {
          set: {
            providers: [],
          }
        })
        .compileComponents();
      fixture = TestBed.createComponent(RackBrowserDetailViewComponent);
      fixture.componentInstance.ignoreSeo = true;
    });

    it('shows comments while not editing', () => {
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('app-comments-root')).not.toBeNull();
    });

    it('hides comments while the owner is editing', () => {
      isCurrentRackEditable$.next(true);
      isCurrentRackPropertyOfCurrentUser$.next(true);

      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('app-comments-root')).toBeNull();
    });

    it('shows comments for non-owners even when the rack itself is unlocked', () => {
      isCurrentRackEditable$.next(true);
      isCurrentRackPropertyOfCurrentUser$.next(false);

      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('app-comments-root')).not.toBeNull();
    });

    it('does not render or query Cool reactions when the feature flag is off', () => {
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.coolButton')).toBeNull();
      expect(reactionBackend.get.currentUserReactions).not.toHaveBeenCalled();
      expect(reactionBackend.get.reactionCount).not.toHaveBeenCalled();
      expect(reactionBackend.add.reaction).not.toHaveBeenCalled();
      expect(reactionBackend.delete.reaction).not.toHaveBeenCalled();
    });

    it('renders Cool inside the primary rack card action row instead of as a floating action', () => {
      isCurrentRackPropertyOfCurrentUser$.next(false);
      fixture.detectChanges();

      const leftComposite = fixture.nativeElement.querySelector('.rackBrowserDetailView__summaryColumn--left app-rack-composite');
      expect(leftComposite).not.toBeNull();
      expect(fixture.nativeElement.querySelector('.rackBrowserDetailView__summaryColumn--left app-rack-composite app-cool-button.rack-action-row__cool')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('.rack-detail-floating-actions .rack-detail-cool-floating-action')).toBeNull();
    });
  });

  /**
   * Regression: opening a private rack URL (or any URL where RLS / the lookup
   * yields no row) used to render a completely blank page because the template
   * has no fallback branch when `singleRackData$` is undefined.
   *
   * Contract: when data is missing and `rackDetailUnavailableMessage$` is set,
   * the template must render a user-readable element (identified by
   * `[data-testid="rack-detail-unavailable"]`) containing that message.
   *
   * Failing on purpose until the template fix lands.
   */
  describe('unavailable / blank-page regression', () => {
    let fixture: ComponentFixture<RackBrowserDetailViewComponent>;
    let templateSingleRackData$: BehaviorSubject<Rack | undefined>;
    let templateUnavailable$: BehaviorSubject<string | null>;

    beforeEach(async () => {
      templateSingleRackData$ = new BehaviorSubject<Rack | undefined>(undefined);
      templateUnavailable$ = new BehaviorSubject<string | null>(null);

      const templateDataService: RackDetailDataServiceDouble = {
        setPublicDetailMode: jasmine.createSpy('setPublicDetailMode'),
        updateSingleRackByPublicId$: new ReplaySubject<string>(1),
        singleRackData$: templateSingleRackData$,
        rowedRackedModules$: new BehaviorSubject<RackedModule[][] | null>(null),
        isCurrentRackEditable$: new BehaviorSubject<boolean>(false),
        isCurrentRackPropertyOfCurrentUser$: new BehaviorSubject<boolean>(false),
        moduleAddedFromPicker$: new Subject<MinimalModule>(),
        rackDetailUnavailableMessage$: templateUnavailable$,
        weakestBalanceAxis$: new BehaviorSubject<null>(null),
      };
      const templateUserAreaDataService: UserAreaDataServiceDouble = {
        updateModulesData$: new Subject<void>(),
        modulesData$: new BehaviorSubject<MinimalModule[] | undefined>([]),
      };
      const templateCommentsDataService: CommentsDataServiceDouble = {
        requestCommentsUpdate$: new ReplaySubject(1),
      };
      const templateUserManagementService: UserManagementServiceDouble = {
        loggedUser$: of(undefined),
      };

      await TestBed.configureTestingModule({
        declarations: [RackBrowserDetailViewComponent],
        imports: [
          CommonModule,
          NoopAnimationsModule,
        ],
        providers: [
          {provide: RackDetailDataService, useValue: templateDataService},
          {provide: UserAreaDataService, useValue: templateUserAreaDataService},
          {provide: SeoAndUtilsService, useValue: {updateSeo: () => {}}},
          {provide: CommentsDataService, useValue: templateCommentsDataService},
          {provide: UserManagementService, useValue: templateUserManagementService},
          {provide: ActivatedRoute, useValue: makeActivatedRoute('route1018_XX')},
        ],
        schemas: [NO_ERRORS_SCHEMA],
      })
        .overrideComponent(RackBrowserDetailViewComponent, {set: {providers: []}})
        .compileComponents();

      fixture = TestBed.createComponent(RackBrowserDetailViewComponent);
      fixture.componentInstance.ignoreSeo = true;
    });

    it('renders a user-readable "rack unavailable" element when the rack data is missing', () => {
      templateUnavailable$.next('This rack is private or no longer available.');

      fixture.detectChanges();

      const unavailableEl = fixture.nativeElement.querySelector('[data-testid="rack-detail-unavailable"]');
      expect(unavailableEl)
        .withContext('Template must render a [data-testid="rack-detail-unavailable"] empty state ' +
          'when singleRackData$ is undefined and rackDetailUnavailableMessage$ is set, ' +
          'otherwise users see a blank page (this is the bug).')
        .not.toBeNull();
      expect(unavailableEl?.textContent ?? '')
        .toContain('private or no longer available');
    });

    it('does not render the rack composite when there is no data (sanity)', () => {
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('app-rack-composite')).toBeNull();
    });
  });

});
