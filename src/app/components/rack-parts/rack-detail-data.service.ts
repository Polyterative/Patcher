import {
  CdkDragDrop,
  moveItemInArray
} from '@angular/cdk/drag-drop';
import {
  ElementRef,
  Injectable
} from '@angular/core';
import { MatSnackBar } from "@angular/material/snack-bar";
import { Router } from '@angular/router';
import {
  BehaviorSubject,
  combineLatest,
  defer,
  delay,
  EMPTY,
  forkJoin,
  from,
  Observable,
  of,
  ReplaySubject,
  Subject
} from 'rxjs';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  filter,
  exhaustMap,
  finalize,
  map,
  shareReplay,
  switchMap,
  take,
  takeUntil,
  tap,
  withLatestFrom
} from 'rxjs/operators';
import { UserManagementService } from '../../features/backbone/login/user-management.service';
import { SupabaseService } from '../../features/backend/supabase.service';
import {
  MinimalModule,
  RackedModule
} from '../../models/module';
import {
  Rack,
  RackMinimal
} from '../../models/rack';
import {
  ConfirmDialogComponent,
  ConfirmDialogDataInModel,
  ConfirmDialogDataOutModel
} from '../../shared-interproject/dialogs/confirm-dialog/confirm-dialog.component';
import { SubManager } from '../../shared-interproject/directives/subscription-manager';
import { SharedConstants } from '../../shared-interproject/SharedConstants';
import {
  FormControl,
  Validators
} from "@angular/forms";
import { domToJpeg } from 'modern-screenshot';
import { MatDialog } from "@angular/material/dialog";
import { RackAnalysisMode, RACK_ANALYSIS_MODES } from './rack-analysis-mode';
import {
  buildFunctionAnalysisCoverageSummary,
  buildFunctionAnalysisLegendItems,
  buildFunctionAnalysisResidualLabel
} from './rack-function-visuals.utils';
import { SignalFocusArea } from './rack-signal-analysis.utils';
import {
  isLinkedRackSchemaMissingError,
  LINKED_RACK_PENDING_CREATE_MESSAGE
} from '../patch-parts/linked-rack-rollout';
import { generatePatchName } from '../patch-parts/patch-name-generator';
import {
  buildRackStatistics,
  buildRowedModulesArray,
  calculateBlankIdForSizeAndStandard,
  cloneRackData,
  extractCreatedPatchId,
  extractCreatedPublicId,
  isAnyModuleWithoutRackingId,
} from './rack-detail-data.utils';
import { AnalyticsService } from '../../features/backbone/analytics-integration/analytics.service';


@Injectable()
export class RackDetailDataService extends SubManager {
  private static readonly imageCaptureOverlayResetDelayMs = 360;
  private usePublicDetailReads = false;
  private rackViewedFired = false;
  readonly updateSingleRackData$ = new ReplaySubject<number>();
  /**
   * Token-based detail fetch entry-point. Routed through the SECURITY DEFINER
   * RPC `get_rack_by_public_id` so anonymous holders of a private rack's
   * share token can view it without enabling enumeration by numeric ID.
   */
  readonly updateSingleRackByPublicId$ = new ReplaySubject<string>(1);
  readonly singleRackData$ = new BehaviorSubject<Rack | undefined>(undefined);
  /**
   * Set to a user-readable message when a detail fetch yields no row (e.g. RLS
   * blocked the read for an anonymous viewer of a private rack). Cleared at the
   * start of each new fetch. Mirrors `PatchDetailDataService.patchDetailUnavailableMessage$`.
   */
  readonly rackDetailUnavailableMessage$ = new BehaviorSubject<string | null>(null);
  readonly deleteRack$ = new Subject<RackMinimal>();
  readonly duplicateRack$ = new Subject<RackMinimal>();
  readonly downloadRackImageToUserComputer$ = new Subject<void>();
  readonly updateRackImagePreview$ = new Subject<void>();
  readonly currentDownloadElementRef$: BehaviorSubject<{
    screen: ElementRef,
  } | undefined> = new BehaviorSubject<{
    screen: ElementRef,
  }>(undefined);
  
  readonly addModuleToRack$ = new Subject<MinimalModule>();
  /** Inserts a blank panel of the given HP at the end of the given row. */
  readonly addBlankToRow$ = new Subject<{rowId: number; hp: number}>();
  /** Emits when a module has been added via the bottom picker so views can scroll the rack into focus */
  readonly moduleAddedFromPicker$ = new Subject<MinimalModule>();
  readonly shouldShowPanelImages$ = new BehaviorSubject<boolean>(true);
  readonly analysisMode$ = new BehaviorSubject<RackAnalysisMode>(RACK_ANALYSIS_MODES.off);
  readonly signalFocusArea$ = new BehaviorSubject<SignalFocusArea | null>(null);
  formData = {
    name: {
      control: new FormControl('', [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(30),
        Validators.pattern('^(?!\\s*$).+')
      ])
    }
  };
  // name and value
  rackStatistics$ = new BehaviorSubject<{
    name: string,
    value: string
  }[] | null>(null);
  isRackDataLoading$ = new BehaviorSubject<boolean>(false);
  
  rowedRackedModules$ = new BehaviorSubject<RackedModule[][] | null>(null);
  isRackImageCaptureInProgress$ = new BehaviorSubject<boolean>(false);
  readonly functionAnalysisLegendItems$ = this.rowedRackedModules$.pipe(
    map(rowedRackedModules => buildFunctionAnalysisLegendItems(rowedRackedModules)),
    shareReplay(1)
  );
  readonly functionAnalysisResidualLabel$ = this.rowedRackedModules$.pipe(
    map(rowedRackedModules => buildFunctionAnalysisResidualLabel(rowedRackedModules)),
    shareReplay(1)
  );
  readonly functionAnalysisCoverageSummary$ = this.rowedRackedModules$.pipe(
    map(rowedRackedModules => buildFunctionAnalysisCoverageSummary(rowedRackedModules)),
    shareReplay(1)
  );
  
