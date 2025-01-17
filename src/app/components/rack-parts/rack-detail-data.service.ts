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
import _ from 'lodash';
import {
  BehaviorSubject,
  combineLatest,
  delay,
  forkJoin,
  from,
  of,
  ReplaySubject,
  Subject
} from 'rxjs';
import {
  catchError,
  filter,
  map,
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
  InputDialogComponent,
  InputDialogDataInModel,
  InputDialogDataOutModel
} from "../../shared-interproject/dialogs/input-dialog/input-dialog.component";
import {
  FormControl,
  Validators
} from "@angular/forms";
import { FormTypes } from "../../shared-interproject/components/@smart/mat-form-entity/form-element-models";
import domtoimage from 'dom-to-image';
import { MatDialog } from "@angular/material/dialog";


@Injectable()
export class RackDetailDataService extends SubManager {
  updateSingleRackData$ = new ReplaySubject<number>();
  singleRackData$ = new BehaviorSubject<Rack | undefined>(undefined);
  deleteRack$ = new Subject<RackMinimal>();
  duplicateRack$ = new Subject<RackMinimal>();
  renameCurrentRack$ = new Subject<void>();
  // @ViewChild('screen') screen: ElementRef;
  // @ViewChild('canvas') canvas: ElementRef;
  downloadRackImageToUserComputer$ = new Subject<void>();
  updateRackImagePreview$ = new Subject<void>();
  
  //
  currentDownloadElementRef$: BehaviorSubject<{
    screen: ElementRef,
  } | undefined> = new BehaviorSubject<{
    screen: ElementRef,
  }>(undefined);
  
  addModuleToRack$ = new Subject<MinimalModule>();
  shouldShowPanelImages$ = new BehaviorSubject<boolean>(true);
  showModuleCounters$ = new BehaviorSubject<boolean>(true);
  // name and value
  rackStatistics$ = new BehaviorSubject<{
    name: string,
    value: string
  }[] | null>(null);
  
