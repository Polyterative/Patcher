import {
  ChangeDetectionStrategy,
  Component,
  OnInit
}                           from '@angular/core';
import { MatDialog }        from '@angular/material/dialog';
import { Subject }          from 'rxjs';
import {
  switchMap,
  takeUntil
}                           from 'rxjs/operators';
import {
  RackCreatorComponent,
  RackCreatorInModel
}                          from 'src/app/components/rack-parts/rack-creator/rack-creator.component';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { Rack }            from '../../../models/rack';
import { UserRacksService } from '../../../components/user-parts/user-racks/user-racks.service';

@Component({
  selector:        'app-user-racks',
  templateUrl:     './user-racks.component.html',
  styleUrls:       ['./user-racks.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers:       [UserRacksService]
})
export class UserRacksComponent implements OnInit {
  public readonly add$ = new Subject<void>();
  
  constructor(
    public dialog: MatDialog,
    public backend: SupabaseService,
    public dataService: UserRacksService
  ) {
  
  
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
        .subscribe(x => this.dataService.updateData$.next(undefined));
  
    // update with local user data
    this.dataService.updateData$.next(undefined);
  }
  
  ngOnInit(): void {
  }
  
  protected destroyEvent$ = new Subject<void>();
  
  ngOnDestroy(): void {
    this.destroyEvent$.next();
    this.destroyEvent$.complete();
    
  }
}
