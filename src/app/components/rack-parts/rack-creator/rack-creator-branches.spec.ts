import {
  Observable,
  of
} from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialogRef } from '@angular/material/dialog';
import { MinimalModule } from 'src/app/models/module';
import { RackMinimal } from 'src/app/models/rack';
import { SimpleUserModel } from 'src/app/features/backend/supabase.types';
import { FileDragHostService } from 'src/app/shared-interproject/components/@smart/file-drag-host/file-drag-host.service';
import {
  AnalyticsService
} from 'src/app/features/backbone/analytics-integration/analytics.service';
import { RackCreatorComponent } from './rack-creator.component';
import {
  ModuleCollectionAnalysisService,
  RackAnalysis,
  STANDARDS
} from '../module-collection-analysis.service';
import {
  ModularGridRackModulePlacement,
  ModularGridSourceModule
} from './modulargrid-import/modulargrid-import.types';
import {
  RackCreatorCreateResult,
  RackCreatorDataService
} from './rack-creator-data.service';
import {
  RackCreatorInModel,
  RackCreatorOutModel
} from './rack-creator.types';


describe('RackCreatorComponent - uncovered branches', () => {
  let createdComponents: RackCreatorComponent[];

  const TEST_TIMESTAMP = '2026-01-01T00:00:00.000Z';

  type RackCreatorRackDraft = Omit<RackMinimal, 'author' | 'created' | 'updated' | 'id'>;
  type RackCreatorMalformedModule = Omit<MinimalModule, 'standard'> & {
    standard?: Partial<MinimalModule['standard']>;
  };
  type RackCreatorModuleInput = MinimalModule | RackCreatorMalformedModule | null;
  type SnackBarOpen = (
    message: string,
    action?: string,
    config?: {duration?: number}
  ) => {onAction: () => Observable<void>};

  interface SnackBarDouble {
    open: jasmine.Spy<SnackBarOpen>;
  }

  interface DialogRefDouble {
    close: jasmine.Spy<(result?: RackCreatorOutModel) => void>;
  }

  interface ModuleCollectionAnalysisServiceDouble
    extends Pick<ModuleCollectionAnalysisService, 'analyzeRackConfiguration'> {
    analyzeRackConfiguration: jasmine.Spy<ModuleCollectionAnalysisService['analyzeRackConfiguration']>;
  }

  interface AnalyticsServiceDouble extends Pick<AnalyticsService, 'capture' | 'identify' | 'reset'> {
    capture: jasmine.Spy<AnalyticsService['capture']>;
    identify: jasmine.Spy<AnalyticsService['identify']>;
    reset: jasmine.Spy<AnalyticsService['reset']>;
  }

  interface RackCreatorDataServiceDouble
    extends Pick<RackCreatorDataService,
      'getUserSession$' | 'loadModuleCatalogue$' | 'createRack$' | 'createRackWithPlacements$'> {
    getUserSession$: jasmine.Spy<() => Observable<SimpleUserModel | null>>;
    loadModuleCatalogue$: jasmine.Spy<(
      fallbackModules: MinimalModule[],
      sourceModules?: ModularGridSourceModule[]
    ) => Observable<MinimalModule[]>>;
    createRack$: jasmine.Spy<(rackDraft: RackCreatorRackDraft) => Observable<RackCreatorCreateResult>>;
    createRackWithPlacements$: jasmine.Spy<(
      rackDraft: RackCreatorRackDraft,
      placements: ModularGridRackModulePlacement[]
    ) => Observable<RackCreatorCreateResult>>;
  }

  function simpleUserFixture(id = 'u1'): SimpleUserModel {
    return {
      id,
      email: `${ id }@example.test`,
      created_at: TEST_TIMESTAMP,
      updated_at: TEST_TIMESTAMP
    };
  }

  function standardName(standardId: number): string {
    if (standardId === STANDARDS.INTELLIJEL_1U.id) {
      return STANDARDS.INTELLIJEL_1U.name;
    }
    if (standardId === STANDARDS.PULPLOGIC_1U.id) {
      return STANDARDS.PULPLOGIC_1U.name;
    }
    return STANDARDS.EURORACK_3U.name;
  }

  function moduleFixture(
    id: number,
    hp = 8,
    standardId: number = STANDARDS.EURORACK_3U.id
  ): MinimalModule {
    return {
      id,
      name: `Module ${ id }`,
      description: '',
      hp,
      public: true,
      manufacturer: {
        id: 1,
        name: 'Fixture Maker'
      },
      manufacturerId: 1,
      standard: {
        id: standardId,
        name: standardName(standardId)
      },
      tags: [],
      panels: [],
      created: TEST_TIMESTAMP,
      updated: TEST_TIMESTAMP
    };
  }

  function rackAnalysisFixture(overrides: Partial<RackAnalysis> = {}): RackAnalysis {
    return {
      totalCapacity: 84,
      moduleCount: 0,
      totalModulesHp: 0,
      utilizationPercent: 0,
      recommendation: '',
      standardAnalyses: [],
      ...overrides
    };
  }

  function toComponentModules(userModules?: readonly RackCreatorModuleInput[]): MinimalModule[] | undefined {
    return userModules === undefined
      ? undefined
      : [...userModules] as unknown as MinimalModule[];
  }

  function build(userModules?: readonly RackCreatorModuleInput[]) {
    const componentModules = toComponentModules(userModules);
    const dataService: RackCreatorDataServiceDouble = {
      getUserSession$: jasmine.createSpy<() => Observable<SimpleUserModel | null>>('getUserSession$')
        .and.returnValue(of(simpleUserFixture())),
      loadModuleCatalogue$: jasmine.createSpy<(
        fallbackModules: MinimalModule[],
        sourceModules?: ModularGridSourceModule[]
      ) => Observable<MinimalModule[]>>('loadModuleCatalogue$').and.returnValue(of(componentModules ?? [])),
      createRack$: jasmine.createSpy<(rackDraft: RackCreatorRackDraft) => Observable<RackCreatorCreateResult>>('createRack$').and.returnValue(of({
        rackId: 1,
        placementSummary: {placed: 0, failed: 0}
      })),
      createRackWithPlacements$: jasmine.createSpy<(
        rackDraft: RackCreatorRackDraft,
        placements: ModularGridRackModulePlacement[]
      ) => Observable<RackCreatorCreateResult>>('createRackWithPlacements$').and.returnValue(of({
        rackId: 1,
        placementSummary: {placed: 0, failed: 0}
      }))
    };
    const snackBar: SnackBarDouble = {
      open: jasmine.createSpy<SnackBarOpen>('open').and.returnValue({onAction: () => of(undefined)})
    };
    const dialogRef: DialogRefDouble = {
      close: jasmine.createSpy<(result?: RackCreatorOutModel) => void>('close')
    };
    const mca: ModuleCollectionAnalysisServiceDouble = {
      analyzeRackConfiguration: jasmine.createSpy<ModuleCollectionAnalysisService['analyzeRackConfiguration']>(
        'analyzeRackConfiguration'
      ).and.returnValue(rackAnalysisFixture())
    };
    const analytics: AnalyticsServiceDouble = {
      capture: jasmine.createSpy<AnalyticsService['capture']>('capture'),
      identify: jasmine.createSpy<AnalyticsService['identify']>('identify'),
      reset: jasmine.createSpy<AnalyticsService['reset']>('reset')
    };
    const fileDragHostService = new FileDragHostService(snackBar as unknown as MatSnackBar);
    const dialogData: RackCreatorInModel = componentModules === undefined ? {} : {userModules: componentModules};
    
    const component = new RackCreatorComponent(
      snackBar as unknown as MatSnackBar,
      dialogRef as unknown as MatDialogRef<RackCreatorComponent, RackCreatorOutModel>,
      dialogData,
      mca as unknown as ModuleCollectionAnalysisService,
      analytics as unknown as AnalyticsService,
      dataService as unknown as RackCreatorDataService,
      fileDragHostService
    );
    createdComponents.push(component);
    return {component, dataService, snackBar, dialogRef, mca};
  }

  beforeEach(() => {
    createdComponents = [];
  });

  afterEach(() => {
    createdComponents.forEach((component) => component.ngOnDestroy());
  });
  
  it('rackAnalysis$ still works when data.userModules is not provided (undefined)', (done) => {
    const {component, mca} = build(undefined);
    
    component.rackAnalysis$.subscribe(() => {
      expect(mca.analyzeRackConfiguration).toHaveBeenCalled();
      done();
    });
  });
  
  it('filters out null entries in the module list gracefully', (done) => {
    const modules: RackCreatorModuleInput[] = [
      null,
      moduleFixture(1, 8, STANDARDS.EURORACK_3U.id)
    ];
    const {component, mca} = build(modules);
    
    component.rackAnalysis$.subscribe(() => {
      const analyzedModules = mca.analyzeRackConfiguration.calls.mostRecent().args[2] ?? [];
      // Only the valid (non-null) eurorack module should pass through
      expect(analyzedModules.length).toBe(1);
      done();
    });
  });
  
  it('uses EURORACK_3U as default standard when standard.id is undefined', (done) => {
    const standardlessModule: RackCreatorMalformedModule = {
      ...moduleFixture(1, 8),
      standard: undefined
    };
    const modules: RackCreatorModuleInput[] = [
      standardlessModule,
      moduleFixture(2, 4, STANDARDS.INTELLIJEL_1U.id)
    ];
    const {component, mca} = build(modules);
    
    component.rackAnalysis$.subscribe(() => {
      const analyzedModules = mca.analyzeRackConfiguration.calls.mostRecent().args[2] ?? [];
      // module 1 (no standard) should be treated as 3U and included
      // module 2 (Intellijel 1U) should be filtered out
      expect(analyzedModules.some(module => module.id === 1)).toBeTrue();
      expect(analyzedModules.some(module => module.id === 2)).toBeFalse();
      done();
    });
  });
  
  it('generates a non-empty rack name by default', () => {
    const {component} = build();
    const nameValue: string = component.fields.name.control.value;
    expect(typeof nameValue).toBe('string');
    expect(nameValue.length).toBeGreaterThan(0);
  });
  
  it('ngOnInit can be called without error', () => {
    const {component} = build();
    expect(() => component.ngOnInit()).not.toThrow();
  });
});