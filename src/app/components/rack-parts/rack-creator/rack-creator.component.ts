import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  OnInit
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  UntypedFormControl,
  UntypedFormGroup,
  Validators
} from '@angular/forms';
import {
  BehaviorSubject,
  Subject
} from 'rxjs';
import {
  filter,
  map,
  switchMap,
  takeUntil,
  withLatestFrom
} from 'rxjs/operators';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import {
  CustomValidators,
  FormTypes
} from 'src/app/shared-interproject/components/@smart/mat-form-entity/form-element-models';
import { MatSnackBar } from "@angular/material/snack-bar";
import {
  MAT_DIALOG_DATA,
  MatDialogRef
} from "@angular/material/dialog";


export interface RackCreatorOutModel {
}

export interface RackCreatorInModel {
}

@Component({
  selector: 'app-rack-creator',
  templateUrl: './rack-creator.component.html',
  styleUrls: ['./rack-creator.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RackCreatorComponent implements OnInit {
  readonly save$ = new Subject<void>();
  data$ = new BehaviorSubject<[]>([]);
  
  fields: {
    hp: {
      code: string;
      flex: string;
      control: FormControl<any>;
      label: string;
      type: FormTypes
    };
    name: {
      code: string;
      flex: string;
      control: FormControl<any>;
      label: string;
      type: FormTypes
    };
    rows: {
      code: string;
      flex: string;
      control: FormControl<any>;
      label: string;
      type: FormTypes
    }
  };
  protected destroyEvent$ = new Subject<void>();
  
  formGroup: FormGroup;
  
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
    
    this.fields = {
      hp: {
        label: 'HP (per row)',
        code: 'hp',
        flex: '6rem',
        control: new UntypedFormControl('84', Validators.compose([
          Validators.required,
          Validators.min(2),
          Validators.max(216),
          CustomValidators.onlyIntegers
        ])),
        type: FormTypes.NUMBER
      },
      rows: {
        label: 'Vertical rows amount',
        code: 'rows',
        flex: '6rem',
        control: new UntypedFormControl('2', Validators.compose([
          Validators.required,
          Validators.min(1),
          Validators.max(10),
          CustomValidators.onlyIntegers
        ])),
        type: FormTypes.NUMBER
      },
      name: {
        label: 'Name',
        code: 'name',
        flex: '6rem',
        control: new UntypedFormControl('My new rack', Validators.compose([
          Validators.required,
          Validators.minLength(1),
          Validators.maxLength(32)
          // Validators.max(12)
        ])),
        type: FormTypes.TEXT
      }
    };
    
    this.formGroup = new UntypedFormGroup({
      [this.fields.hp.code]: this.fields.hp.control,
      [this.fields.name.code]: this.fields.name.control,
      [this.fields.rows.code]: this.fields.rows.control
    });
    
    
    this.save$
      .pipe(
        withLatestFrom(this.backend.getUserSession$()),
        // check if user is logged in
        filter(([_, user]) => !!user),
        map(([_, user]) => user),
        // create rack in database
        switchMap(user => this.backend.add.rack(
          {
            authorid: user.id,
            name: this.fields.name.control.value,
            hp: this.fields.hp.control.value,
            rows: this.fields.rows.control.value,
            locked: false
          }
        )),
        takeUntil(this.destroyEvent$)
      )
      .subscribe(() => {
        // success and open the new rack action
        this.snackBar.open('Rack created', undefined, {
          duration: 3000
        })
          .onAction()
          .subscribe(() => {
            // this.router.navigate(['rack', value.id]);
          });
        
        this.dialogRef.close();
      });
  }
  
  ngOnInit(): void {
  }
  
}