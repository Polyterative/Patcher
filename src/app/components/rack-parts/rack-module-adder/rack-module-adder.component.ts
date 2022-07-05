import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  OnInit
}                                from '@angular/core';
import {
  UntypedFormControl,
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
  filter,
  map,
  share,
  startWith,
  switchMap
}                                from 'rxjs/operators';
import { SupabaseService }       from 'src/app/features/backend/supabase.service';
import { FormTypes }             from 'src/app/shared-interproject/components/@smart/mat-form-entity/form-element-models';
import { SharedConstants }       from 'src/app/shared-interproject/SharedConstants';
import { UserAreaDataService }   from '../../../features/user-area/user-area-data.service';
import { DbModule }              from '../../../models/module';
import { SubManager }            from '../../../shared-interproject/directives/subscription-manager';
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
    UserAreaDataService,
    TimeagoPipe
  ]
})
export class RackModuleAdderComponent extends SubManager implements OnInit {
  readonly saveRackedModule$ = new Subject<void>();
  data$ = new BehaviorSubject<[]>([]);
  
  fields = {
    rack: {
      label:    'Choose rack',
      code:     'rack',
      flex:     '6rem',
      control: new UntypedFormControl('', Validators.compose([
        Validators.required
      ])),
      options$: this.buildOptions(),
      type:     FormTypes.AUTOCOMPLETE
    }
  };
  
  static open(dialog: MatDialog, data: RackModuleAdderInModel): MatDialogRef<RackModuleAdderComponent, RackModuleAdderOutModel> {
    return dialog.open(RackModuleAdderComponent, {
      data,
      width:    '70%',
      maxWidth: '40rem'
    });
  }
  
  constructor(
    public snackBar: MatSnackBar,
    public backend: SupabaseService,
    public timeagoPipe: TimeagoPipe,
    public userAreaDataService: UserAreaDataService,
    public dialogRef: MatDialogRef<RackModuleAdderComponent, RackModuleAdderOutModel>,
    public rackDetailDataService: RackDetailDataService,
    @Inject(MAT_DIALOG_DATA) public data: RackModuleAdderInModel
  ) {
    super();
    
    this.manageSub(
      this.saveRackedModule$
          .pipe(
            switchMap(x => this.backend.add.rackModule(
              this.data.module.id,
              this.fields.rack.control.value.id
            ))
          )
          .subscribe(value => {
            SharedConstants.successSave(this.snackBar);
        
            this.dialogRef.close();
          })
    );
    
    this.userAreaDataService.updateRackData$.next(undefined);
    
  }
  
  ngOnInit(): void {
  }
  
  private buildOptions() {
    return this.userAreaDataService.rackData$.pipe(
      filter(x => !!x),
      map(x => {
          const mapFunction: (row) => { name: string; id: string } = row => {
            const name = `${ row.name } ( ${ row.hp } HP , ${ row.rows } row(s) , ${ this.timeagoPipe.transform(new Date(row.updated)) } )`;
            
            return {
              id: row.id.toString(),
              name
            };
          };
          const options: { name: string; id: string }[] = x.map(mapFunction);
          
          // add lastly updated rack if not already empty
          if (options.length > 0) {
            const lastUpdatedRack = x.sort((a, b) =>
              new Date(b.updated).getTime() - new Date(a.updated).getTime())[0];
            
            const firstRackAsOption: { name: string; id: string } = [lastUpdatedRack].map(mapFunction)[0];
            
            this.fields.rack.control.patchValue(firstRackAsOption);
          }
          
          return options;
        }
      ),
      startWith([]),
      share()
    );
  }
}
