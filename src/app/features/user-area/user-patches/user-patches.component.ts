import {
  ChangeDetectionStrategy,
  Component,
  OnInit
}                          from '@angular/core';
import { MatDialog }       from '@angular/material/dialog';
import {
  BehaviorSubject,
  Subject
}                          from 'rxjs';
import {
  switchMap,
  takeUntil
}                          from 'rxjs/operators';
import {
  PatchCreatorComponent,
  PatchCreatorInModel
}                          from 'src/app/components/patch-parts/patch-creator/patch-creator.component';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { Patch }           from 'src/app/models/models';

@Component({
  selector:        'app-user-patches',
  templateUrl:     './user-patches.component.html',
  styleUrls:       ['./user-patches.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserPatchesComponent implements OnInit {
  data$: BehaviorSubject<Patch[]> = new BehaviorSubject([]);
  public readonly add$ = new Subject();
  public readonly updateData$ = new Subject();
  
  constructor(
    public dialog: MatDialog,
    public backend: SupabaseService
  ) {
    this.updateData$
        .pipe(
          switchMap(x => this.backend.get.userPatches()),
          takeUntil(this.destroyEvent$)
        )
        .subscribe(x => this.data$.next(x));
    
    
    this.add$
        .pipe(
          switchMap(x => {
            let data: PatchCreatorInModel = {
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
          }),
          takeUntil(this.destroyEvent$)
        )
        .subscribe(x => this.updateData$.next());
  
  }
  
  ngOnInit(): void {
    this.updateData$.next();
  
  }
  
  protected destroyEvent$: Subject<void> = new Subject();
  
  ngOnDestroy(): void {
    this.destroyEvent$.next();
    this.destroyEvent$.complete();
    
  }
}
