import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  OnInit
} from '@angular/core';
import {
  FormControl,
  UntypedFormControl,
  Validators
} from '@angular/forms';
import { MatSnackBar } from "@angular/material/snack-bar";
import { TimeagoPipe } from 'ngx-timeago';
import {
  BehaviorSubject,
  Observable,
  Subject
} from 'rxjs';
import {
  filter,
  map,
  share,
  startWith,
  switchMap,
  takeUntil
} from 'rxjs/operators';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { UserAreaDataService } from 'src/app/features/routes/user-area/user-area-data.service';
import { DbModule } from 'src/app/models/module';
import { FormTypes } from 'src/app/shared-interproject/components/@smart/mat-form-entity/form-element-models';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogRef
} from "@angular/material/dialog";
import { Router } from "@angular/router";


export interface RackModuleAdderOutModel {
}

export interface RackModuleAdderInModel {
  module: DbModule;
}

@Component({
  selector:        'app-rack-module-adder',
  templateUrl: './rack-module-adder-dialog.component.html',
  styleUrls:   ['./rack-module-adder-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers:       [
    UserAreaDataService,
    TimeagoPipe
  ]
})
export class RackModuleAdderDialogComponent extends SubManager implements OnInit {
  readonly saveRackedModule$ = new Subject<void>();
  data$ = new BehaviorSubject<[]>([]);
  
  fields: {
    rack: {
      code: string;
      flex: string;
      control: FormControl<any>;
      label: string;
      options$: Observable<any[] | {
        name: string;
        id: string
      }[]>;
      type: FormTypes
    }
  }
  
  static open(dialog: MatDialog, data: RackModuleAdderInModel): MatDialogRef<RackModuleAdderDialogComponent, RackModuleAdderOutModel> {
    return dialog.open(RackModuleAdderDialogComponent, {
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
    public dialogRef: MatDialogRef<RackModuleAdderDialogComponent, RackModuleAdderOutModel>,
    private router: Router,
    @Inject(MAT_DIALOG_DATA) public data: RackModuleAdderInModel
  ) {
    super();
    
    this.fields = {
      rack: {
        label: 'Choose rack',
        code: 'rack',
        flex: '6rem',
        control: new UntypedFormControl('', Validators.compose([
          Validators.required
        ])),
        options$: this.buildOptions(),
        type: FormTypes.AUTOCOMPLETE
      }
    };
    
      this.saveRackedModule$
        .pipe(
          switchMap(() => this.backend.add.rackModule(
            this.data.module.id,
            this.fields.rack.control.value.id
          )),
          takeUntil(this.destroy$)
        )
        .subscribe(() => {
          SharedConstants.successSave(this.snackBar);
          
          this.snackBar.open(`Module added`, 'Open rack now', {
            duration: 5000,
          })
            .onAction()
            .pipe(takeUntil(this.destroy$))
            .subscribe(() => {
                this.dialogRef.close();
                this.router.navigate(['/racks', 'details', this.fields.rack.control.value.id]);
              }
            );
          
          
          
          this.dialogRef.close();
        })
    
    this.userAreaDataService.updateRackData$.next(undefined);
    
  }
  
  ngOnInit(): void {
  }
  
  private buildOptions() {
    return this.userAreaDataService.rackData$.pipe(
      filter(x => !!x),
      map(x => {
        const mapFunction: (row) => {
          name: string;
          id: string
        } = row => {
            const name = `${ row.name } ( ${ row.hp } HP , ${ row.rows } row(s) , ${ this.timeagoPipe.transform(new Date(row.updated)) } )`;
            
            return {
              id: row.id.toString(),
              name
            };
          };
        const options: {
          name: string;
          id: string
        }[] = x.map(mapFunction);
          
          // add lastly updated rack if not already empty
          if (options.length > 0) {
            const lastUpdatedRack = x.sort((a, b) =>
              new Date(b.updated).getTime() - new Date(a.updated).getTime())[0];
            
            const firstRackAsOption: {
              name: string;
              id: string
            } = [lastUpdatedRack].map(mapFunction)[0];
            
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