  rackOrderChange$ = new Subject<{
    event: CdkDragDrop<ElementRef>,
    newRow: number,
    module: RackedModule
  }>();
  isCurrentRackPropertyOfCurrentUser$ = new BehaviorSubject<boolean>(false);
  isCurrentRackEditable$ = new BehaviorSubject<boolean>(true);
  isCurrentRackPrivate$ = new BehaviorSubject<boolean>(false);
  userRequestedSmallerScale$ = new BehaviorSubject<boolean>(false);
  //
  requestRackEditableStatusChange$ = new Subject<void>();
  requestCreatePatchFromRack$ = new Subject<void>();
  requestRackPrivacyStatusChange$ = new Subject<void>();
  requestRackedModuleRemoval$ = new Subject<RackedModule>();
  requestRackedModuleDuplication$ = new Subject<RackedModule>();
  requestRackedModuleReplaceWithBlank$ = new Subject<RackedModule>();
  requestRackedModuleRowClearing$ = new Subject<RackedModule>();
  requestRackedModulePanelSwitch$ = new Subject<{ rackedModule: RackedModule; panelId: number | null }>();
  requestAddNewRow$ = new Subject<void>();
  requestRemoveRow$ = new Subject<void>();
  
  requestRackedModulesDbSync$ = new Subject<void>(); // updates the backend with the current state of the rack
  //
  
  protected destroyEvent$ = new Subject<void>();
  
