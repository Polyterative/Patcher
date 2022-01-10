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
  takeUntil,
  tap
}                          from 'rxjs/operators';
import {
  RackCreatorComponent,
  RackCreatorInModel
}                          from 'src/app/components/rack-parts/rack-creator/rack-creator.component';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { Rack }            from '../../../models/rack';

@Component({
  selector:        'app-user-racks',
  templateUrl:     './user-racks.component.html',
  styleUrls:       ['./user-racks.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserRacksComponent implements OnInit {
  data$: BehaviorSubject<Rack[]> = new BehaviorSubject([]);
  public readonly add$ = new Subject<void>();
  public readonly updateData$ = new Subject<void>();
  
  constructor(
    public dialog: MatDialog,
    public backend: SupabaseService
  ) {
    
    this.updateData$
        .pipe(
          tap(x => this.data$.next([])),
          switchMap(x => this.backend.get.userRacks()),
          takeUntil(this.destroyEvent$)
        )
        .subscribe(x => this.data$.next(x));
  
    this.add$
        .pipe(
          switchMap(x => {
            let data: RackCreatorInModel = {
              // description: 'Stai per eliminare questo elemento, procedere?',
              // positive:    {label: '✔️ Conferma'},
              // negative:    {label: '❌ Annulla'}
            };
  
            return this.dialog.open(
              RackCreatorComponent,
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
  
  protected destroyEvent$ = new Subject<void>();
  
  ngOnDestroy(): void {
    this.destroyEvent$.next();
    this.destroyEvent$.complete();
    
  }
}
