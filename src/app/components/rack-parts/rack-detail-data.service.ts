import {
  CdkDragDrop,
  moveItemInArray
} from '@angular/cdk/drag-drop';
import {
  ElementRef,
  Injectable
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import _ from 'lodash';
import {
  BehaviorSubject,
  combineLatest,
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
import { ModuleDetailDataService } from '../module-parts/module-detail-data.service';
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


@Injectable()
export class RackDetailDataService extends SubManager {
  updateSingleRackData$ = new ReplaySubject<number>();
  singleRackData$ = new BehaviorSubject<Rack | undefined>(undefined);
  deleteRack$ = new Subject<RackMinimal>();
  duplicateRack$ = new Subject<RackMinimal>();
  renameCurrentRack$ = new Subject<void>();
  // @ViewChild('screen') screen: ElementRef;
  // @ViewChild('canvas') canvas: ElementRef;
  downloadRackImageToUserComputer$ = new Subject<{
    // screen: ElementRef,
    canvas: ElementRef,
    download: ElementRef
  }>();
  //
  currentDownloadElementRef$: BehaviorSubject<{
    screen: ElementRef,
  } | undefined> = new BehaviorSubject<{
    screen: ElementRef,
  }>(undefined);
  
  addModuleToRack$ = new Subject<MinimalModule>();
  shouldShowPanelImages$ = new BehaviorSubject<boolean>(true);
  
  rowedRackedModules$ = new BehaviorSubject<RackedModule[][] | null>(null);
  
  rackOrderChange$ = new Subject<{
    event: CdkDragDrop<ElementRef>,
    newRow: number,
    module: RackedModule
  }>();
  isCurrentRackPropertyOfCurrentUser$ = new BehaviorSubject<boolean>(false);
  isCurrentRackEditable$ = new BehaviorSubject<boolean>(true);
  userRequestedSmallerScale$ = new BehaviorSubject<boolean>(false);
  //
  requestRackEditableStatusChange$ = new Subject<void>();
  requestRackedModuleRemoval$ = new Subject<RackedModule>();
  requestRackedModuleDuplication$ = new Subject<RackedModule>();
  requestRackedModulesDbSync$ = new Subject<void>();
  //
  
  protected destroyEvent$ = new Subject<void>();
  
  constructor(
    private snackBar: MatSnackBar,
    private userService: UserManagementService,
    private backend: SupabaseService,
    private dialog: MatDialog,
    private router: Router,
    private moduleDetailDataService: ModuleDetailDataService
  ) {
    super();
    
    // when user requests to download rack image, download it using HTML2Canvas
    this.downloadRackImageToUserComputer$.pipe(
      tap(x => this.snackBar.open('Downloading image...', undefined, {duration: 4000})),
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
            description: 'Please enter a new name for your rack',
            type: FormTypes.TEXT,
            control: formControl,
            label: 'New Name'
          };
          
          return this.dialog.open(
            InputDialogComponent,
            {
              data,
              disableClose: true
            }
          )
            .afterClosed()
            .pipe(
              filter((x: InputDialogDataOutModel) => !!x.result),
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
        switchMap(x => this.backend.get.rackWithId(x)),
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
    
    // when updated rack data is received, update rowedRackedModules$
    this.manageSub(
      this.singleRackData$.pipe(
        tap(() => this.rowedRackedModules$.next(null)),
        filter(x => !!x),
        switchMap(x => x ? this.backend.get.rackedModules(x.id) : of([])),
        withLatestFrom(this.singleRackData$)
      )
        .subscribe(([rackedModules, rack]: [RackedModule[], Rack]) => {
          // create a 2d array of racked modules and sort them by row
          const rowedRackedModules = this.buildRowedModulesArray(rackedModules, rack);
          this.rowedRackedModules$.next(rowedRackedModules);
        })
    );
    
    // on order change, update local rack data and backend
    this.manageSub(
      this.rackOrderChange$
        .pipe(
          withLatestFrom(this.rowedRackedModules$, this.singleRackData$)
        )
        .subscribe(([
                      {
                        event,
                        newRow,
                        module
                      }, rackModules, rack
                    ]) => {
          
          
          const movingUnrackedModule: boolean = module.rackingData.row === null && newRow > rack.rows - 1;
          if (movingUnrackedModule) {
            module.rackingData.column = 0;
            this.transferInRow(rackModules, newRow, event);
            
            // nothing to do, not moving unracked module
            this.snackBar.open(
              `Please move unracked module to a suitable position inside your rack.
                Your rack has ${ rack.rows } rows`,
              null,
              {duration: 8000});
            
            return;
          }
          
          // update array
          if (newRow === module.rackingData.row) {
            this.transferInRow(rackModules, newRow, event);
          } else {
            this.transferBetweenRows(rackModules, module, event, newRow);
          }
          
          this.rowedRackedModules$.next(rackModules);
          
          this.requestRackedModulesDbSync$.next();
        })
    );
    
    // track if rack is property of current user
    this.manageSub(
      combineLatest([
        this.userService.loggedUser$,
        this.singleRackData$
      ])
        .pipe(
          tap(x => this.isCurrentRackPropertyOfCurrentUser$.next(false)),
          filter(([user, rackData]) => (!!user && !!rackData))
        )
        .subscribe(([user, rackData]) => {
          this.isCurrentRackPropertyOfCurrentUser$.next(user.id === rackData.author.id);
        })
    );
    
    // when request to remove module is received, find module and remove it, then update the local rack data
    this.manageSub(
      this.requestRackedModuleRemoval$
        .pipe(
          withLatestFrom(this.rowedRackedModules$, this.singleRackData$),
          switchMap(([rackedModule, rackModules, rack]) => {
            
            this.removeRackedModuleFromArray(rackModules, rackedModule);
            this.rowedRackedModules$.next(rackModules);
            
            // this.requestRackedModulesDbSync$.next();
            // this does not work, because the rack data are upserted, so we need to delete in the backend manually
            
            return this.backend.delete.rackedModule(rackedModule.rackingData.id);
          }),
          withLatestFrom(this.singleRackData$)
        )
        .subscribe(([x, rackData]) => {
          this.singleRackData$.next(rackData);
        })
    );
    
    // when request to duplicate module is received, find module and duplicate it, then update the local rack data
    this.manageSub(
      this.requestRackedModuleDuplication$
        .pipe(
          withLatestFrom(this.rowedRackedModules$, this.singleRackData$)
        )
        .subscribe(([rackedModule, rackModules, rack]) => {
          
          this.duplicateModule(rackModules, rackedModule);
          this.rowedRackedModules$.next(rackModules);
          
          this.requestRackedModulesDbSync$.next();
          
        })
    );
    
    // on request to sync rack data with backend, update backend
    this.manageSub(
      this.requestRackedModulesDbSync$
        .pipe(
          withLatestFrom(this.rowedRackedModules$, this.singleRackData$),
          switchMap(([_, rackModules, rack]) => this.callBackendToUpdateModulesOfRack(rackModules, rack)
          ),
          // handle error, if any module has not been updated,tow to the user that something went wrong
          catchError(err => {
            SharedConstants.errorHandlerOperation(this.snackBar);
            return of(undefined);
          }),
          filter(x => !!x),
        )
        .subscribe(x => {
          // SharedConstants.successSaveShort(this.snackBar);
        })
    );
    
    // on rack delete, ask for confirmation and delete rack on backend
    this.deleteRack$
      .pipe(
        switchMap(x => {
          
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
        switchMap(([z, x]) => this.backend.delete.modulesOfRack(x.id)
          .pipe(map(() => x))),
        switchMap(x => this.backend.delete.userRack(x.id)),
        takeUntil(this.destroyEvent$)
      )
      .subscribe(value => {
        this.router.navigate(['/user/area']);
        SharedConstants.successDelete(this.snackBar);
      });
    
    // on rack duplicate, ask for confirmation and duplicate rack on backend, including modules and their positions 
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
              map(x => rackModules),
            )
          }
        ),
        // wait for the new empty rack to arrive, then add the modules to the new rack
        switchMap(rackModules => this.callBackendToUpdateModulesOfRack(rackModules, this.singleRackData$.value)),
      )
      .subscribe(value => {
        SharedConstants.successCustom(this.snackBar, 'Rack Duplicated');
      });
    
    // add module from bottom picker
    this.addModuleToRack$
      .pipe(
        switchMap(module => this.backend.add.rackModule(
          module.id,
          this.singleRackData$.value.id
        )),
        takeUntil(this.destroyEvent$)
      )
      .subscribe(moduleToAdd => {
        snackBar.open('✅ Added', undefined, {duration: 4000});
        
        this.updateSingleRackData$.next(this.singleRackData$.value.id);
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
        locked: false
      }
    );
  }
  
  private askForConfirmationWhenDuplicatingRack() {
    const data: ConfirmDialogDataInModel = {
      title: 'Duplicate rack',
      description: 'Are you sure you want to create a new rack in your profile with the same modules?',
      positive: {label: '✔️ Duplicate'},
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
        tap(x => {
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
    this.removeRackedModuleFromArray(rackedModules, rackedModule);
    
    // add item to new array
    rackedModules[newRow].splice(event.currentIndex, 0, rackedModule);
    this.updateModulesColumnIds(rackedModules, newRow);
    
  }
  
  private removeRackedModuleFromArray(rackedModules: RackedModule[][], rackedModule: RackedModule): void {
    this.updateModulesColumnIds(rackedModules, rackedModule.rackingData.row);
    
    // undefined accounts for unracked modules
    const modulesOfRow: RackedModule[] | undefined = rackedModules[rackedModule.rackingData.row];
    if (modulesOfRow) {
      // module was previously racked
      modulesOfRow.splice(rackedModule.rackingData.column, 1);
    } else {
      // module has not been racked yet
      const lastRow: RackedModule[] = rackedModules[rackedModules.length - 1];
      
      // remove unracked module from last row
      const unrackedModuleRowIndex: number = lastRow.findIndex(module => module.rackingData.id === rackedModule.rackingData.id);
      lastRow.splice(unrackedModuleRowIndex, 1);
      
      if (lastRow.length === 0) {
        // remove empty row
        rackedModules.splice(rackedModules.length - 1, 1);
      }
    }
    
    this.updateModulesColumnIds(rackedModules, rackedModule.rackingData.row);
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
  
  
}