  constructor(
    private snackBar: MatSnackBar,
    private userService: UserManagementService,
    private backend: SupabaseService,
    private dialog: MatDialog,
    private router: Router,
    private analytics: AnalyticsService,
  ) {
    super();
    
    // when user requests to remove a row, update data and backend
    this.requestRemoveRow$
      .pipe(
        withLatestFrom(this.singleRackData$),
        map(([_, x]) => {
          x.rows--;
          return x;
        }),
        exhaustMap(x => this.backend.update.rack(x)),
        takeUntil(this.destroy$),
      )
      .subscribe(() => {
          this.analytics.capture('rack.row_removed', { rack_id: this.singleRackData$.value.id });
          this.updateSingleRackData$.next(this.singleRackData$.value.id);
        }
      );
    
    // when user requests to add a new row, update data and backend
    this.requestAddNewRow$
      .pipe(
        withLatestFrom(this.singleRackData$),
        map(([_, x]) => {
          x.rows++;
          return x;
        }),
        exhaustMap(x => this.backend.update.rack(x)),
        takeUntil(this.destroy$),
      )
      .subscribe(() => {
          this.analytics.capture('rack.row_added', { rack_id: this.singleRackData$.value.id });
          this.updateSingleRackData$.next(this.singleRackData$.value.id);
        }
      );
    
    // when user requests to change privacy status of rack, update backend
    this.requestRackPrivacyStatusChange$
      .pipe(
        withLatestFrom(this.singleRackData$),
        map(([_, x]) => {
          x.public = !x.public;
          this.isCurrentRackPrivate$.next(!x.public);
          return x;
        }),
        exhaustMap(x => this.backend.update.rack(x)),
        takeUntil(this.destroy$),
      )
      .subscribe(x => {
        this.analytics.capture('rack.privacy_toggled', { rack_id: this.singleRackData$.value?.id, public: this.singleRackData$.value?.public });
      });
    
    // when user wants to replace a module with blank, replace it with a blank module from manufacturer id 2000
    this.requestRackedModuleReplaceWithBlank$
      .pipe(
        // if racked module HP is bigger than twenty then show snackbar and do not propagate the event
        map((rackedModule) => {
          const effectiveHp = rackedModule.module.hp;
          if (rackedModule.module.standard.id === 0) {
            if (effectiveHp > 20) {
              this.snackBar.open(`"${ rackedModule.module.name }" is ${ effectiveHp } HP — too big to replace with a blank (max 20 HP).`, undefined, {
                duration: 4000,
                panelClass: 'snack-error'
              });
              return [];
            }
          } else if (rackedModule.module.standard.id === 1) {
            // if Intellijel module is bigger than 26 then show snackbar and do not propagate the event
            if (effectiveHp > 26) {
              this.snackBar.open(`"${ rackedModule.module.name }" is ${ effectiveHp } HP — too big to replace with a blank (max 26 HP).`, undefined, {
                duration: 4000,
                panelClass: 'snack-error'
              });
              return [];
            }
          }
          return [rackedModule];
        }),
        filter(x => x.length > 0),
        map(([rackedModule]) => rackedModule),
        withLatestFrom(this.rowedRackedModules$, this.singleRackData$),
        switchMap(([rackedModule, rackModules, rack]) => {
          
          const originalModule: RackedModule = cloneRackData(rackedModule);
          
          this.removeRackedModuleFromRack(rackModules, rackedModule);
          this.rowedRackedModules$.next(rackModules);
          
          return this.backend.delete.rackedModule(rackedModule.rackingData.id).pipe(
            // add the blank module in their old position
            map(() => ({
              row: originalModule.rackingData.row,
              column: originalModule.rackingData.column,
              rackId: rack.id,
              moduleId: calculateBlankIdForSizeAndStandard(
                rackedModule.module.hp,
                rackedModule.module.standard.id
              )
            })),
            switchMap(({row, column, rackId, moduleId}) => this.backend.add.rackModule(moduleId, rackId, row, column)),
            takeUntil(this.destroyEvent$)
          );
        }),
        takeUntil(this.destroyEvent$)
      )
      .subscribe(() => {
        this.analytics.capture('rack.module_replaced_with_blank', { rack_id: this.singleRackData$.value?.id });
        this.updateSingleRackData$.next(this.singleRackData$.value.id);
      });
    
    // when user requests to clear a row, remove all modules from that row and update backend
    this.requestRackedModuleRowClearing$
      .pipe(
        withLatestFrom(this.rowedRackedModules$, this.singleRackData$),
        switchMap(([rackedModule, allRackModule, _rack]) => {
          const rackModules: RackedModule[][] = cloneRackData(allRackModule);
          const modulesInRow: RackedModule[] = cloneRackData(rackModules[rackedModule.rackingData.row]);
          
          if (modulesInRow && modulesInRow.length > 0) {
            modulesInRow.forEach(module => {
              this.removeRackedModuleFromRack(rackModules, module);
            });
            
            // Update the UI before submitting to the backend. This is currently buggy in the user interface.
            // The goal is to perform all changes without reloading the entire page to avoid layout shifting and flashing.
            
            return forkJoin(modulesInRow.map(module => this.backend.delete.rackedModule(module.rackingData.id))).pipe(
              tap(() => SharedConstants.successCustom(this.snackBar, `${ modulesInRow.length } module${ modulesInRow.length === 1 ? '' : 's' } unracked from this row.`)),
              catchError((err) => {
                console.error(`Error clearing row: ${ err }`);
                SharedConstants.errorCustom(this.snackBar, 'Row clear failed — the database returned an error. Refresh the page and try again.');
                  return of(undefined);
                }
              )
            );
          } else {
            SharedConstants.errorCustom(this.snackBar, 'This row type cannot be cleared.');
            
          }
          
          return of(undefined);
        }),
        withLatestFrom(this.singleRackData$),
        takeUntil(this.destroyEvent$)
      )
      .subscribe(([_, rackData]) => {
        this.analytics.capture('rack.row_cleared', { rack_id: rackData?.id });
        this.singleRackData$.next(rackData);
      });
    
    // when user requests to download rack image, download it using HTML2Canvas
    this.downloadRackImageToUserComputer$.pipe(
      tap(() => this.snackBar.open('⏲️ Generating image...', undefined, {duration: 4000})),
      withLatestFrom(this.currentDownloadElementRef$),
      switchMap(([_, references]) => {
        return this.generateRackJpegWithoutAnalysisOverlays$(references.screen.nativeElement);
      }),
      withLatestFrom(this.singleRackData$),
      takeUntil(this.destroyEvent$)
    )
      .subscribe(
        ([imageData, rackData]) => {
          
          const link = document.createElement('a');
          const downloadName = `${ rackData.name } by ${ rackData.author.username } - ${ rackData.hp } HP - ${ rackData.rows } rows - ${ new Date().toLocaleDateString() }`;
          link.download = `${ downloadName }.jpeg`;
          // replace any characters that make use problems in the download filename
          link.download = link.download.replace(/[/\\?%*:|"<>]/g, '-');
          link.href = imageData;
          link.click();
          link.remove();
          
          this.analytics.capture('rack.image_downloaded', { rack_id: rackData?.id });
          this.snackBar.open(`Image downloaded: ${  downloadName}`, undefined, {duration: 5000});
        }
      );
    
    // when user requests to update rack image preview, generate it, and upload to backend
    this.updateRackImagePreview$.pipe(
      tap(() => this.snackBar.open('⏲️ Generating image: please wait, this can take a few moments...', undefined, {duration: 20000})),
      withLatestFrom(this.currentDownloadElementRef$),
      // generate the image, and convert it to a Blob
      switchMap(([_, references]) => {
        return this.generateRackJpegWithoutAnalysisOverlays$(references.screen.nativeElement).pipe(
          // Convert the image data to a Blob
          map(imageData => {
            const byteCharacters = atob(imageData.split(',')[1]);
            const byteArray = new Uint8Array(Array.from(byteCharacters, c => c.charCodeAt(0)));
            return new Blob([byteArray], {type: 'image/jpeg'});
          })
        );
      }),
      // Upload the Blob to the backend
      switchMap(imageBlob => {
        const fileName = `${ this.singleRackData$.value.id }`;
        return this.backend.storage.uploadRackImage(imageBlob, `${ fileName }.jpeg`);
      }),
      withLatestFrom(this.singleRackData$),
      // Update the rack data with the new image filename before deleting the previous file.
      switchMap(([uploadResult, rackData]) => {
        const updatedRackData: Rack = {...rackData, image: uploadResult};
        const previousImage = rackData.image;
        return this.backend.update.rack(updatedRackData).pipe(
          map(() => ({updatedRackData, previousImage}))
        );
      }),
      // remove the old image from the backend after the DB update succeeds
      switchMap(({updatedRackData, previousImage}): Observable<Rack> => {
        if (!previousImage) {
          return of(updatedRackData);
        }

        return this.backend.storage.deleteRackImage(previousImage).pipe(
          map(() => updatedRackData),
          catchError((error) => {
            const status = (error as {status?: number | string; statusCode?: number | string} | undefined)?.status
              ?? (error as {status?: number | string; statusCode?: number | string} | undefined)?.statusCode;
            const message = error instanceof Error
              ? error.message
              : String((error as {message?: unknown} | undefined)?.message ?? '');

            if (status === 404 || status === '404' || /not found/i.test(message)) {
              console.warn('Rack preview delete skipped because the previous image was already missing.', error);
              return of(updatedRackData);
            }

            throw error;
          })
        );
      }),
      tap((updatedRackData: Rack) => this.singleRackData$.next(updatedRackData)),
      takeUntil(this.destroyEvent$),
      catchError((err) => {
        console.error('Failed to update rack preview image:', err);
        SharedConstants.errorCustom(this.snackBar, 'Failed to update preview image. Please try again.');
        return EMPTY;
      })
    )
      .subscribe((updatedRackData: Rack) => {
        SharedConstants.successCustom(this.snackBar, `Preview image updated for "${ updatedRackData.name }".`);
        this.analytics.capture('rack.preview_image_updated', { rack_id: updatedRackData?.id });
        this.updateSingleRackData$.next(updatedRackData.id);
      });
    
    // when user toggles locked status of rack, update backend
    this.requestRackEditableStatusChange$
      .pipe(
        withLatestFrom(this.singleRackData$, this.isCurrentRackEditable$),
        map(([_, x, y]) => {
          const editable: boolean = !y;
          if (editable) {
            this.formData.name.control.reset(x.name, {emitEvent: false});
          }
          this.isCurrentRackEditable$.next(editable);
          x.locked = !editable;
          return x;
        }),
        switchMap(x => this.backend.update.rack(x)),
        takeUntil(this.destroy$),
      )
      .subscribe(x => {
        this.analytics.capture('rack.lock_toggled', { rack_id: this.singleRackData$.value?.id, locked: this.singleRackData$.value?.locked });
      });

    this.requestCreatePatchFromRack$
      .pipe(
        withLatestFrom(this.singleRackData$, this.isCurrentRackPropertyOfCurrentUser$),
        switchMap(([_, rack, isOwner]) => {
          if (!rack) {
            SharedConstants.errorCustom(this.snackBar, 'Rack data is still loading. Try again in a moment.');
            return EMPTY;
          }

          if (!isOwner) {
            SharedConstants.errorCustom(this.snackBar, 'Only the rack owner can start a linked patch from this rack.');
            return EMPTY;
          }

          return this.askForConfirmationWhenCreatingPatchFromRack(rack);
        }),
        switchMap((rack) => {
          const generatedPatchName = generatePatchName();
          this.snackBar.open(`Creating "${ generatedPatchName }"…`, undefined);

          return this.backend.add.patch({
            name: generatedPatchName,
            public: true,
            linked_rack_id: rack.id
          }).pipe(
            map((response) => ({
              rack,
              generatedPatchName,
              createdPatchId: extractCreatedPatchId(response),
              createdPatchPublicId: extractCreatedPublicId(response)
            })),
            catchError((error) => {
              if (isLinkedRackSchemaMissingError(error)) {
                SharedConstants.errorCustom(this.snackBar, LINKED_RACK_PENDING_CREATE_MESSAGE);
              } else {
                console.error('Failed to create linked patch from rack:', error);
                SharedConstants.errorCustom(this.snackBar, 'Patch creation failed — check your connection and try again.');
              }

              return EMPTY;
            })
          );
        }),
        takeUntil(this.destroyEvent$)
      )
      .subscribe(({rack, generatedPatchName, createdPatchId, createdPatchPublicId}) => {
        this.analytics.capture('rack.linked_patch_created', { rack_id: rack?.id, patch_id: createdPatchId });
        const target = createdPatchPublicId
          ? ['/patches', createdPatchPublicId]
          : ['/patches/details', createdPatchId];
        this.router.navigate(target);
        SharedConstants.successCustom(this.snackBar, `"${ generatedPatchName }" is ready with "${ rack.name }" linked.`);
      });
    
    this.formData.name.control.valueChanges
      .pipe(
        filter(() => !!this.singleRackData$.value),
        filter(() => this.formData.name.control.valid),
        takeUntil(this.destroy$)
      )
      .subscribe(input => this.singleRackData$.value.name = input ?? '');
    
    // Auto-save rack name from inline editor while edit mode is open.
    this.formData.name.control.valueChanges
      .pipe(
        debounceTime(800),
        distinctUntilChanged(),
        withLatestFrom(this.singleRackData$),
        filter(([_, rack]) => !!rack),
        map(([_, rack]) => rack as Rack),
        filter(() => this.formData.name.control.valid),
        switchMap(rack =>
          this.backend.update.rack({...rack}).pipe(
            tap(() => this.analytics.capture('rack.name_changed', { rack_id: rack?.id })),
            catchError(err => {
              console.error('Failed to auto-save rack name:', err);
              SharedConstants.errorCustom(this.snackBar, 'Failed to save — check your connection and try again.');
              return EMPTY;
            })
          )
        ),
        takeUntil(this.destroy$)
      )
      .subscribe();
    
    this.updateSingleRackData$
      .pipe(
        tap(() => {
          this.isRackDataLoading$.next(true);
          this.rowedRackedModules$.next(null);
          this.rackDetailUnavailableMessage$.next(null);
        }),
        switchMap(x => this.usePublicDetailReads
          ? this.backend.GET.publicRackWithId(x)
          : this.backend.GET.rackWithId(x)),
        catchError((err) => {
          console.error('Failed to load rack details:', err);
          this.singleRackData$.next(undefined);
          this.rowedRackedModules$.next([]);
          this.isRackDataLoading$.next(false);
          this.rackDetailUnavailableMessage$.next(this.buildUnavailableMessage());
          SharedConstants.errorCustom(this.snackBar, 'Failed to load this rack. Refresh the page and try again.');
          return EMPTY;
        }),
        takeUntil(this.destroy$),
      )
      .subscribe(x => {
        if (!x?.data) {
          this.singleRackData$.next(undefined);
          this.rowedRackedModules$.next([]);
          this.isRackDataLoading$.next(false);
          this.rackDetailUnavailableMessage$.next(this.buildUnavailableMessage());
          return;
        }

        this.singleRackData$.next(x.data);
      });

    // Token-based fetch. Always goes through the SECURITY DEFINER RPC so a
    // valid token works for both anonymous and authenticated viewers.
    this.updateSingleRackByPublicId$
      .pipe(
        tap(() => {
          this.isRackDataLoading$.next(true);
          this.rowedRackedModules$.next(null);
          this.rackDetailUnavailableMessage$.next(null);
        }),
        switchMap(token => this.backend.GET.rackByPublicId(token)),
        catchError((err) => {
          console.error('Failed to load rack by token:', err);
          this.singleRackData$.next(undefined);
          this.rowedRackedModules$.next([]);
          this.isRackDataLoading$.next(false);
          this.rackDetailUnavailableMessage$.next(this.buildUnavailableMessage());
          return EMPTY;
        }),
        takeUntil(this.destroy$),
      )
      .subscribe(x => {
        if (!x?.data) {
          this.singleRackData$.next(undefined);
          this.rowedRackedModules$.next([]);
          this.isRackDataLoading$.next(false);
          this.rackDetailUnavailableMessage$.next(this.buildUnavailableMessage());
          return;
        }
        this.singleRackData$.next(x.data);
      });
    
    // sync editable, privacy and form state whenever rack data changes
    this.singleRackData$
      .pipe(
        filter(x => !!x),
        takeUntil(this.destroy$),
      )
      .subscribe(rack => {
        this.isCurrentRackEditable$.next(!rack.locked);
        this.isCurrentRackPrivate$.next(!rack.public);
        this.formData.name.control.reset(rack.name, {emitEvent: false});

        // Fire rack.viewed once per service instance (i.e. once per route activation).
        // Re-fires are suppressed so refreshes within the same session don't double-count.
        if (!this.rackViewedFired) {
          this.rackViewedFired = true;
          const isOwner = this.isCurrentRackPropertyOfCurrentUser$.value;
          this.analytics.capture('rack.viewed', {
            rack_id:  rack.id,
            is_owner: isOwner
          });
        }
      });
    
    // when updated rack data is received, update rowedRackedModules$
    this.singleRackData$.pipe(
      tap((rack) => {
        if (!rack) {
          this.rowedRackedModules$.next([]);
          this.isRackDataLoading$.next(false);
        }
      }),
      filter(x => !!x),
      switchMap((rack) => this.backend.get.rackedModules(rack.id).pipe(
        map((rackedModules) => ({
          rackedModules,
          rack
        })),
        catchError((err) => {
          console.error('Failed to load rack modules:', err);
          this.rowedRackedModules$.next([]);
          this.isRackDataLoading$.next(false);
          SharedConstants.errorCustom(this.snackBar, 'Failed to load rack modules. Refresh the page and try again.');
          return EMPTY;
        })
      )),
      takeUntil(this.destroy$),
    )
      .subscribe(({rackedModules, rack}: {rackedModules: RackedModule[]; rack: Rack}) => {
        // create a 2d array of racked modules and sort them by row
        const rowedRackedModules = buildRowedModulesArray(rackedModules, rack);
        this.rowedRackedModules$.next(rowedRackedModules);
        this.isRackDataLoading$.next(false);
      });
    
    // on order change, update local rack data and backend
    this.rackOrderChange$
      .pipe(
        withLatestFrom(this.rowedRackedModules$, this.singleRackData$),
        takeUntil(this.destroy$),
      )
      .subscribe(([
                    {
                      event,
                      newRow,
                      module
                    }, rackModules, rack
                  ]) => {
        
        
        const movingUnrackedModuleToUnrackedPosition: boolean = module.rackingData.row === null && newRow > rack.rows - 1;
        if (movingUnrackedModuleToUnrackedPosition) {
          // nothing to do, not moving unracked module
          this.snackBar.open(
            `Not moving unracked module. Please move it to a suitable position inside your rack above.
                Your rack has ${ rack.rows } rows`,
            null,
            {duration: 8000});
          
        } else {
          
          // update array
          if (newRow === module.rackingData.row) {
            this.transferInRow(rackModules, newRow, event);
          } else {
            this.transferBetweenRows(rackModules, module, event, newRow);
          }
          
          this.rowedRackedModules$.next([...rackModules]);
          this.analytics.capture('rack.module_moved', { rack_id: rack.id });
          this.requestRackedModulesDbSync$.next();
        }
        
      });
    
    // track if rack is property of current user
    combineLatest([
      this.userService.loggedUser$,
      this.singleRackData$
    ])
      .pipe(
        tap(() => this.isCurrentRackPropertyOfCurrentUser$.next(false)),
        filter(([user, rackData]) => (!!user && !!rackData)),
        takeUntil(this.destroy$)
      )
      .subscribe(([user, rackData]) => {
        this.isCurrentRackPropertyOfCurrentUser$.next(user.id === rackData.author.id);
      });
    
    // when request to remove module is received, find module and remove it, then update the local rack data
    this.requestRackedModuleRemoval$
      .pipe(
        withLatestFrom(this.rowedRackedModules$),
        switchMap(([rackedModule, rackModules]) => {
          const snapshot: RackedModule[][] = cloneRackData(rackModules);
          const moduleId = rackedModule.module.id;
          const rackId = this.singleRackData$.value?.id;
          
          this.removeRackedModuleFromRack(rackModules, rackedModule);
          this.rowedRackedModules$.next(rackModules);
          
          // this.requestRackedModulesDbSync$.next();
          // this does not work, because the rack data are upserted, so we need to delete in the backend manually
          
          return this.backend.delete.rackedModule(rackedModule.rackingData.id).pipe(
            map(() => ({ moduleId, rackId })),
            catchError(err => {
              console.error(`Error removing racked module: ${ err }`);
              this.rowedRackedModules$.next(snapshot);
              SharedConstants.errorCustom(this.snackBar, 'Failed to remove module — changes reverted. Check your connection and try again.');
              return of(undefined);
            })
          );
        }),
        filter(x => x !== undefined),
        withLatestFrom(this.singleRackData$),
        takeUntil(this.destroy$)
      )
      .subscribe(([result, rackData]) => {
        if (result) {
          this.analytics.capture('rack.module_removed', {
            rack_id:   result.rackId,
            module_id: result.moduleId
          });
        }
        this.singleRackData$.next(rackData);
      });
    
    // when request to duplicate module is received, find module and duplicate it, then update the local rack data
    this.requestRackedModuleDuplication$
      .pipe(
        withLatestFrom(this.rowedRackedModules$),
        takeUntil(this.destroy$)
      )
      .subscribe(([rackedModule, rackModules]) => {
        this.duplicateModule(rackModules, rackedModule);
        this.rowedRackedModules$.next(rackModules);
        this.analytics.capture('rack.module_duplicated', { rack_id: this.singleRackData$.value?.id, module_id: rackedModule.module?.id });
        this.requestRackedModulesDbSync$.next();
      });
    
    // when request to switch panel for a rack module is received, update local state then persist to backend
    this.requestRackedModulePanelSwitch$
      .pipe(
        withLatestFrom(this.rowedRackedModules$),
        switchMap(([{rackedModule, panelId}, rackModules]) => {
          if (rackModules) {
            for (const row of rackModules) {
              const target = row.find(m => m.rackingData.id === rackedModule.rackingData.id);
              if (target) {
                target.rackingData.selectedPanelId = panelId;
                break;
              }
            }
            this.rowedRackedModules$.next(rackModules);
          }
          return this.backend.update.rackModulePanel(rackedModule.rackingData.id, panelId).pipe(
            tap(() => this.analytics.capture('rack.module_panel_switched', { rack_id: this.singleRackData$.value?.id, module_id: rackedModule.module?.id, panel_id: panelId })),
            catchError((err) => {
              console.error(`Error updating rack module panel: ${ err }`);
              this.snackBar.open(SharedConstants.messages.operationFailed, undefined, {duration: 8000, panelClass: 'snack-error'});
              return of(undefined);
            })
          );
        }),
        takeUntil(this.destroy$)
      )
      .subscribe();
    
    // on request to sync rack data with backend, update backend
    this.requestRackedModulesDbSync$
      .pipe(
        withLatestFrom(this.rowedRackedModules$, this.singleRackData$),
        switchMap(([_, rackModules, rack]) => {
          const snapshot: RackedModule[][] = cloneRackData(rackModules);
          return this.callBackendToUpdateModulesOfRack(rackModules, rack).pipe(
            catchError((err) => {
              console.error(`Error syncing rack data with backend: ${ err }`);
              this.rowedRackedModules$.next(snapshot);
              SharedConstants.errorCustom(this.snackBar, 'Failed to save rack changes — changes reverted. Check your connection and try again.');
              return of(undefined);
            })
          );
        }),
        filter(x => !!x),
        takeUntil(this.destroyEvent$)
      )
      .subscribe(() => {
        // SharedConstants.successSaveShort(this.snackBar);
      });
    
    // on rack delete, ask for confirmation and delete rack on backend
    this.deleteRack$
      .pipe(
        switchMap((rack) => {
          
          const data: ConfirmDialogDataInModel = {
            title: `Delete "${ rack.name }"?`,
            description: 'This action cannot be undone.',
            positive: {label: 'Delete', theme: 'warning'}
          };
          
          return this.dialog.open(
            ConfirmDialogComponent,
            {
              data,
              disableClose: false
            }
          )
            .afterClosed()
            .pipe(
              tap((x: ConfirmDialogDataOutModel) => {
                if (!x?.answer) SharedConstants.infoCustom(this.snackBar, 'No changes made.');
              }),
              filter((x: ConfirmDialogDataOutModel) => !!x?.answer),
              map(() => rack)
            );
        }),
        switchMap(rack => this.backend.delete.modulesOfRack(rack.id).pipe(map(() => rack))),
        switchMap(rack => this.backend.delete.commentsForRack(rack.id).pipe(map(() => rack))),
        switchMap(rack => rack.image ? this.backend.storage.deleteRackImage(rack.image).pipe(map(() => rack)) : of(rack)),
        switchMap(rack => this.backend.delete.userRack(rack.id).pipe(map(() => rack))),
        takeUntil(this.destroyEvent$)
      )
      .subscribe((rack) => {
        this.router.navigate(['/user/area']);
        this.analytics.capture('rack.deleted', { rack_id: rack.id });
        SharedConstants.successCustom(this.snackBar, `"${ rack.name }" has been deleted.`);
      });
    
    // on rack duplicate, ask for confirmation and duplicate rack on the backend, including modules and their positions
    this.duplicateRack$
      .pipe(
        switchMap(() => this.askForConfirmationWhenDuplicatingRack()),
        withLatestFrom(this.singleRackData$),
        tap(([_, rack]) => this.snackBar.open(`Duplicating "${ rack.name }"…`, undefined,)),
        map(([_, rack]) => rack),
        withLatestFrom(this.userService.loggedUser$),
        // create new rack, to the current user, with the same modules, but with an_updated_name,
        switchMap(([rack, user]) => {
          // create new rack on the backend,with a new author: current user
          return this.createNewRackOnBackendForCurrentUser(user.id).pipe(
            map(x => ({newRackId: x.data[0].id, newRackPublicId: x.data[0].public_id, originalName: rack.name}))
          );
        }),
        // wait for the new rack id to arrive, then update the rack modules with the new rack id,
        switchMap(({newRackId, newRackPublicId, originalName}) => {
          const newUrl = newRackPublicId
            ? `/racks/${ newRackPublicId }`
            : `/racks/details/${ newRackId }`;
          history.replaceState({}, '', newUrl);

          const rackModules = this.removeInformationFromModulesOfCurrentRack(newRackId);

          // load the new empty rack — prefer token, fall back to numeric id.
          if (newRackPublicId) {
            this.updateSingleRackByPublicId$.next(newRackPublicId);
          } else {
            this.updateSingleRackData$.next(newRackId);
          }
          return this.singleRackData$.pipe(
            filter(x => x.id === newRackId),
            take(1),
            map(() => ({rackModules, originalName})),
          );
          }
        ),
        // wait for the new empty rack to arrive, then add the modules to the new rack
        switchMap(({rackModules, originalName}) => this.callBackendToUpdateModulesOfRack(rackModules, this.singleRackData$.value).pipe(
          map(() => originalName)
        )),
        takeUntil(this.destroyEvent$)
      )
      .subscribe((originalName) => {
        const rackId = this.singleRackData$.value?.id;
        this.analytics.capture('rack.duplicated', { rack_id: rackId });
        SharedConstants.successCustom(this.snackBar, `"${ originalName }" duplicated successfully.`);
      });
    
    // add a module from bottom picker
    this.addModuleToRack$
      .pipe(
        exhaustMap(module => this.backend.add.rackModule(
          module.id,
          this.singleRackData$.value.id
        ).pipe(map(() => module))),
        takeUntil(this.destroyEvent$)
      )
      .subscribe((module) => {
        this.analytics.capture('rack.module_added', {
          rack_id:   this.singleRackData$.value?.id,
          module_id: module.id
        });
        SharedConstants.successCustom(this.snackBar, `"${ module.name }" added to "${ this.singleRackData$.value.name }". Drag it into a row to place it.`);
        this.moduleAddedFromPicker$.next(module);
        this.updateSingleRackData$.next(this.singleRackData$.value.id);
      });

    // quick-add blank panel directly to a row
    this.addBlankToRow$
      .pipe(
        exhaustMap(({rowId, hp}) => {
          const rackId = this.singleRackData$.value?.id;
          if (!rackId) return EMPTY;
          const row = this.rowedRackedModules$.value?.[rowId] ?? [];
          const column = row.length;
          const blankId = calculateBlankIdForSizeAndStandard(hp);
          if (blankId === -1) return EMPTY;
          return this.backend.add.rackModule(blankId, rackId, rowId, column).pipe(
            tap(() => this.analytics.capture('rack.blank_panel_added', { rack_id: rackId, hp }))
          );
        }),
        takeUntil(this.destroyEvent$)
      )
      .subscribe(() => {
        this.updateSingleRackData$.next(this.singleRackData$.value.id);
      });
    
    
    // when rack data changes update statistics
    this.singleRackData$.pipe(
      tap(x => {
        if (!x) { this.rackStatistics$.next(null); }
      }),
      filter(x => !!x),
      switchMap(() => this.rowedRackedModules$.pipe(filter(y => !!y), take(1))),
      withLatestFrom(this.singleRackData$),
      takeUntil(this.destroy$)
    )
      .subscribe(([rows]) => this.rackStatistics$.next(buildRackStatistics(rows)));
    
  }

  setPublicDetailMode(enabled: boolean) {
    this.usePublicDetailReads = enabled;
  }

  private buildUnavailableMessage(): string {
    return this.usePublicDetailReads
      ? `This rack isn't publicly available. If you have a share link from the owner, use that to view it.`
      : 'This rack could not be loaded.';
  }
  
  private removeInformationFromModulesOfCurrentRack(newlyCreatedRackId: number) {
    const rackModules: RackedModule[][] = this.rowedRackedModules$.value;
    
    rackModules.forEach(row => {
      row.forEach(module => {
        // update rack id of each module to the newly created rack id
        module.rackingData.rackid = newlyCreatedRackId;
        // we are creating new rack modules, so we need to remove the id,
        // otherwise the backend will think we are updating the modules
        module.rackingData.id = undefined;
        
      });
    });
    return rackModules;
  }
  
  private createNewRackOnBackendForCurrentUser(_userId: string) {
    return this.backend.add.rack(
      {
        name: this.bumpUpVersionInNameOfOfRack(),
        hp: this.singleRackData$.value.hp,
        rows: this.singleRackData$.value.rows,
        public: true,
        locked: false
      }
    );
  }
  
  private askForConfirmationWhenDuplicatingRack() {
    const data: ConfirmDialogDataInModel = {
      title: 'Duplicate this rack?',
      description: 'A copy of this rack will be created. You can rename and edit it afterwards.',
      positive: {label: 'Confirm'}
    };
    
    return this.dialog.open(
      ConfirmDialogComponent,
      {
        data,
        disableClose: false
      }
    )
      .afterClosed()
      .pipe(
        tap((x: ConfirmDialogDataOutModel) => {
          if (!x?.answer) SharedConstants.infoCustom(this.snackBar, 'No changes made.');
        }),
        filter((x: ConfirmDialogDataOutModel) => !!x?.answer)
      );
  }

  private askForConfirmationWhenCreatingPatchFromRack(rack: RackMinimal) {
    const data: ConfirmDialogDataInModel = {
      title: `Start a patch from "${ rack.name }"?`,
      description: 'We will generate the name automatically, link this rack, and open the patch immediately so you can start working.',
      positive: {label: 'Create patch', theme: 'positive'}
    };

    return this.dialog.open(
      ConfirmDialogComponent,
      {
        data,
        disableClose: false
      }
    )
      .afterClosed()
      .pipe(
        tap((x: ConfirmDialogDataOutModel) => {
          if (!x?.answer) SharedConstants.infoCustom(this.snackBar, 'No patch created.');
        }),
        filter((x: ConfirmDialogDataOutModel) => !!x?.answer),
        map(() => rack)
      );
  }

  // bump up version number in name of rack if it has one, otherwise add "V2" — used when duplicating
  private bumpUpVersionInNameOfOfRack() {
    const originalName = this.singleRackData$.value.name;
    
    // if original name ends with version "V" something you with a number,bump up the number and update the variable
    const versionRegex = /V(\d+)$/;
    const versionMatch = originalName.match(versionRegex);
    if (versionMatch) {
      const versionNumber = parseInt(versionMatch[1], 10);
      return originalName.replace(versionRegex, `V${ versionNumber + 1 }`);
    } else {
      // if original name does not end with version "V" something you with a number, add version "V2"
      return `${ originalName } V2`;
    }
  }
  
  private callBackendToUpdateModulesOfRack(rackModules: RackedModule[][], rack: Rack) {
    return this.backend.update.rackedModules(rackModules.flatMap(row => row))
      .pipe(
        tap(() => {
          if (isAnyModuleWithoutRackingId(rackModules)) {
            this.singleRackData$.next(rack);
          }
        })
      );
  }
  
  private generateRackJpeg$(el: HTMLElement) {
    return from(domToJpeg(el, {
      quality: 0.9,
      backgroundColor: '#ffffff',
      width: el.scrollWidth,
      height: el.scrollHeight,
    }));
  }

  private generateRackJpegWithoutAnalysisOverlays$(el: HTMLElement) {
    return defer(() => {
      const previousAnalysisMode = this.analysisMode$.value ?? RACK_ANALYSIS_MODES.off;
      this.analysisMode$.next(RACK_ANALYSIS_MODES.off);
      this.isRackImageCaptureInProgress$.next(true);

      return of(undefined).pipe(
        // Rack analysis overlays animate out over ~320ms, so wait for the rendered UI to settle before capture.
        delay(RackDetailDataService.imageCaptureOverlayResetDelayMs),
        switchMap(() => this.generateRackJpeg$(el)),
        finalize(() => {
          this.isRackImageCaptureInProgress$.next(false);
          if (this.analysisMode$.value === RACK_ANALYSIS_MODES.off) {
            this.analysisMode$.next(previousAnalysisMode);
          }
        })
      );
    });
  }
  
  private transferInRow(rackedModules: RackedModule[][], row: number, event: CdkDragDrop<ElementRef>): void {
    this.updateModulesColumnIds(rackedModules, row);
    moveItemInArray(rackedModules[row], event.previousIndex, event.currentIndex);
    // update module position
    this.updateModulesColumnIds(rackedModules, row);
  }
  
  private updateModulesColumnIds(rackModules: RackedModule[][], row: number | undefined): void {
    if (row === undefined) {
      return undefined; // do nothing if rack has not been placed yet
    }
    const modulesInRow: RackedModule[] | undefined = rackModules[row];
    
    if (modulesInRow) {
      modulesInRow.forEach((module, index) => {
        module.rackingData.column = index;
        module.rackingData.row = row;
      });
    }
    
  }
  
  private transferBetweenRows(rackedModules: RackedModule[][], rackedModule: RackedModule, event: CdkDragDrop<ElementRef>, newRow: number): void {
    // remove item from old array
    this.removeRackedModuleFromRack(rackedModules, rackedModule);
    
    // add item to new array
    rackedModules[newRow].splice(event.currentIndex, 0, rackedModule);
    this.updateModulesColumnIds(rackedModules, newRow);
    
  }
  
  private removeRackedModuleFromRack(rackedModules: RackedModule[][], toRemove: RackedModule): void {
    this.updateModulesColumnIds(rackedModules, toRemove.rackingData.row);
    
    // undefined accounts for unracked modules
    const modulesOfRow: RackedModule[] | undefined = rackedModules[toRemove.rackingData.row];
    if (modulesOfRow) {
      // module was previously racked
      modulesOfRow.splice(toRemove.rackingData.column, 1);
    } else {
      // module has not been racked yet
      const lastRow: RackedModule[] = rackedModules[rackedModules.length - 1];
      
      // remove unracked module from last row
      const unrackedModuleRowIndex: number = lastRow.findIndex(module => module.rackingData.id === toRemove.rackingData.id);
      lastRow.splice(unrackedModuleRowIndex, 1);
      
      if (lastRow.length === 0) {
        // remove empty row
        rackedModules.splice(rackedModules.length - 1, 1);
      }
    }
    
    this.updateModulesColumnIds(rackedModules, toRemove.rackingData.row);
  }
  
  private duplicateModule(rackedModules: RackedModule[][], rackedModule: RackedModule): void {
    const deepCopiedRackedModule: RackedModule = cloneRackData(rackedModule);
    
    deepCopiedRackedModule.rackingData.id = undefined;
    
    const moduleRow: RackedModule[] = rackedModules[deepCopiedRackedModule.rackingData.row];
    
    if (moduleRow) {
      // insert deep copied module into the array close to the original module
      const columnCoordinate: number = deepCopiedRackedModule.rackingData.column + 1;
      moduleRow.splice(
        columnCoordinate, 0, deepCopiedRackedModule
      );
    } else {
      // module to duplicate has not been racked yet
      // add deep copied module to the last row
      rackedModules[rackedModules.length - 1].push(deepCopiedRackedModule);
    }
    this.updateModulesColumnIds(rackedModules, deepCopiedRackedModule.rackingData.row);
  }
  
}
