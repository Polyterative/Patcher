import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  OnInit
}                          from '@angular/core';
import {
  FormControl,
  Validators
}                          from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogRef
}                          from '@angular/material/dialog';
import { MatSnackBar }     from '@angular/material/snack-bar';
import {
  BehaviorSubject,
  Subject
}                          from 'rxjs';
import {
  map,
  startWith,
  switchMap,
  takeUntil
}                          from 'rxjs/operators';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { FormTypes }       from 'src/app/shared-interproject/components/@smart/mat-form-entity/form-element-models';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';
import { DbModule }        from '../../../models/module';

export interface RackModuleAdderOutModel {
}

export interface RackModuleAdderInModel {
  module: DbModule;
}

@Component({
  selector:        'app-rack-module-adder',
  templateUrl:     './rack-module-adder.component.html',
  styleUrls:       ['./rack-module-adder.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RackModuleAdderComponent implements OnInit {
  public readonly save$ = new Subject<void>();
  data$ = new BehaviorSubject<[]>([]);
  
  fields = {
    // hp:   {
    //   label:   'hp',
    //   code:    'hp',
    //   flex:    '6rem',
    //   control: new FormControl('84', Validators.compose([
    //     Validators.required,
    //     Validators.min(2),
    //     Validators.max(416),
    //     CustomValidators.onlyIntegers
    //   ])),
    //   type:    FormTypes.NUMBER
    // },
    // rows: {
    //   label:   'Rows',
    //   code:    'rows',
    //   flex:    '6rem',
    //   control: new FormControl('2', Validators.compose([
    //     Validators.required,
    //     Validators.min(1),
    //     Validators.max(10),
    //     CustomValidators.onlyIntegers
    //   ])),
    //   type:    FormTypes.NUMBER
    // },
    rack: {
      label:    'Rack',
      code:     'rack',
      flex:     '6rem',
      control:  new FormControl('', Validators.compose([
        Validators.required
      ])),
      options$: this.backend.get.userRacks()
                    .pipe(
                      map(x => x.map(row => ({
                        id:   row.id.toString(),
                        name: row.name
                      }))),
                      startWith([])
                    ),
      type:     FormTypes.AUTOCOMPLETE
    }
  };
  protected destroyEvent$ = new Subject<void>();
  
  ngOnDestroy(): void {
    this.destroyEvent$.next();
    this.destroyEvent$.complete();
    
  }
  
  constructor(
    public snackBar: MatSnackBar,
    public backend: SupabaseService,
    public dialogRef: MatDialogRef<RackModuleAdderComponent, RackModuleAdderOutModel>,
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
  }
  
  ngOnInit(): void {
  }
  
}
