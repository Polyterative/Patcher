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
  switchMap,
  takeUntil
}                          from 'rxjs/operators';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import {
  CustomValidators,
  FormTypes
}                          from 'src/app/shared-interproject/components/@smart/mat-form-entity/form-element-models';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';

export interface RackCreatorOutModel {
}

export interface RackCreatorInModel {
}

@Component({
  selector:        'app-rack-creator',
  templateUrl:     './rack-creator.component.html',
  styleUrls:       ['./rack-creator.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RackCreatorComponent implements OnInit {
  public readonly save$ = new Subject<void>();
  data$ = new BehaviorSubject<[]>([]);
  
  fields = {
    hp:   {
      label:   'hp',
      code:    'hp',
      flex:    '6rem',
      control: new FormControl('84', Validators.compose([
        Validators.required,
        Validators.min(2),
        Validators.max(416),
        CustomValidators.onlyIntegers
      ])),
      type:    FormTypes.NUMBER
    },
    rows: {
      label:   'Rows',
      code:    'rows',
      flex:    '6rem',
      control: new FormControl('2', Validators.compose([
        Validators.required,
        Validators.min(1),
        Validators.max(10),
        CustomValidators.onlyIntegers
      ])),
      type:    FormTypes.NUMBER
    },
    name: {
      label:   'Name',
      code:    'name',
      flex:    '6rem',
      control: new FormControl('My new rack', Validators.compose([
        Validators.required,
        Validators.minLength(1),
        Validators.maxLength(32)
        // Validators.max(12)
      ])),
      type:    FormTypes.TEXT
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
    public dialogRef: MatDialogRef<RackCreatorComponent, RackCreatorOutModel>,
    @Inject(MAT_DIALOG_DATA) public data: RackCreatorInModel
  ) {
    
    this.save$
        .pipe(
          switchMap(x => this.backend.add.rack(
            {
              authorid: this.backend.getUser().id,
              name:     this.fields.name.control.value,
              hp:       this.fields.hp.control.value,
              rows:     this.fields.rows.control.value
            }
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
