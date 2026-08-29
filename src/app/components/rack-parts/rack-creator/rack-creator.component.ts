import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  OnInit
} from '@angular/core';
import {
  FormControl,
  FormGroup
} from '@angular/forms';
import {
  BehaviorSubject,
  combineLatest,
  concat,
  EMPTY,
  Observable,
  of,
  Subject
} from 'rxjs';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  finalize,
  filter,
  map,
  shareReplay,
  startWith,
  exhaustMap,
  switchMap,
  withLatestFrom
} from 'rxjs/operators';
import { MatSnackBar } from "@angular/material/snack-bar";
import {
  MAT_DIALOG_DATA,
  MatDialogRef
} from "@angular/material/dialog";
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';
import { MinimalModule } from 'src/app/models/module';
import {
  ModuleCollectionAnalysisService,
  RackAnalysis
} from 'src/app/components/rack-parts/module-collection-analysis.service';
import { AnalyticsService } from 'src/app/features/backbone/analytics-integration/analytics.service';
import {
  RackCreatorInModel,
  RackCreatorOutModel
} from './rack-creator.types';
import { RackCreatorDataService } from './rack-creator-data.service';
import {
  buildModularGridMatchPreview,
  resolveModularGridPlacements
} from './modulargrid-import/modulargrid-matcher';
import { parseModularGridExport } from './modulargrid-import/modulargrid-parser';
import {
  ModularGridMatchedModule,
  ModularGridMatchPreview,
  ModularGridParseResult,
  ModularGridResolvedPlacementSummary
} from './modulargrid-import/modulargrid-import.types';
import { FileDragHostService } from 'src/app/shared-interproject/components/@smart/file-drag-host/file-drag-host.service';
import { environment } from 'src/environments/environment';
import {
  AmbiguousResolutionState,
  ModuleCatalogueState,
  RackCreatorFields,
  RackCreatorManualFormValue,
  RACK_CREATOR_IMPORT_DIALOG_WIDTH,
  RACK_CREATOR_MANUAL_DIALOG_WIDTH,
  ambiguousResolutionState as resolveAmbiguousResolutionState,
  createRackCreatorFields,
  createRackCreatorFormGroup,
  emptyModularGridParseResult,
  filterLargeFormatModules,
  importedRackName,
  isAmbiguousCandidateSelected as resolveAmbiguousCandidateSelected,
  matchedPreviewModules as resolveMatchedPreviewModules,
  missingModulesText as resolveMissingModulesText,
  moduleManufacturerName as resolveModuleManufacturerName,
  readModularGridFileText$,
  readRackCreatorManualFormValue,
  restoreRackCreatorManualFormValue
} from './rack-creator.helpers';

export type { RackCreatorInModel, RackCreatorOutModel };
export {
  RACK_CREATOR_IMPORT_DIALOG_WIDTH,
  RACK_CREATOR_MANUAL_DIALOG_WIDTH
} from './rack-creator.helpers';


