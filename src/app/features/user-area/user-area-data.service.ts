import { Injectable }      from '@angular/core';
import { MatDialog }       from '@angular/material/dialog';
import {
  BehaviorSubject,
  Subject
}                          from 'rxjs';
import {
  switchMap,
  tap
}                          from 'rxjs/operators';
import {
  PatchCreatorComponent,
  PatchCreatorInModel
}                          from '../../components/patch-parts/patch-creator/patch-creator.component';
import {
  RackCreatorComponent,
  RackCreatorInModel
}                          from '../../components/rack-parts/rack-creator/rack-creator.component';
import { MinimalModule }   from '../../models/module';
import { Patch }           from '../../models/patch';
import { Rack }            from '../../models/rack';
import { SubManager }      from '../../shared-interproject/directives/subscription-manager';
import { SupabaseService } from '../backend/supabase.service';

@Injectable()
export class UserAreaDataService extends SubManager {
  modulesData$: BehaviorSubject<MinimalModule[] | undefined> = new BehaviorSubject(undefined);
  patchesData$: BehaviorSubject<Patch[] | undefined> = new BehaviorSubject(undefined);
  rackData$: BehaviorSubject<Rack[] | undefined> = new BehaviorSubject(undefined);
  readonly updatePatchesData$ = new Subject<void>();
  readonly updateModulesData$ = new Subject<void>();
  readonly addPatch$ = new Subject<void>();
  readonly addRack$ = new Subject<void>();
  readonly updateRackData$ = new Subject<string | undefined>(); // user id otherwise current (not yet implemented)
  
  constructor(
    public dialog: MatDialog,
    public backend: SupabaseService
  ) {
    super();
    
    this.manageSub(
      this.updateModulesData$
          .pipe(
            tap(x => this.modulesData$.next(undefined)),
            switchMap(x => this.backend.get.userModules())
          )
          .subscribe(x => this.modulesData$.next(x))
    );
    
    this.manageSub(
      this.updatePatchesData$
          .pipe(
            tap(x => this.patchesData$.next(undefined)),
            switchMap(x => this.backend.get.userPatches())
          )
          .subscribe(x => this.patchesData$.next(x))
    );
    
    this.manageSub(
      this.updateRackData$
          .pipe(
            tap(x => this.rackData$.next(undefined)),
            switchMap(x => this.backend.get.userRacks())
          )
          .subscribe(x => this.rackData$.next(x)));
    
    this.manageSub(
      this.addPatch$
          .pipe(
            switchMap(x => {
              const data: PatchCreatorInModel = {
                // description: 'Stai per eliminare questo elemento, procedere?',
                // positive:    {label: '✔️ Conferma'},
                // negative:    {label: '❌ Annulla'}
              };
          
              return this.dialog.open(
                PatchCreatorComponent,
                {
                  data
                  // disableClose: true
                }
              )
                         .afterClosed();
              // .pipe(filter((x: CalendarCreateDialogDataOutModel) => x.editedStuff)
              // );
            })
          )
          .subscribe(x => this.updatePatchesData$.next())
    );
    
    this.addRack$
        .pipe(
          switchMap(x => {
            const data: RackCreatorInModel = {
              // description: 'Stai per eliminare questo elemento, procedere?',
              // positive:    {label: '✔️ Conferma'},
              // negative:    {label: '❌ Annulla'}
            };
        
            return this.dialog.open(
              RackCreatorComponent,
              {
                data,
                width: '24rem'
                // disableClose: true
              }
            )
                       .afterClosed();
            // .pipe(filter((x: CalendarCreateDialogDataOutModel) => x.editedStuff)
            // );
          })
        )
        .subscribe(x => this.updateRackData$.next(undefined));
    
  }
}
