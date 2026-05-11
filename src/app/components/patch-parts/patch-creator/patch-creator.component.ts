import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  OnInit, OnDestroy
} from '@angular/core';
import {
  FormControl,
  UntypedFormControl,
  Validators
} from '@angular/forms';
import {
  BehaviorSubject,
  Subject
} from 'rxjs';
import {
  switchMap,
  takeUntil
} from 'rxjs/operators';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { FormTypes } from 'src/app/shared-interproject/components/@smart/mat-form-entity/form-element-models';
import { IMatFormEntityConfig } from 'src/app/shared-interproject/components/@smart/mat-form-entity/mat-form-entity.component';
import { MatSnackBar } from "@angular/material/snack-bar";
import {
  MAT_DIALOG_DATA,
  MatDialogRef
} from "@angular/material/dialog";
import {
  adjectives,
  animals,
  colors,
  uniqueNamesGenerator
} from 'unique-names-generator';


export interface PatchCreatorOutModel {
}

export interface PatchCreatorInModel {
}

@Component({
  selector: 'app-patch-creator',
  templateUrl: './patch-creator.component.html',
  styleUrls: ['./patch-creator.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class PatchCreatorComponent implements OnInit, OnDestroy {
  public readonly save$ = new Subject<void>();
  data$ = new BehaviorSubject<[]>([]);
  
  fields: {
    name: IMatFormEntityConfig;
    public: {
      code: string;
      control: FormControl<boolean>;
    };
  } = {
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
    name: {
      label:   'Name',
      code:    'name',
      flex:    '6rem',
      control: new UntypedFormControl(this.generatePatchName(), Validators.compose([
        Validators.required,
        Validators.minLength(1),
        Validators.maxLength(32)
        // Validators.max(12)
      ])),
      type:    FormTypes.TEXT,
      iconL1: 'label',
      ergonomics: {
        autofocus: true,
        enterkeyhint: 'done'
      }
    },
    public: {
      code: 'public',
      control: new FormControl<boolean>(true, { nonNullable: true })
    }
  };
  protected destroyEvent$ = new Subject<void>();
  
  private generatePatchName(): string {
    return uniqueNamesGenerator({
      dictionaries: [adjectives, colors, animals],
      separator: ' ',
      style: 'capital',
      length: 2
    });
  }
  
  ngOnDestroy(): void {
    this.destroyEvent$.next();
    this.destroyEvent$.complete();
    
  }
  
  constructor(
    public snackBar: MatSnackBar,
    public backend: SupabaseService,
    public dialogRef: MatDialogRef<PatchCreatorComponent, PatchCreatorOutModel>,
    @Inject(MAT_DIALOG_DATA) public data: PatchCreatorInModel
  ) {
    
    this.save$
        .pipe(
          switchMap(x => this.backend.add.patch(
            {
              name: this.fields.name.control.value,
              public: this.fields.public.control.value
              // hp:       this.fields.hp.control.value,
              // rows:     this.fields.rows.control.value
            }
          )),
          takeUntil(this.destroyEvent$)
        )
        .subscribe(value => {
          const patchName = this.fields.name.control.value;
          this.snackBar.open(`"${ patchName }" created and saved to your library.`, undefined, {
            duration: 3000,
            panelClass: 'snack-success'
          })
            .onAction()
            .subscribe(() => {
            });
      
          this.dialogRef.close();
        });
  }
  
  ngOnInit(): void {
  }
  
}
