import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  OnInit
}                                from '@angular/core';
import {
  FormControl,
  Validators
}                                from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogRef
}                                from '@angular/material/dialog';
import { MatSnackBar }           from '@angular/material/snack-bar';
import { TimeagoPipe }           from 'ngx-timeago';
import {
  BehaviorSubject,
  Subject
}                                from 'rxjs';
import {
  map,
  share,
  startWith,
  switchMap,
  takeUntil
}                                from 'rxjs/operators';
import { SupabaseService }       from 'src/app/features/backend/supabase.service';
import { DbModule }              from 'src/app/models/models';
import { FormTypes }             from 'src/app/shared-interproject/components/@smart/mat-form-entity/form-element-models';
import { SharedConstants }       from 'src/app/shared-interproject/SharedConstants';
import { UserRacksService }      from '../../user-parts/user-racks/user-racks.service';
import { RackDetailDataService } from '../rack-detail-data.service';

export interface RackModuleAdderOutModel {
}

export interface RackModuleAdderInModel {
  module: DbModule;
}

@Component({
  selector:        'app-rack-module-adder',
  templateUrl:     './rack-module-adder.component.html',
  styleUrls:       ['./rack-module-adder.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers:       [
    UserRacksService,
    TimeagoPipe
  ]
})
export class RackModuleAdderComponent implements OnInit {
  public readonly save$ = new Subject<void>();
  data$ = new BehaviorSubject<[]>([]);
  
  fields = {
    rack: {
      label:    'Rack',
      code:     'rack',
      flex:     '6rem',
      control:  new FormControl('', Validators.compose([
        Validators.required
      ])),
      options$: this.buildOptions(),
      type:     FormTypes.AUTOCOMPLETE
    }
  };
  
  private buildOptions() {
    return this.userRacksService.data$
               .pipe(
                 map(x => {
                     let mapFunction: (row) => { name: string; id: string } = row => ({
                       id:   row.id.toString(),
                       name: `${ row.name } (${ row.hp } HP, ${ row.rows } rows, updated: ${ this.timeagoPipe.transform(new Date(row.updated)) }) `
                     });
                     let options: { name: string; id: string }[] = x.map(mapFunction);
          
                     //add lastly updated rack if not already empty
                     if (options.length > 0) {
                       let lastUpdatedRack = x.sort((a, b) => {
                         return new Date(b.updated).getTime() - new Date(a.updated).getTime();
                       })[0];
            
                       let firstRackAsOption: { name: string; id: string } = [lastUpdatedRack].map(mapFunction)[0];
            
                       this.fields.rack.control.patchValue(firstRackAsOption);
                     }
          
                     return options;
                   }
                 ),
                 startWith([]),
                 share()
               );
  }
  
  protected destroyEvent$ = new Subject<void>();
  
  ngOnDestroy(): void {
    this.destroyEvent$.next();
    this.destroyEvent$.complete();
    
  }
  
  constructor(
    public snackBar: MatSnackBar,
    public backend: SupabaseService,
    public timeagoPipe: TimeagoPipe,
    public userRacksService: UserRacksService,
    public dialogRef: MatDialogRef<RackModuleAdderComponent, RackModuleAdderOutModel>,
    public rackDetailDataService: RackDetailDataService,
    @Inject(MAT_DIALOG_DATA) public data: RackModuleAdderInModel
  ) {
    
    this.save$
        .pipe(
          switchMap(x => this.backend.add.rackModule(
            this.data.module.id,
            this.fields.rack.control.value.id
          )),
          takeUntil(this.destroyEvent$)
        )
        .subscribe(value => {
          SharedConstants.successSave(this.snackBar);
  
          this.dialogRef.close();
        });
    
    this.userRacksService.updateData$.next(undefined);
  }
  
  ngOnInit(): void {
  }
  
  public static open(dialog: MatDialog, data: RackModuleAdderInModel): MatDialogRef<RackModuleAdderComponent, RackModuleAdderOutModel> {
    return dialog.open(RackModuleAdderComponent, {data});
  }
}
