import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import {
  ComponentFixture,
  TestBed
} from '@angular/core/testing';
import {
  firstValueFrom,
  Observable,
  of,
  Subject,
  throwError
} from 'rxjs';
import { filter, take } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  MAT_DIALOG_DATA,
  MatDialogRef
} from '@angular/material/dialog';
import { MinimalModule } from 'src/app/models/module';
import { RackMinimal } from 'src/app/models/rack';
import { SimpleUserModel } from 'src/app/features/backend/supabase.types';
import { FileDragHostService } from 'src/app/shared-interproject/components/@smart/file-drag-host/file-drag-host.service';
import {
  AnalyticsService
} from 'src/app/features/backbone/analytics-integration/analytics.service';
import {
  ModuleCollectionAnalysisService,
  RackAnalysis,
} from '../module-collection-analysis.service';
import {
  RackCreatorComponent,
  RACK_CREATOR_IMPORT_DIALOG_WIDTH,
  RACK_CREATOR_MANUAL_DIALOG_WIDTH
} from './rack-creator.component';
import { STANDARDS } from '../module-collection-analysis.service';
import {
  ModularGridMatchPreview,
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


describe('RackCreatorComponent', () => {
  let createdComponents: RackCreatorComponent[];

  const TEST_TIMESTAMP = '2026-01-01T00:00:00.000Z';

  type RackCreatorRackDraft = Omit<RackMinimal, 'author' | 'created' | 'updated' | 'id'>;
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
    updateSize: jasmine.Spy<(width?: string, height?: string) => void>;
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

  interface RackCreatorTestDoubles {
    dataService: RackCreatorDataServiceDouble;
    snackBar: SnackBarDouble;
    dialogRef: DialogRefDouble;
    moduleCollectionAnalysisService: ModuleCollectionAnalysisServiceDouble;
    analytics: AnalyticsServiceDouble;
    fileDragHostService: FileDragHostService;
    dialogData: RackCreatorInModel;
  }

  function simpleUserFixture(id = 'user-1'): SimpleUserModel {
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
    name = `Module ${ id }`,
    hp = 8,
    standardId: number = STANDARDS.EURORACK_3U.id
  ): MinimalModule {
    return {
      id,
      name,
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
      moduleCount: 1,
      totalModulesHp: 8,
      utilizationPercent: 10,
      recommendation: '',
      standardAnalyses: [],
      ...overrides
    };
  }

  function makeFileDragHostService(snackBar: SnackBarDouble): FileDragHostService {
    const service = new FileDragHostService(snackBar as unknown as MatSnackBar);
    spyOn(service.removeAllFiles$, 'emit').and.callThrough();
    return service;
  }

  function createTestDoubles(
    user: SimpleUserModel | null = simpleUserFixture(),
    userModules: MinimalModule[] = []
  ): RackCreatorTestDoubles {
    const dataService: RackCreatorDataServiceDouble = {
      getUserSession$: jasmine.createSpy<() => Observable<SimpleUserModel | null>>('getUserSession$')
        .and.returnValue(of(user)),
      loadModuleCatalogue$: jasmine.createSpy<(
        fallbackModules: MinimalModule[],
        sourceModules?: ModularGridSourceModule[]
      ) => Observable<MinimalModule[]>>('loadModuleCatalogue$').and.returnValue(of(userModules)),
      createRack$: jasmine.createSpy<(rackDraft: RackCreatorRackDraft) => Observable<RackCreatorCreateResult>>('createRack$').and.returnValue(of({
        rackId: 1,
        placementSummary: {placed: 0, failed: 0}
      })),
      createRackWithPlacements$: jasmine.createSpy<(
        rackDraft: RackCreatorRackDraft,
        placements: ModularGridRackModulePlacement[]
      ) => Observable<RackCreatorCreateResult>>('createRackWithPlacements$').and.returnValue(of({
        rackId: 1,
        placementSummary: {placed: 1, failed: 0}
      }))
    };
    const snackBar: SnackBarDouble = {
      open: jasmine.createSpy<SnackBarOpen>('open').and.returnValue({
        onAction: () => of(undefined)
      })
    };
    const dialogRef: DialogRefDouble = {
      close: jasmine.createSpy<(result?: RackCreatorOutModel) => void>('close'),
      updateSize: jasmine.createSpy<(width?: string, height?: string) => void>('updateSize')
    };
    const moduleCollectionAnalysisService: ModuleCollectionAnalysisServiceDouble = {
      analyzeRackConfiguration: jasmine.createSpy<ModuleCollectionAnalysisService['analyzeRackConfiguration']>(
        'analyzeRackConfiguration'
      ).and.returnValue(rackAnalysisFixture())
    };
    const analytics: AnalyticsServiceDouble = {
      capture: jasmine.createSpy<AnalyticsService['capture']>('capture'),
      identify: jasmine.createSpy<AnalyticsService['identify']>('identify'),
      reset: jasmine.createSpy<AnalyticsService['reset']>('reset')
    };
    const fileDragHostService = makeFileDragHostService(snackBar);

    return {
      dataService,
      snackBar,
      dialogRef,
      moduleCollectionAnalysisService,
      analytics,
      fileDragHostService,
      dialogData: {userModules}
    };
  }

  function setImportJson(component: RackCreatorComponent, value: string): void {
    component.modularGridFileText$.next(value);
  }

  function unmatchedPreview(): ModularGridMatchPreview {
    return {
      rack: {
        name: 'Import Rack',
        rows: 1,
        hp: 84,
        rows1u: []
      },
      confident: [],
      likely: [],
      ambiguous: [],
      blank: [],
      unmatched: [
        {
          bucket: 'unmatched',
          candidates: [],
          source: {
            key: '1:1:0',
            mgId: 11,
            name: 'Bef Aco STMix',
            row: 1,
            col: 1,
            inferredHp: 6
          }
        },
        {
          bucket: 'unmatched',
          candidates: [],
          source: {
            key: '1:7:1',
            mgId: 12,
            name: 'Unknown Utility',
            row: 1,
            col: 7,
            inferredHp: 4
          }
        }
      ],
      counts: {
        confident: 0,
        likely: 0,
        ambiguous: 0,
        unmatched: 2,
        blank: 0
      }
    };
  }

  function build(user: SimpleUserModel | null = simpleUserFixture(), userModules: MinimalModule[] = []) {
    const {
      dataService,
      snackBar,
      dialogRef,
      moduleCollectionAnalysisService,
      analytics,
      fileDragHostService,
      dialogData
    } = createTestDoubles(user, userModules);
    
    const component = new RackCreatorComponent(
      snackBar as unknown as MatSnackBar,
      dialogRef as unknown as MatDialogRef<RackCreatorComponent, RackCreatorOutModel>,
      dialogData,
      moduleCollectionAnalysisService as unknown as ModuleCollectionAnalysisService,
      analytics as unknown as AnalyticsService,
      dataService as unknown as RackCreatorDataService,
      fileDragHostService
    );
    createdComponents.push(component);
    
    return {
      component,
      dataService,
      snackBar,
      dialogRef,
      moduleCollectionAnalysisService,
      fileDragHostService
    };
  }

  async function createTemplateFixture(
    userModules: MinimalModule[] = []
  ): Promise<ComponentFixture<RackCreatorComponent>> {
    const doubles = createTestDoubles(simpleUserFixture('u1'), userModules);

    await TestBed.configureTestingModule({
      declarations: [RackCreatorComponent],
      imports: [CommonModule],
      providers: [
        {provide: MatSnackBar, useValue: doubles.snackBar},
        {provide: MatDialogRef, useValue: doubles.dialogRef},
        {provide: MAT_DIALOG_DATA, useValue: doubles.dialogData},
        {
          provide: ModuleCollectionAnalysisService,
          useValue: doubles.moduleCollectionAnalysisService
        },
        {provide: AnalyticsService, useValue: doubles.analytics}
      ],
      schemas: [NO_ERRORS_SCHEMA]
    })
      .overrideComponent(RackCreatorComponent, {
        set: {
          providers: [
            {provide: RackCreatorDataService, useValue: doubles.dataService},
            {provide: FileDragHostService, useValue: doubles.fileDragHostService}
          ]
        }
      })
      .compileComponents();

    return TestBed.createComponent(RackCreatorComponent);
  }

  beforeEach(() => {
    createdComponents = [];
  });

  afterEach(() => {
    createdComponents.forEach((component) => component.ngOnDestroy());
    TestBed.resetTestingModule();
  });
  
  it('filters out small 1U formats from rack analysis input', (done) => {
    const modules = [
      moduleFixture(1, '3U Module', 8, STANDARDS.EURORACK_3U.id),
      moduleFixture(2, 'Intellijel Module', 4, STANDARDS.INTELLIJEL_1U.id),
      moduleFixture(3, 'Pulp Logic Module', 4, STANDARDS.PULPLOGIC_1U.id)
    ];
    const {component, moduleCollectionAnalysisService} = build(simpleUserFixture('u1'), modules);
    
    component.rackAnalysis$.subscribe(() => {
      expect(moduleCollectionAnalysisService.analyzeRackConfiguration).toHaveBeenCalled();
      const analyzedModules = moduleCollectionAnalysisService.analyzeRackConfiguration.calls.mostRecent().args[2] ?? [];
      expect(analyzedModules.map(module => module.id)).toEqual([1]);
      done();
    });
  });
  
  it('creates a rack and closes dialog when save is triggered for logged user', () => {
    const {component, dataService, dialogRef} = build(simpleUserFixture('u1'), []);
    component.fields.name.control.setValue('My Rack');
    component.fields.hp.control.setValue(84);
    component.fields.rows.control.setValue(3);
    
    component.save$.next();
    
    expect(dataService.createRack$).toHaveBeenCalledWith({
      name: 'My Rack',
      hp: 84,
      rows: 3,
      public: true,
      locked: false
    });
    expect(dialogRef.close).toHaveBeenCalled();
  });

  it('marks creation in progress, disables create, and blocks duplicate manual saves', async () => {
    const {component, dataService, dialogRef} = build(simpleUserFixture('u1'), []);
    const createRack$ = new Subject<RackCreatorCreateResult>();
    dataService.createRack$.and.returnValue(createRack$);
    component.fields.name.control.setValue('My Rack');
    component.fields.hp.control.setValue(84);
    component.fields.rows.control.setValue(3);

    await expectAsync(firstValueFrom(component.createInProgress$.pipe(take(1)))).toBeResolvedTo(false);

    component.save$.next();

    await expectAsync(firstValueFrom(component.createInProgress$.pipe(take(1)))).toBeResolvedTo(true);
    await expectAsync(firstValueFrom(component.canCreate$.pipe(take(1)))).toBeResolvedTo(false);

    component.save$.next();

    expect(dataService.createRack$).toHaveBeenCalledTimes(1);

    createRack$.next({
      rackId: 1,
      placementSummary: {placed: 0, failed: 0}
    });
    createRack$.complete();

    await expectAsync(firstValueFrom(component.createInProgress$.pipe(take(1)))).toBeResolvedTo(false);
    expect(dialogRef.close).toHaveBeenCalled();
  });

  it('clears creation progress and allows retry when manual create fails', async () => {
    const {component, dataService, dialogRef, snackBar} = build(simpleUserFixture('u1'), []);
    const failedCreate$ = new Subject<RackCreatorCreateResult>();
    const retryCreate$ = new Subject<RackCreatorCreateResult>();
    dataService.createRack$.and.returnValues(failedCreate$, retryCreate$);

    component.save$.next();

    await expectAsync(firstValueFrom(component.createInProgress$.pipe(take(1)))).toBeResolvedTo(true);

    failedCreate$.error(new Error('create failed'));

    await expectAsync(firstValueFrom(component.createInProgress$.pipe(take(1)))).toBeResolvedTo(false);
    await expectAsync(firstValueFrom(component.canCreate$.pipe(take(1)))).toBeResolvedTo(true);
    expect(dialogRef.close).not.toHaveBeenCalled();
    expect(snackBar.open).toHaveBeenCalledWith('Could not create rack.', undefined, {
      duration: 3000
    });

    component.save$.next();

    expect(dataService.createRack$).toHaveBeenCalledTimes(2);

    retryCreate$.next({
      rackId: 2,
      placementSummary: {placed: 0, failed: 0}
    });
    retryCreate$.complete();

    expect(dialogRef.close).toHaveBeenCalled();
  });

  it('defaults new racks to public visibility', () => {
    const {component} = build(simpleUserFixture('u1'), []);

    expect(component.fields.public.control.value).toBeTrue();
  });

  it('defaults HP to 84 and rows to 2', () => {
    const {component} = build(simpleUserFixture('u1'), []);
    expect(Number(component.fields.hp.control.value)).toBe(84);
    expect(Number(component.fields.rows.control.value)).toBe(2);
  });

  it('HP control rejects values outside 2–216', () => {
    const {component} = build(simpleUserFixture('u1'), []);
    component.fields.hp.control.setValue(1);
    expect(component.fields.hp.control.valid).toBeFalse();
    component.fields.hp.control.setValue(217);
    expect(component.fields.hp.control.valid).toBeFalse();
    component.fields.hp.control.setValue(84);
    expect(component.fields.hp.control.valid).toBeTrue();
  });

  it('rows control rejects values outside 1–16', () => {
    const {component} = build(simpleUserFixture('u1'), []);
    component.fields.rows.control.setValue(0);
    expect(component.fields.rows.control.valid).toBeFalse();
    component.fields.rows.control.setValue(17);
    expect(component.fields.rows.control.valid).toBeFalse();
    component.fields.rows.control.setValue(11);
    expect(component.fields.rows.control.valid).toBeTrue();
  });

  it('does not create rack when user is not logged in', () => {
    const {component, dataService, dialogRef} = build(null, []);
    
    component.save$.next();
    
    expect(dataService.createRack$).not.toHaveBeenCalled();
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('name field starts with a non-empty generated value', () => {
    const {component} = build(simpleUserFixture('u1'), []);
    expect(typeof component.fields.name.control.value).toBe('string');
    expect(component.fields.name.control.value.length).toBeGreaterThan(0);
  });

  it('passes public flag correctly when saving rack', () => {
    const {component, dataService} = build(simpleUserFixture('u1'), []);
    component.fields.name.control.setValue('Test Rack');
    component.fields.hp.control.setValue(60);
    component.fields.rows.control.setValue(2);
    component.fields.public.control.setValue(false);

    component.save$.next();

    expect(dataService.createRack$).toHaveBeenCalledWith(jasmine.objectContaining({public: false}));
  });

  it('rackAnalysis$ emits after hp value changes', (done) => {
    const {component, moduleCollectionAnalysisService} = build(simpleUserFixture('u1'), []);
    let emitCount = 0;
    component.rackAnalysis$.subscribe(() => {
      emitCount++;
      if (emitCount === 1) {
        component.fields.hp.control.setValue(104);
      } else {
        expect(moduleCollectionAnalysisService.analyzeRackConfiguration).toHaveBeenCalled();
        done();
      }
    });
  });

  it('keeps create enabled when import is off', async () => {
    const {component} = build(simpleUserFixture('u1'), []);

    await expectAsync(firstValueFrom(component.canCreate$.pipe(take(1)))).toBeResolvedTo(true);
  });

  it('gates create on valid ModularGrid JSON when import is on', async () => {
    const {component} = build(simpleUserFixture('u1'), [
      moduleFixture(1, '6x MIX', 6)
    ]);
    component.importEnabledControl.setValue(true);
    setImportJson(component, '{ nope');

    await expectAsync(firstValueFrom(component.canCreate$.pipe(take(1)))).toBeResolvedTo(false);

    setImportJson(component, JSON.stringify({
      Rack: {name: 'Imported Rack', rows: 1, te: 84},
      User: {},
      Module: [{
        id: 99,
        name: '6x MIX - black',
        ModulesRack: {row: 1, col: 1}
      }]
    }));

    await expectAsync(firstValueFrom(component.canCreate$.pipe(take(1)))).toBeResolvedTo(true);
    expect(component.fields.name.control.value).toBe('Imported Rack');
    expect(Number(component.fields.hp.control.value)).toBe(84);
    expect(Number(component.fields.rows.control.value)).toBe(1);
  });

  it('shows parser warnings for valid ModularGrid JSON without blocking create', async () => {
    const fixture = await createTemplateFixture([
      moduleFixture(1, '6x MIX', 6)
    ]);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.importEnabledControl.setValue(true);
    setImportJson(component, JSON.stringify({
      Rack: {
        name: 'Warned Import',
        rows: 1,
        te: 84,
        rows1u: 'not serialized row data'
      },
      User: {},
      Module: [{
        id: 99,
        name: '6x MIX - black',
        ModulesRack: {row: 1, col: 1}
      }]
    }));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const warnings = host.querySelector('[data-testid="modulargrid-import-warnings"]');
    expect(warnings).not.toBeNull();
    expect(warnings?.getAttribute('role')).toBe('status');
    expect(warnings?.getAttribute('aria-live')).toBe('polite');
    expect(Array.from(host.querySelectorAll('[data-testid="modulargrid-import-warning"]'))
      .map(warning => warning.textContent?.trim()))
      .toEqual(['Could not detect 1U rows from rows1u; treating all rows as standard height.']);
    await expectAsync(firstValueFrom(component.canCreate$.pipe(take(1)))).toBeResolvedTo(true);
  });

  it('does not show parser warnings for valid ModularGrid JSON without warnings', async () => {
    const fixture = await createTemplateFixture([
      moduleFixture(1, '6x MIX', 6)
    ]);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.importEnabledControl.setValue(true);
    setImportJson(component, JSON.stringify({
      Rack: {
        name: 'Clean Import',
        rows: 1,
        te: 84,
        rows1u: 'a:1:{i:0;i:1;}'
      },
      User: {},
      Module: [{
        id: 99,
        name: '6x MIX - black',
        ModulesRack: {row: 1, col: 1}
      }]
    }));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('[data-testid="modulargrid-import-warnings"]')).toBeNull();
    await expectAsync(firstValueFrom(component.canCreate$.pipe(take(1)))).toBeResolvedTo(true);
  });

  it('clamps imported ModularGrid rack names to the rack name limit', async () => {
    const {component} = build(simpleUserFixture('u1'), [
      moduleFixture(1, '6x MIX', 6)
    ]);
    component.importEnabledControl.setValue(true);
    setImportJson(component, JSON.stringify({
      Rack: {name: '43 [public] - KARMA+COMA + Spares - - - -', rows: 1, te: 84},
      User: {},
      Module: [{
        id: 99,
        name: '6x MIX - black',
        ModulesRack: {row: 1, col: 1}
      }]
    }));

    await expectAsync(firstValueFrom(component.canCreate$.pipe(take(1)))).toBeResolvedTo(true);
    expect(component.fields.name.control.value).toBe('43 [public] - KARMA+COMA + Spare');
    expect(component.fields.name.control.valid).toBeTrue();
  });

  it('keeps imported create disabled for wrong-shape JSON', async () => {
    const {component} = build(simpleUserFixture('u1'), [
      moduleFixture(1, '6x MIX', 6)
    ]);
    component.importEnabledControl.setValue(true);
    setImportJson(component, JSON.stringify({Rack: {}, Module: []}));

    await expectAsync(firstValueFrom(component.canCreate$.pipe(take(1)))).toBeResolvedTo(false);
  });

  it('keeps imported create enabled when ambiguous modules are left skipped by default', async () => {
    const {component} = build(simpleUserFixture('u1'), [
      moduleFixture(1, 'Microcell', 14),
      moduleFixture(2, 'Microcell Black', 14)
    ]);
    component.importEnabledControl.setValue(true);
    setImportJson(component, JSON.stringify({
      Rack: {name: 'Imported Rack', rows: 1, te: 84},
      User: {},
      Module: [{
        id: 99,
        name: 'Microcell',
        ModulesRack: {row: 1, col: 1}
      }]
    }));

    await expectAsync(firstValueFrom(component.canCreate$.pipe(take(1)))).toBeResolvedTo(true);
    expect(component.isAmbiguousCandidateSelected('1:1:0', null)).toBeTrue();

    component.selectAmbiguousCandidate('1:1:0', 1);

    await expectAsync(firstValueFrom(component.canCreate$.pipe(take(1)))).toBeResolvedTo(true);
  });

  it('reports ambiguous resolution status for default skipped, resolved, and explicitly skipped choices', () => {
    const {component} = build(simpleUserFixture('u1'), []);

    expect(component.ambiguousResolutionState('module-key')).toBe('skip');
    expect(component.ambiguousResolutionIcon('module-key')).toBe('remove_circle_outline');
    expect(component.isAmbiguousCandidateSelected('module-key', null)).toBeTrue();

    component.selectAmbiguousCandidate('module-key', 123);
    expect(component.ambiguousResolutionState('module-key')).toBe('resolved');
    expect(component.ambiguousResolutionIcon('module-key')).toBe('check_circle');

    component.selectAmbiguousCandidate('module-key', null);
    expect(component.ambiguousResolutionState('module-key')).toBe('skip');
    expect(component.ambiguousResolutionIcon('module-key')).toBe('remove_circle_outline');
  });

  it('formats candidate manufacturer names with a safe fallback', () => {
    const {component} = build(simpleUserFixture('u1'), []);

    expect(component.moduleManufacturerName({
      manufacturer: {name: ' Make Noise '}
    } as MinimalModule)).toBe('Make Noise');
    expect(component.moduleManufacturerName({
      manufacturer: {name: ' '}
    } as MinimalModule)).toBe('Unknown manufacturer');
    expect(component.moduleManufacturerName(null)).toBe('Unknown manufacturer');
  });

  it('builds a plain text list of missing imported modules', () => {
    const {component} = build(simpleUserFixture('u1'), []);

    expect(component.missingModulesText(unmatchedPreview())).toBe([
      'Missing ModularGrid modules for "Import Rack":',
      '- Bef Aco STMix (6 HP, row 1, column 1)',
      '- Unknown Utility (4 HP, row 1, column 7)'
    ].join('\n'));
  });

  it('copies missing imported modules to the clipboard', async () => {
    const {component, snackBar} = build(simpleUserFixture('u1'), []);
    const clipboard = {
      writeText: jasmine.createSpy('writeText').and.returnValue(Promise.resolve())
    };
    Object.defineProperty(navigator, 'clipboard', {
      value: clipboard,
      configurable: true
    });

    await component.copyMissingModulesText(unmatchedPreview());

    expect(clipboard.writeText).toHaveBeenCalledWith([
      'Missing ModularGrid modules for "Import Rack":',
      '- Bef Aco STMix (6 HP, row 1, column 1)',
      '- Unknown Utility (4 HP, row 1, column 7)'
    ].join('\n'));
    expect(snackBar.open).toHaveBeenCalledWith(
      'Missing module list copied to clipboard.',
      undefined,
      {duration: 3000}
    );
  });

  it('surfaces clipboard copy failures for missing imported modules', async () => {
    const {component, snackBar} = build(simpleUserFixture('u1'), []);
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: jasmine.createSpy('writeText').and.returnValue(Promise.reject(new Error('denied')))
      },
      configurable: true
    });

    await component.copyMissingModulesText(unmatchedPreview());

    expect(snackBar.open).toHaveBeenCalledWith(
      'Could not copy missing module list.',
      undefined,
      {duration: 3000}
    );
  });

  it('widens the dialog only while ModularGrid import is enabled', () => {
    const {component, dialogRef} = build(simpleUserFixture('u1'), []);

    component.importEnabledControl.setValue(true);
    expect(dialogRef.updateSize).toHaveBeenCalledWith(RACK_CREATOR_IMPORT_DIALOG_WIDTH);

    component.importEnabledControl.setValue(false);
    expect(dialogRef.updateSize).toHaveBeenCalledWith(RACK_CREATOR_MANUAL_DIALOG_WIDTH);
  });

  it('waits for the catalogue load before enabling imported create', () => {
    const {component, dataService} = build(simpleUserFixture('u1'), [
      moduleFixture(1, '6x MIX', 6)
    ]);
    const catalogue$ = new Subject<MinimalModule[]>();
    dataService.loadModuleCatalogue$.and.returnValue(catalogue$);
    const canCreateValues: boolean[] = [];
    const subscription = component.canCreate$.subscribe(value => canCreateValues.push(value));

    component.importEnabledControl.setValue(true);
    setImportJson(component, JSON.stringify({
      Rack: {name: 'Imported Rack', rows: 1, te: 84},
      User: {},
      Module: [{
        id: 99,
        name: '6x MIX - black',
        ModulesRack: {row: 1, col: 1}
      }]
    }));

    expect(canCreateValues[canCreateValues.length - 1]).toBeFalse();

    catalogue$.next([moduleFixture(1, '6x MIX', 6)]);
    catalogue$.complete();

    expect(canCreateValues[canCreateValues.length - 1]).toBeTrue();
    subscription.unsubscribe();
  });

  it('defers catalogue loading until imported JSON is valid', () => {
    const {component, dataService} = build(simpleUserFixture('u1'), [
      moduleFixture(1, '6x MIX', 6)
    ]);
    const stateValues: boolean[] = [];
    const subscription = component.moduleCatalogueState$
      .subscribe(state => stateValues.push(state.ready));

    component.importEnabledControl.setValue(true);
    setImportJson(component, '{ nope');

    expect(dataService.loadModuleCatalogue$).not.toHaveBeenCalled();
    expect(stateValues[stateValues.length - 1]).toBeTrue();

    setImportJson(component, JSON.stringify({
      Rack: {name: 'Imported Rack', rows: 1, te: 84},
      User: {},
      Module: [{
        id: 99,
        name: '6x MIX - black',
        ModulesRack: {row: 1, col: 1}
      }]
    }));

    expect(dataService.loadModuleCatalogue$).toHaveBeenCalled();
    const [fallbackModules, sourceModules] = dataService.loadModuleCatalogue$.calls.mostRecent().args;
    expect(fallbackModules.map(module => ({
      id: module.id,
      name: module.name,
      hp: module.hp
    }))).toEqual([{id: 1, name: '6x MIX', hp: 6}]);
    expect(sourceModules).toEqual([jasmine.objectContaining({name: '6x MIX - black'})]);
    subscription.unsubscribe();
  });

  it('keeps imported create disabled when the catalogue load fails', () => {
    const {component, dataService} = build(simpleUserFixture('u1'), [
      moduleFixture(1, '6x MIX', 6)
    ]);
    dataService.loadModuleCatalogue$.and.returnValue(throwError(() => new Error('catalogue failed')));
    const canCreateValues: boolean[] = [];
    const catalogueErrors: Array<string | null> = [];
    const canCreateSubscription = component.canCreate$.subscribe(value => canCreateValues.push(value));
    const catalogueSubscription = component.moduleCatalogueState$.subscribe(state => catalogueErrors.push(state.error));

    component.importEnabledControl.setValue(true);
    setImportJson(component, JSON.stringify({
      Rack: {name: 'Imported Rack', rows: 1, te: 84},
      User: {},
      Module: [{
        id: 99,
        name: '6x MIX - black',
        ModulesRack: {row: 1, col: 1}
      }]
    }));

    expect(canCreateValues[canCreateValues.length - 1]).toBeFalse();
    expect(catalogueErrors[catalogueErrors.length - 1])
      .toBe('Could not load the Patcher module catalogue. Try again before importing.');
    canCreateSubscription.unsubscribe();
    catalogueSubscription.unsubscribe();
  });

  it('creates imported rack placements with skipped count in notification', () => {
    const {component, dataService, snackBar} = build(simpleUserFixture('u1'), [
      moduleFixture(1, '6x MIX', 6)
    ]);
    dataService.createRackWithPlacements$.and.returnValue(of({
      rackId: 1,
      placementSummary: {placed: 2, failed: 0}
    }));
    component.importEnabledControl.setValue(true);
    setImportJson(component, JSON.stringify({
      Rack: {name: 'Imported Rack', rows: 1, te: 84},
      User: {},
      Module: [
        {
          id: 99,
          name: '6x MIX - black',
          ModulesRack: {row: 1, col: 1}
        },
        {
          id: 100,
          name: '4HP Blank Panel',
          ModulesRack: {row: 1, col: 7}
        }
      ]
    }));

    component.save$.next();

    expect(dataService.createRackWithPlacements$).toHaveBeenCalledWith(jasmine.objectContaining({
      name: 'Imported Rack',
      hp: 84,
      rows: 1
    }), jasmine.arrayContaining([
      jasmine.objectContaining({
        moduleId: 1,
        row: 0,
        column: 0
      }),
      jasmine.objectContaining({
        moduleId: 4648,
        row: 0,
        column: 6
      })
    ]));
    expect(snackBar.open).toHaveBeenCalledWith('Rack created — 2 modules placed, 0 skipped.', undefined, {
      duration: 3000
    });
  });

  it('marks imported creation in progress and blocks duplicate imported saves', async () => {
    const {component, dataService, dialogRef} = build(simpleUserFixture('u1'), [
      moduleFixture(1, '6x MIX', 6)
    ]);
    const createRackWithPlacements$ = new Subject<RackCreatorCreateResult>();
    dataService.createRackWithPlacements$.and.returnValue(createRackWithPlacements$);
    component.importEnabledControl.setValue(true);
    setImportJson(component, JSON.stringify({
      Rack: {name: 'Imported Rack', rows: 1, te: 84},
      User: {},
      Module: [{
        id: 99,
        name: '6x MIX - black',
        ModulesRack: {row: 1, col: 1}
      }]
    }));

    component.save$.next();

    await expectAsync(firstValueFrom(component.createInProgress$.pipe(take(1)))).toBeResolvedTo(true);
    await expectAsync(firstValueFrom(component.canCreate$.pipe(take(1)))).toBeResolvedTo(false);

    component.save$.next();

    expect(dataService.createRackWithPlacements$).toHaveBeenCalledTimes(1);

    createRackWithPlacements$.next({
      rackId: 1,
      placementSummary: {placed: 1, failed: 0}
    });
    createRackWithPlacements$.complete();

    await expectAsync(firstValueFrom(component.createInProgress$.pipe(take(1)))).toBeResolvedTo(false);
    expect(dialogRef.close).toHaveBeenCalled();
  });

  it('shows placement failure counts when an imported create reports partial placement failure', () => {
    const {component, dataService, snackBar, dialogRef} = build(simpleUserFixture('u1'), [
      moduleFixture(1, '6x MIX', 6)
    ]);
    dataService.createRackWithPlacements$.and.returnValue(of({
      rackId: 1,
      placementSummary: {placed: 1, failed: 1}
    }));
    component.importEnabledControl.setValue(true);
    setImportJson(component, JSON.stringify({
      Rack: {name: 'Imported Rack', rows: 1, te: 84},
      User: {},
      Module: [{
        id: 99,
        name: '6x MIX - black',
        ModulesRack: {row: 1, col: 1}
      }]
    }));

    component.save$.next();

    expect(dialogRef.close).toHaveBeenCalled();
    expect(snackBar.open).toHaveBeenCalledWith(
      'Rack created — 1 modules placed, 1 skipped. 1 placements failed.',
      undefined,
      {duration: 3000}
    );
  });

  it('clears ambiguous selections when imported JSON changes', async () => {
    const {component} = build(simpleUserFixture('u1'), [
      moduleFixture(1, 'Microcell', 14),
      moduleFixture(2, 'Microcell Black', 14)
    ]);
    component.importEnabledControl.setValue(true);
    setImportJson(component, JSON.stringify({
      Rack: {name: 'First Import', rows: 1, te: 84},
      User: {},
      Module: [{
        id: 99,
        name: 'Microcell',
        ModulesRack: {row: 1, col: 1}
      }]
    }));
    component.selectAmbiguousCandidate('1:1:0', 1);

    expect(component.isAmbiguousCandidateSelected('1:1:0', 1)).toBeTrue();

    setImportJson(component, JSON.stringify({
      Rack: {name: 'Second Import', rows: 1, te: 84},
      User: {},
      Module: [{
        id: 100,
        name: 'Microcell',
        ModulesRack: {row: 1, col: 1}
      }]
    }));
    await new Promise(resolve => setTimeout(resolve));

    expect(component.isAmbiguousCandidateSelected('1:1:0', 1)).toBeFalse();
  });

  it('clears file-driven ModularGrid state when import is turned off', () => {
    const {component, fileDragHostService} = build(simpleUserFixture('u1'), [
      moduleFixture(1, 'Microcell', 14),
      moduleFixture(2, 'Microcell Black', 14)
    ]);
    component.fields.name.control.setValue('Manual Rack');
    component.fields.hp.control.setValue('104');
    component.fields.rows.control.setValue('2');
    component.importEnabledControl.setValue(true);
    setImportJson(component, JSON.stringify({
      Rack: {name: 'Import', rows: 1, te: 84},
      User: {},
      Module: [{
        id: 99,
        name: 'Microcell',
        ModulesRack: {row: 1, col: 1}
      }]
    }));
    component.selectAmbiguousCandidate('1:1:0', 1);

    component.importEnabledControl.setValue(false);

    expect(component.modularGridFileText$.value).toBe('');
    expect(component.fields.name.control.value).toBe('Manual Rack');
    expect(component.fields.hp.control.value).toBe('104');
    expect(component.fields.rows.control.value).toBe('2');
    expect(fileDragHostService.removeAllFiles$.emit).toHaveBeenCalled();
    expect(component.isAmbiguousCandidateSelected('1:1:0', 1)).toBeFalse();
  });

  it('reads selected ModularGrid JSON file content into the import gate', async () => {
    const {component, fileDragHostService} = build(simpleUserFixture('u1'), [
      moduleFixture(1, '6x MIX', 6)
    ]);
    component.importEnabledControl.setValue(true);

    fileDragHostService.files$.next([new File([JSON.stringify({
      Rack: {name: 'File Import', rows: 1, te: 84},
      User: {},
      Module: [{
        id: 99,
        name: '6x MIX - black',
        ModulesRack: {row: 1, col: 1}
      }]
    })], 'rack.json', {type: 'application/json'})]);

    await firstValueFrom(component.modularGridFileText$.pipe(
      filter(text => text.includes('File Import')),
      take(1)
    ));

    await expectAsync(firstValueFrom(component.canCreate$.pipe(
      filter(canCreate => canCreate),
      take(1)
    ))).toBeResolvedTo(true);
    expect(component.fields.name.control.value).toBe('File Import');
  });
});