  rowedRackedModules$ = new BehaviorSubject<RackedModule[][] | null>(null);
  
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
  requestRackPrivacyStatusChange$ = new Subject<void>();
  requestRackedModuleRemoval$ = new Subject<RackedModule>();
  requestRackedModuleDuplication$ = new Subject<RackedModule>();
  requestRackedModuleReplaceWithBlank$ = new Subject<RackedModule>();
  requestRackedModuleRowClearing$ = new Subject<RackedModule>();
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
        switchMap(x => this.backend.update.rack(x)),
        takeUntil(this.destroy$),
      )
      .subscribe(() => {
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
        switchMap(x => this.backend.update.rack(x)),
        takeUntil(this.destroy$),
      )
      .subscribe(() => {
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
        switchMap(x => this.backend.update.rack(x)),
        takeUntil(this.destroy$),
      )
      .subscribe();
    
    // when user wants to replace a module with blank, replace it with a blank module from manufacturer id 2000
    this.requestRackedModuleReplaceWithBlank$
      .pipe(
        // if racked module HP is bigger than twenty then show snackbar and do not propagate the event
        map((rackedModule) => {
          if (rackedModule.module.standard.id === 0) {
            if (rackedModule.module.hp > 20) {
              this.snackBar.open('This module is too big to be replaced with a blank.', undefined, {
                duration: 2000
              });
              return [];
            }
          } else if (rackedModule.module.standard.id === 1) {
            // if Intellijel module is bigger than 26 then show snackbar and do not propagate the event
            if (rackedModule.module.hp > 26) {
              this.snackBar.open('This module is too big to be replaced with a blank.', undefined, {
                duration: 2000
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
          
          const originalModule: RackedModule = _.cloneDeep(rackedModule);
          
          this.removeRackedModuleFromRack(rackModules, rackedModule);
          this.rowedRackedModules$.next(rackModules);
          
          return this.backend.delete.rackedModule(rackedModule.rackingData.id).pipe(
            // add the blank module in their old position
            map(() => ({
              row: originalModule.rackingData.row,
              column: originalModule.rackingData.column,
              rackId: rack.id,
              moduleId: this.calculateBlankIdForSizeAndStandard(
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
      .subscribe(() => this.updateSingleRackData$.next(this.singleRackData$.value.id));
    
    // when user requests to clear a row, remove all modules from that row and update backend
    this.requestRackedModuleRowClearing$
      .pipe(
        withLatestFrom(this.rowedRackedModules$, this.singleRackData$),
        switchMap(([rackedModule, allRackModule, rack]) => {
          const rackModules: RackedModule[][] = _.cloneDeep(allRackModule);
          const modulesInRow: RackedModule[] = _.cloneDeep(rackModules[rackedModule.rackingData.row]);
          
          if (modulesInRow && modulesInRow.length > 0) {
            modulesInRow.forEach(module => {
              this.removeRackedModuleFromRack(rackModules, module);
            });
            
            // Update the UI before submitting to the backend. This is currently buggy in the user interface.
            // The goal is to perform all changes without reloading the entire page to avoid layout shifting and flashing.
            
            return forkJoin(modulesInRow.map(module => this.backend.delete.rackedModule(module.rackingData.id))).pipe(
              tap(() => SharedConstants.successCustom(this.snackBar, `Removed ${ modulesInRow.length } modules`)),
              catchError((err) => {
                console.error(`Error clearing row: ${ err }`);
                SharedConstants.errorCustom(this.snackBar, 'Error clearing row, refresh the page and try again');
                  return of(undefined);
                }
              )
            );
          } else {
            SharedConstants.errorCustom(this.snackBar, 'Not applicable to this row');
            
          }
          
          return of(undefined);
        }),
        withLatestFrom(this.singleRackData$),
        takeUntil(this.destroyEvent$)
      )
      // .subscribe(() => this.updateSingleRackData$.next(this.singleRackData$.value.id));
      .subscribe(([_, rackData]) => {
        this.singleRackData$.next(rackData);
      });
    
    // when user requests to download rack image, download it using HTML2Canvas
    this.downloadRackImageToUserComputer$.pipe(
      tap(() => this.snackBar.open('⏲️ Generating image...', undefined, {duration: 4000})),
      withLatestFrom(this.currentDownloadElementRef$),
      switchMap(([_, references]) => from(
        domtoimage.toJpeg(<any>references.screen.nativeElement, {
          quality: 0.9,
          bgcolor: '#ffffff',
        })
      )),
      withLatestFrom(this.singleRackData$),
      takeUntil(this.destroyEvent$)
    )
      .subscribe(
        ([imageData, rackData]) => {
          
          const link = document.createElement('a');
          let downloadName = `${ rackData.name } by ${ rackData.author.username } - ${ rackData.hp } HP - ${ rackData.rows } rows - ${ new Date().toLocaleDateString() }`;
          link.download = `${ downloadName }.jpeg`;
          // replace any characters that make use problems in the download filename
          link.download = link.download.replace(/[/\\?%*:|"<>]/g, '-');
          link.href = imageData;
          link.click();
          link.remove();
          
          this.snackBar.open('Image downloaded: ' + downloadName, undefined, {duration: 5000});
        }
      );
    
    // when user requests to update rack image preview, generate it, and upload to backend
    this.updateRackImagePreview$.pipe(
      tap(() => this.snackBar.open('⏲️ Generating image: please wait, this can take a few moments...', undefined, {duration: 20000})),
      tap(() => this.showModuleCounters$.next(false)),
      delay(50), // wait for the screen to be ready
      withLatestFrom(this.currentDownloadElementRef$),
      // generate the image, and convert it to a Blob
      switchMap(([_, references]) =>
        from(
          domtoimage.toJpeg(<any>references.screen.nativeElement, {
            quality: 0.9,
            bgcolor: '#ffffff',
          })
        ).pipe(
          tap(() => this.showModuleCounters$.next(true)),
          // Convert the image data to a Blob
          map(imageData => {
            const byteCharacters = atob(imageData.split(',')[1]);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            return new Blob([byteArray], {type: 'image/jpeg'});
          })
        )
      ),
      // Upload the Blob to the backend
      switchMap(imageBlob => {
        const fileName = `${ this.singleRackData$.value.id }`;
        return this.backend.storage.uploadRackImage(imageBlob, `${ fileName }.jpeg`);
      }),
      // remove the old image from the backend
      withLatestFrom(this.singleRackData$),
      switchMap(([uploadResult, singleRackData]) => {
        if (singleRackData.image) {
          return this.backend.storage.deleteRackImage(singleRackData.image).pipe(map(() => uploadResult));
        } else {
          return of(uploadResult);
        }
      }),
      withLatestFrom(this.singleRackData$),
      // Update the rack data with the new image URL
      switchMap(([uploadResult, rackData]) => {
        rackData.image = uploadResult;
        return this.backend.update.rack(rackData);
        
      }),
      withLatestFrom(this.singleRackData$),
      takeUntil(this.destroyEvent$)
    )
      .subscribe(() => {
        SharedConstants.successCustom(this.snackBar, 'Preview updated');
        
        this.updateSingleRackData$.next(this.singleRackData$.value.id);
        }
      );
    
    // when user toggles locked status of rack, update backend
    this.requestRackEditableStatusChange$
      .pipe(
        withLatestFrom(this.singleRackData$, this.isCurrentRackEditable$),
        map(([_, x, y]) => {
          const editable: boolean = !y;
          this.isCurrentRackEditable$.next(editable);
          x.locked = !editable;
          return x;
        }),
        switchMap(x => this.backend.update.rack(x)),
        takeUntil(this.destroy$),
      )
      .subscribe();
    
    // when user renames rack, ask user for input and update local data and backend 
    this.renameCurrentRack$
      .pipe(
        withLatestFrom(this.singleRackData$),
        switchMap(([_, rack]) => {
          
          let formControl = new FormControl(rack.name);
          
          //add validation
          formControl.addValidators(
            [
              Validators.required,
              Validators.minLength(3),
              Validators.maxLength(30),
              // name cannot be empty characters
              Validators.pattern('^(?!\\s*$).+')
            ]
          )
          
          
          const data: InputDialogDataInModel = {
            title: 'Rename Rack',
            description: `Please enter a new name for your rack "${ rack.name }"`,
            type: FormTypes.TEXT,
            control: formControl,
            label: 'New Name'
          };
          
          return this.dialog.open(
            InputDialogComponent,
            {
              data,
              disableClose: false
            }
          )
            .afterClosed()
            .pipe(
              filter((x: InputDialogDataOutModel) => !!x),
              map((x: InputDialogDataOutModel) => ({
                newName: x.result,
                rack
              })),
            );
        }),
        // properly destructuring the array
        map(({newName, rack}) => {
          rack.name = newName;
          this.singleRackData$.next(rack);
          return rack;
        }),
        switchMap(x => this.backend.update.rack(x)),
        // request update of local data
        tap(x => this.updateSingleRackData$.next(x.data[0].id)),
        takeUntil(this.destroy$),
      )
      .subscribe()
    
    this.updateSingleRackData$
      .pipe(
        // tap(x => this.singleRackData$.next(undefined)),
        switchMap(x => this.backend.GET.rackWithId(x)),
        takeUntil(this.destroy$),
      )
      .subscribe(x => this.singleRackData$.next(x.data))
    
    // when updated rack data is received, update locked status observable
    this.singleRackData$
      .pipe(
        filter(x => !!x),
        takeUntil(this.destroy$),
      )
      .subscribe(x => this.isCurrentRackEditable$.next(!x.locked))
    
    // when updated rack data is received, update privacy status observable
    this.singleRackData$
      .pipe(
        filter(x => !!x),
        takeUntil(this.destroy$),
      )
      .subscribe(x => this.isCurrentRackPrivate$.next(!x.public))
    
    // when updated rack data is received, update rowedRackedModules$
    this.singleRackData$.pipe(
      tap(() => this.rowedRackedModules$.next(null)),
      filter(x => !!x),
      switchMap(x => x ? this.backend.get.rackedModules(x.id) : of([])),
      withLatestFrom(this.singleRackData$),
      takeUntil(this.destroy$),
    )
      .subscribe(([rackedModules, rack]: [RackedModule[], Rack]) => {
        // create a 2d array of racked modules and sort them by row
        const rowedRackedModules = this.buildRowedModulesArray(rackedModules, rack);
        this.rowedRackedModules$.next(rowedRackedModules);
      })
    
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
          
          this.rowedRackedModules$.next(rackModules);
          
          this.requestRackedModulesDbSync$.next();
        }
        
      })
    
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
      })
    
    // when request to remove module is received, find module and remove it, then update the local rack data
    this.requestRackedModuleRemoval$
      .pipe(
        withLatestFrom(this.rowedRackedModules$),
        switchMap(([rackedModule, rackModules]) => {
          
          this.removeRackedModuleFromRack(rackModules, rackedModule);
          this.rowedRackedModules$.next(rackModules);
          
          // this.requestRackedModulesDbSync$.next();
          // this does not work, because the rack data are upserted, so we need to delete in the backend manually
          
          return this.backend.delete.rackedModule(rackedModule.rackingData.id);
        }),
        withLatestFrom(this.singleRackData$),
        takeUntil(this.destroy$)
      )
      .subscribe(([x, rackData]) => {
        this.singleRackData$.next(rackData);
      })
    
    // when request to duplicate module is received, find module and duplicate it, then update the local rack data
    this.requestRackedModuleDuplication$
      .pipe(
        withLatestFrom(this.rowedRackedModules$),
        takeUntil(this.destroy$)
      )
      .subscribe(([rackedModule, rackModules]) => {
        
        this.duplicateModule(rackModules, rackedModule);
        this.rowedRackedModules$.next(rackModules);
        
        this.requestRackedModulesDbSync$.next();
        
      })
    
    // on request to sync rack data with backend, update backend
    this.requestRackedModulesDbSync$
      .pipe(
        withLatestFrom(this.rowedRackedModules$, this.singleRackData$),
        switchMap(([_, rackModules, rack]) => this.callBackendToUpdateModulesOfRack(rackModules, rack)),
        // handle error, if any module has not been updated,tell to the user that something went wrong
        catchError((err) => {
          console.error(`Error syncing rack data with backend: ${ err }`);
          SharedConstants.errorHandlerOperation(this.snackBar);
          return of(undefined);
        }),
        filter(x => !!x),
        takeUntil(this.destroyEvent$)
      )
      .subscribe(() => {
        // SharedConstants.successSaveShort(this.snackBar);
      })
    
    // on rack delete, ask for confirmation and delete rack on backend
    this.deleteRack$
      .pipe(
        switchMap(() => {
          
          const data: ConfirmDialogDataInModel = {
            title: 'Deletion',
            description: 'Are you sure you want to delete this item?',
            positive: {label: '✔️ Delete'},
            negative: {label: '❌ Cancel'}
          };
          
          return this.dialog.open(
            ConfirmDialogComponent,
            {
              data,
              disableClose: true
            }
          )
            .afterClosed()
            .pipe(filter((x: ConfirmDialogDataOutModel) => x.answer)
            );
        }),
        withLatestFrom(this.deleteRack$, this.rowedRackedModules$),
        switchMap(([_, x]) => this.backend.delete.modulesOfRack(x.id).pipe(map(() => x))),
        switchMap(x => this.backend.delete.commentsForRack(x.id).pipe(map(() => x))),
        switchMap(x => x.image ? this.backend.storage.deleteRackImage(x.image).pipe(map(() => x)) : of(x)),
        switchMap(x => this.backend.delete.userRack(x.id)),
        takeUntil(this.destroyEvent$)
      )
      .subscribe(() => {
        this.router.navigate(['/user/area']);
        SharedConstants.successDelete(this.snackBar);
      });
    
    // on rack duplicate, ask for confirmation and duplicate rack on the backend, including modules and their positions
    this.duplicateRack$
      .pipe(
        switchMap(() => this.askForConfirmationWhenDuplicatingRack()),
        tap(() => this.snackBar.open('Creating new rack...', undefined,)),
        withLatestFrom(this.duplicateRack$, this.userService.loggedUser$),
        // create new rack, to the current user, with the same modules, but with an_updated_name, 
        switchMap(([_, __, user]) => {
          // create new rack on the backend,with a new author: current user
          return this.createNewRackOnBackendForCurrentUser(user.id).pipe(
            map(x => (x.data[0].id))
          );
        }),
        // wait for the new rack id to arrive, then update the rack modules with the new rack id,
        switchMap(newlyCreatedRackId => {
          history.replaceState({}, '', `/racks/details/${ newlyCreatedRackId }`);
          
          const rackModules = this.removeInformationFromModulesOfCurrentRack(newlyCreatedRackId);
          
          // load the new empty rack
          this.updateSingleRackData$.next(newlyCreatedRackId)
          return this.singleRackData$.pipe(
            filter(x => x.id === newlyCreatedRackId),
            take(1),
            map(() => rackModules),
          )
          }
        ),
        // wait for the new empty rack to arrive, then add the modules to the new rack
        switchMap(rackModules => this.callBackendToUpdateModulesOfRack(rackModules, this.singleRackData$.value)),
        takeUntil(this.destroyEvent$)
      )
      .subscribe(() => {
        SharedConstants.successCustom(this.snackBar, 'Rack Duplicated');
      });
    
    // add a module from bottom picker
    this.addModuleToRack$
      .pipe(
        switchMap(module => this.backend.add.rackModule(
          module.id,
          this.singleRackData$.value.id
        )),
        takeUntil(this.destroyEvent$)
      )
      .subscribe(() => {
        snackBar.open('✅ Added', undefined, {duration: 4000});
        
        this.updateSingleRackData$.next(this.singleRackData$.value.id);
      });
    
    
    // when rack data changes update statistics
    this.singleRackData$.pipe(
      // clear statistics when rack data is undefined
      tap(x => {
        if (!x) {
          this.rackStatistics$.next(null);
        }
      }),
      filter(x => !!x),
      switchMap(() => this.rowedRackedModules$.pipe(
        filter(y => !!y),
        take(1),
      )),
      withLatestFrom(this.singleRackData$),
      takeUntil(this.destroy$)
    )
      .subscribe(([rows, rack]) => {
        // let patchPoints = {
        //   name: 'Total Patch Points',
        //   value: rows
        //     .flatMap(row => row).map(module => module.module.ins.length + module.module.outs.length)
        //     .reduce((a, b) => a + b, 0)
        //     .toString()
        // };
        
        const byHPCount: {
          name: string;
          value: string
        }[] = [];
        
        // count how many different kinds of HP have
        rows
          .flatMap(row => row)
          // exclude 3u modules
          .filter(module => module.module.standard.id === 0)
          .map(module => module.module.hp)
          .forEach(hp => {
            const existingEntry = byHPCount.find(x => x.name === hp.toString() + "HP count");
            if (existingEntry) {
              existingEntry.value = (parseInt(existingEntry.value, 10) + 1).toString();
            } else {
              byHPCount.push({
                name: hp.toString() + "HP count",
                value: '1'
              });
            }
          });
        
        // sort by hp
        byHPCount.sort((a, b) => {
          const aHP = parseInt(a.name.split('HP')[0], 10);
          const bHP = parseInt(b.name.split('HP')[0], 10);
          return aHP - bHP;
        });
        
        this.rackStatistics$.next([
          // patchPoints,
          ...byHPCount
        ]);
      });
    
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
  
  private createNewRackOnBackendForCurrentUser(userId: string) {
    return this.backend.add.rack(
      {
        authorid: userId,
        name: this.bumpUpVersionInNameOfOfRack(),
        hp: this.singleRackData$.value.hp,
        rows: this.singleRackData$.value.rows,
        image: this.singleRackData$.value.image,
        public: true,
        locked: false
      }
    );
  }
  
  private askForConfirmationWhenDuplicatingRack() {
    const data: ConfirmDialogDataInModel = {
      title: 'Duplicate rack',
      description: 'Confirm rack duplication? You will be able to change its name and content later',
      positive: {label: 'Confirm'},
      // negative: {label: '❌ Cancel'}
    };
    
    return this.dialog.open(
      ConfirmDialogComponent,
      {
        data,
        disableClose: false
      }
    )
      .afterClosed()
      .pipe(filter((x: ConfirmDialogDataOutModel) => x.answer)
      );
  }

// bump up version number in name of rack, if it has one, otherwise add version "V2", used when duplicating rack
  
  private bumpUpVersionInNameOfOfRack() {
    let originalName = this.singleRackData$.value.name;
    
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
          if (this.isAnyModuleWithoutRackingId(rackModules)) {
            this.singleRackData$.next(rack);
          }
        })
      );
  }
  
  /*
   check if there are modules without racking id, because they have not been synced with the backend yet,
   probably because they are new, and have not been saved to the backend yet
   */
  
  private isAnyModuleWithoutRackingId(rackModules: RackedModule[][]): boolean {
    return rackModules.flatMap(row => row)
      .filter(module => module.rackingData.id === undefined).length > 0;
  }
  
  private buildRowedModulesArray(rackedModules: RackedModule[], rackData: RackMinimal): RackedModule[][] {
    const rowedRackedModules: RackedModule[][] = [];
    for (let i = 0; i < rackData.rows; i++) {
      rowedRackedModules[i] = rackedModules.filter(module => module.rackingData.row === i);
    }
    
    // check if there are modules without row and column, add them to a new row
    const modulesWithoutRowAndColumn = rackedModules.filter(
      module => module.rackingData.row === null && module.rackingData.column === null
    );
    
    if (modulesWithoutRowAndColumn.length > 0) {
      rowedRackedModules.push(modulesWithoutRowAndColumn);
    }
    
    return rowedRackedModules;
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
  
  private transferBetweenRows(rackedModules: RackedModule[][], rackedModule: RackedModule, event, newRow): void {
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
    // make a deep copy of the module with lodash
    const deepCopiedRackedModule: RackedModule = _.cloneDeep(rackedModule);
    
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
  
  // the following identifications come from database
  private calculateBlankIdForSizeAndStandard(
    hp: number,
    standard: number = 0
  ) {
    if (standard === 0) {
      switch (hp) {
        case 1:
          return 4666;
        case 2:
          return 4647;
        case 3:
          return 4665;
        case 4:
          return 4648;
        case 5:
          return 4664;
        case 6:
          return 4649;
        case 7:
          return 4650;
        case 8:
          return 4651;
        case 9:
          return 4652;
        case 10:
          return 4653;
        case 11:
          return 4654;
        case 12:
          return 4655;
        case 13:
          return 4656;
        case 14:
          return 4657;
        case 15:
          return 4658;
        case 16:
          return 4659;
        case 17:
          return 4660;
        case 18:
          return 4661;
        case 19:
          return 4662;
        case 20:
          return 4663;
        default:
          return -1;
      }
    } else if (standard === 1) {
      switch (hp) {
        case 1:
          return 4711;
        case 2:
          return 4712;
        case 3:
          return 4713;
        case 4:
          return 4714;
        case 5:
          return 4715;
        case 6:
          return 4716;
        case 7:
          return 4717;
        case 8:
          return 4718;
        case 9:
          return 4719;
        case 10:
          return 4720;
        case 11:
          return 4721;
        case 12:
          return 4722;
        case 13:
          return 4723;
        case 14:
          return 4724;
        case 15:
          return 4725;
        case 16:
          return 4726;
        case 17:
          return 4727;
        case 18:
          return 4728;
        case 19:
          return 4729;
        case 20:
          return 4730;
        case 21:
          return 4731;
        case 22:
          return 4732;
        case 23:
          return 4733;
        case 24:
          return 4734;
        case 25:
          return 4735;
        default:
          return -1;
      }
    } else return -1;
  }
  
}