@Component({
  selector: 'app-rack-creator',
  templateUrl: './rack-creator.component.html',
  styleUrls: ['./rack-creator.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
  providers: [RackCreatorDataService, FileDragHostService]
})
export class RackCreatorComponent extends SubManager implements OnInit {
  readonly save$ = new Subject<void>();
  private readonly _createInProgress$ = new BehaviorSubject<boolean>(false);
  readonly createInProgress$ = this._createInProgress$.asObservable();
  readonly importEnabledControl = new FormControl<boolean>(false, {nonNullable: true});
  readonly modularGridImportEnabled = environment.features.modularGridImportEnabled;
  readonly modularGridFileText$ = new BehaviorSubject<string>('');
  readonly modularGridFileError$ = new BehaviorSubject<string | null>(null);
  private readonly _ambiguousSelections$ = new BehaviorSubject<Record<string, number | null>>({});
  private _preImportFormValue: RackCreatorManualFormValue | null = null;
  
  private readonly _userModules$ = new BehaviorSubject<MinimalModule[]>([]);
  readonly userModules$ = this._userModules$.asObservable();
  
  readonly rackAnalysis$: Observable<RackAnalysis>;
  readonly importEnabled$: Observable<boolean>;
  readonly modularGridParseResult$: Observable<ModularGridParseResult>;
  readonly moduleCatalogueState$: Observable<ModuleCatalogueState>;
  readonly importPreview$: Observable<ModularGridMatchPreview | null>;
  readonly resolvedImportPlacements$: Observable<ModularGridResolvedPlacementSummary>;
  readonly canCreate$: Observable<boolean>;
  readonly selectedModularGridFile$: Observable<File | null>;
  readonly fileAccepted$: Observable<boolean>;
  
  fields: RackCreatorFields;
  
  formGroup: FormGroup;
  
  constructor(
    public snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<RackCreatorComponent, RackCreatorOutModel>,
    @Inject(MAT_DIALOG_DATA) public data: RackCreatorInModel,
    private moduleCollectionAnalysisService: ModuleCollectionAnalysisService,
    private analytics: AnalyticsService,
    private dataService: RackCreatorDataService,
    public modularGridFileDragHostService: FileDragHostService
  ) {
    super();
    
    // Initialize with user modules from parent if provided
    if (data.userModules) {
      this._userModules$.next(data.userModules);
    }
    
    this.fields = createRackCreatorFields();
    
    this.formGroup = createRackCreatorFormGroup(this.fields);

    this.selectedModularGridFile$ = this.modularGridFileDragHostService.files$.pipe(
      map(files => files[0] ?? null),
      distinctUntilChanged(),
      shareReplay({bufferSize: 1, refCount: true})
    );
    this.fileAccepted$ = this.selectedModularGridFile$.pipe(
      map(file => !!file),
      distinctUntilChanged(),
      shareReplay({bufferSize: 1, refCount: true})
    );

    this.importEnabled$ = this.importEnabledControl.valueChanges.pipe(
      startWith(this.importEnabledControl.value),
      map(importEnabled => this.modularGridImportEnabled && importEnabled),
      shareReplay({bufferSize: 1, refCount: true})
    );

    this.importEnabledControl.valueChanges
      .pipe(
        distinctUntilChanged(),
        this.takeUntilDestroyed()
      )
      .subscribe(importEnabled => {
        if (importEnabled) {
          this._preImportFormValue = this.readManualFormValue();
          this.updateDialogWidth(RACK_CREATOR_IMPORT_DIALOG_WIDTH);
          return;
        }

        this.updateDialogWidth(RACK_CREATOR_MANUAL_DIALOG_WIDTH);
        this.restoreManualFormValue();
        this.modularGridFileText$.next('');
        this.modularGridFileError$.next(null);
        this.modularGridFileDragHostService.removeAllFiles$.emit();
        this._ambiguousSelections$.next({});
      });

    this.modularGridParseResult$ = combineLatest([
      this.importEnabled$,
      this.modularGridFileText$
    ]).pipe(
      map(([importEnabled, json]) => importEnabled
        ? parseModularGridExport(json)
        : emptyModularGridParseResult()
      ),
      shareReplay({bufferSize: 1, refCount: true})
    );

    this.moduleCatalogueState$ = combineLatest([
      this.importEnabled$,
      this.modularGridParseResult$
    ]).pipe(
      switchMap(([importEnabled, parseResult]) => importEnabled && parseResult.status === 'valid'
        ? concat(
          of({modules: [] as MinimalModule[], ready: false, error: null}),
          this.dataService.loadModuleCatalogue$(this.data.userModules ?? [], parseResult.modules)
            .pipe(
              map(modules => ({modules, ready: true, error: null})),
              catchError(() => of({
                modules: this.data.userModules ?? [],
                ready: false,
                error: 'Could not load the Patcher module catalogue. Try again before importing.'
              }))
            )
        )
        : of({modules: this.data.userModules ?? [], ready: true, error: null})
      ),
      shareReplay({bufferSize: 1, refCount: true})
    );

    this.importPreview$ = combineLatest([
      this.modularGridParseResult$,
      this.moduleCatalogueState$
    ]).pipe(
      map(([parseResult, catalogueState]) => catalogueState.ready
        ? buildModularGridMatchPreview(parseResult, catalogueState.modules)
        : null
      ),
      shareReplay({bufferSize: 1, refCount: true})
    );

    this.resolvedImportPlacements$ = combineLatest([
      this.importPreview$,
      this._ambiguousSelections$
    ]).pipe(
      map(([preview, selections]) => resolveModularGridPlacements(preview, selections)),
      shareReplay({bufferSize: 1, refCount: true})
    );

    this.selectedModularGridFile$
      .pipe(
        switchMap(file => file ? this.readModularGridFile$(file) : of('')),
        this.takeUntilDestroyed()
      )
      .subscribe(text => this.modularGridFileText$.next(text));

    this.canCreate$ = combineLatest([
      this.formStatusChanges(),
      this.importEnabled$,
      this.modularGridParseResult$,
      this.resolvedImportPlacements$,
      this.createInProgress$
    ]).pipe(
      map(([formStatus, importEnabled, parseResult, placementSummary, createInProgress]) =>
        formStatus === 'VALID'
        && !createInProgress
        && (!importEnabled || (parseResult.status === 'valid' && placementSummary.allAmbiguousResolved))
      ),
      shareReplay({bufferSize: 1, refCount: true})
    );
    
    // Initialize rackAnalysis$ after fields are set up
    // Rack creator only cares about larger format modules (3U and above),
    // so exclude small formats (Intellijel 1U and PulpLogic 1U)
    this.rackAnalysis$ = combineLatest([
      this.fields.hp.control.valueChanges.pipe(startWith(this.fields.hp.control.value)),
      this.fields.rows.control.valueChanges.pipe(startWith(this.fields.rows.control.value)),
      this.userModules$
    ]).pipe(
      map(([hp, rows, modules]) => this.moduleCollectionAnalysisService.analyzeRackConfiguration(
        hp,
        rows,
        filterLargeFormatModules(modules)
      ))
    );

    this.modularGridParseResult$
      .pipe(
        filter(parseResult => parseResult.status === 'valid' && !!parseResult.rack),
        distinctUntilChanged((previous, current) =>
          previous.rack?.name === current.rack?.name
          && previous.rack?.hp === current.rack?.hp
          && previous.rack?.rows === current.rack?.rows
        ),
        this.takeUntilDestroyed()
      )
      .subscribe(parseResult => {
        this.fields.name.control.setValue(importedRackName(parseResult.rack?.name, this.fields.name.control.value));
        this.fields.hp.control.setValue(parseResult.rack?.hp ?? this.fields.hp.control.value);
        this.fields.rows.control.setValue(parseResult.rack?.rows ?? this.fields.rows.control.value);
      });

    this.modularGridFileText$
      .pipe(
        debounceTime(0),
        distinctUntilChanged(),
        this.takeUntilDestroyed()
      )
      .subscribe(() => this._ambiguousSelections$.next({}));
    
    
    this.save$
      .pipe(
        withLatestFrom(
          this.dataService.getUserSession$(),
          this.importEnabled$,
          this.importPreview$,
          this.resolvedImportPlacements$
        ),
        // check if user is logged in
        filter(([_, user, importEnabled, preview, resolvedImport]) =>
          !!user
          && this.formGroup.valid
          && !this._createInProgress$.value
          && (!importEnabled || (!!preview && resolvedImport.allAmbiguousResolved))
        ),
        // create rack in database
        exhaustMap(([_, __, importEnabled, ___, resolvedImport]) => {
          this._createInProgress$.next(true);
          const rackDraft = {
            name: this.fields.name.control.value,
            hp: Number(this.fields.hp.control.value),
            rows: Number(this.fields.rows.control.value),
            public: this.fields.public.control.value,
            locked: false
          };

          const createRack$ = importEnabled
            ? this.dataService.createRackWithPlacements$(rackDraft, resolvedImport.placements)
              .pipe(map(result => ({
                ...result,
                importEnabled,
                skipped: resolvedImport.skipped
              })))
            : this.dataService.createRack$(rackDraft)
              .pipe(map(result => ({
                ...result,
                importEnabled,
                skipped: 0
              })));

          return createRack$.pipe(
            catchError(() => {
              this.snackBar.open('Could not create rack.', undefined, {
                duration: 3000
              });
              return EMPTY;
            }),
            finalize(() => this._createInProgress$.next(false))
          );
        }),
        this.takeUntilDestroyed()
      )
      .subscribe(result => {
        const rackId = result.rackId;
        this.analytics.capture('rack.created', { rack_id: rackId });
        // success and open the new rack action
        const failedPlacements = result.placementSummary.failed;
        const placedModules = result.placementSummary.placed;
        const skippedModules = result.skipped + failedPlacements;
        const message = result.importEnabled
          ? `Rack created — ${ placedModules } modules placed, ${ skippedModules } skipped.`
          : 'Rack created';
        this.snackBar.open(
          failedPlacements > 0 ? `${ message } ${ failedPlacements } placements failed.` : message,
          undefined,
          {
            duration: 3000
          });
        
        this.dialogRef.close();
      });
  }

  selectAmbiguousCandidate(sourceKey: string, moduleId: number | null): void {
    this._ambiguousSelections$.next({
      ...this._ambiguousSelections$.value,
      [sourceKey]: moduleId
    });
  }

  isAmbiguousCandidateSelected(
    sourceKey: string,
    moduleId: number | null
  ): boolean {
    return resolveAmbiguousCandidateSelected(this._ambiguousSelections$.value, sourceKey, moduleId);
  }

  ambiguousResolutionState(sourceKey: string): AmbiguousResolutionState {
    return resolveAmbiguousResolutionState(this._ambiguousSelections$.value, sourceKey);
  }

  ambiguousResolutionIcon(sourceKey: string): string {
    const state = this.ambiguousResolutionState(sourceKey);

    if (state === 'resolved') {
      return 'check_circle';
    }

    if (state === 'skip') {
      return 'remove_circle_outline';
    }

    return 'remove_circle_outline';
  }

  moduleManufacturerName(module: MinimalModule | null | undefined): string {
    return resolveModuleManufacturerName(module);
  }

  matchedPreviewModules(preview: ModularGridMatchPreview): ModularGridMatchedModule[] {
    return resolveMatchedPreviewModules(preview);
  }

  missingModulesText(preview: ModularGridMatchPreview): string {
    return resolveMissingModulesText(preview);
  }

  copyMissingModulesText(preview: ModularGridMatchPreview): Promise<void> {
    const clipboard = navigator.clipboard;

    if (!clipboard?.writeText) {
      this.snackBar.open('Clipboard is not available in this browser.', undefined, {
        duration: 3000
      });
      return Promise.resolve();
    }

    return clipboard.writeText(this.missingModulesText(preview))
      .then(() => {
        this.snackBar.open('Missing module list copied to clipboard.', undefined, {
          duration: 3000
        });
      })
      .catch(() => {
        this.snackBar.open('Could not copy missing module list.', undefined, {
          duration: 3000
        });
      });
  }

  clearModularGridFile(): void {
    this.modularGridFileDragHostService.removeAllFiles$.emit();
  }

  private formStatusChanges(): Observable<string> {
    return this.formGroup.statusChanges.pipe(startWith(this.formGroup.status));
  }

  private updateDialogWidth(width: string): void {
    const dialogRef = this.dialogRef as MatDialogRef<RackCreatorComponent, RackCreatorOutModel> & {
      updateSize?: (width?: string, height?: string) => MatDialogRef<RackCreatorComponent, RackCreatorOutModel>;
    };

    dialogRef.updateSize?.(width);
  }

  private readManualFormValue(): RackCreatorManualFormValue {
    return readRackCreatorManualFormValue(this.fields);
  }

  private restoreManualFormValue(): void {
    if (!this._preImportFormValue) {
      return;
    }

    restoreRackCreatorManualFormValue(this.fields, this._preImportFormValue);
    this._preImportFormValue = null;
  }
  
  ngOnInit(): void {
    // rackAnalysis$ is now a direct Observable that the template subscribes to via async pipe
  }

  private readModularGridFile$(file: File): Observable<string> {
    this.modularGridFileError$.next(null);

    return readModularGridFileText$(file).pipe(
      catchError(() => {
        this.modularGridFileError$.next('Could not read this file. Choose a ModularGrid JSON export and try again.');
        return of('');
      })
    );
  }
  
}
