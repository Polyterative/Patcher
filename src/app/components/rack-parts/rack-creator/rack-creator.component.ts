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
  combineLatest,
  Subject
} from 'rxjs';
import {
  filter,
  map,
  startWith,
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
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';
import { MinimalModule } from 'src/app/models/module';
import {
  ModuleCollectionAnalysisService,
  STANDARDS
} from 'src/app/components/rack-parts/module-collection-analysis.service';
import {
  adjectives,
  animals,
  colors,
  uniqueNamesGenerator
} from 'unique-names-generator';


export interface RackCreatorOutModel {
}

export interface RackCreatorInModel {
  userModules?: MinimalModule[];
}


@Component({
  selector: 'app-rack-creator',
  templateUrl: './rack-creator.component.html',
  styleUrls: ['./rack-creator.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class RackCreatorComponent extends SubManager implements OnInit {
  readonly save$ = new Subject<void>();
  
  private _userModules$ = new BehaviorSubject<MinimalModule[]>([]);
  readonly userModules$ = this._userModules$.asObservable();
  
  readonly rackAnalysis$: ReturnType<typeof combineLatest>;
  
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
    };
    public: {
      code: string;
      control: FormControl<boolean>;
    };
  };
  
  formGroup: FormGroup;
  
  constructor(
    public snackBar: MatSnackBar,
    public backend: SupabaseService,
    public dialogRef: MatDialogRef<RackCreatorComponent, RackCreatorOutModel>,
    @Inject(MAT_DIALOG_DATA) public data: RackCreatorInModel,
    private moduleCollectionAnalysisService: ModuleCollectionAnalysisService
  ) {
    super();
    
    // Initialize with user modules from parent if provided
    if (data.userModules) {
      this._userModules$.next(data.userModules);
    }
    
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
        control: new UntypedFormControl(this.generateRackName(), Validators.compose([
          Validators.required,
          Validators.minLength(1),
          Validators.maxLength(32)
          // Validators.max(12)
        ])),
        type: FormTypes.TEXT
      },
      public: {
        code: 'public',
        control: new FormControl<boolean>(true, { nonNullable: true })
      }
    };
    
    this.formGroup = new UntypedFormGroup({
      [this.fields.hp.code]: this.fields.hp.control,
      [this.fields.name.code]: this.fields.name.control,
      [this.fields.rows.code]: this.fields.rows.control,
      [this.fields.public.code]: this.fields.public.control
    });
    
    // Initialize rackAnalysis$ after fields are set up
    // Rack creator only cares about larger format modules (3U and above),
    // so exclude small formats (Intellijel 1U and PulpLogic 1U)
    this.rackAnalysis$ = combineLatest([
      this.fields.hp.control.valueChanges.pipe(startWith(this.fields.hp.control.value)),
      this.fields.rows.control.valueChanges.pipe(startWith(this.fields.rows.control.value)),
      this.userModules$
    ]).pipe(
      map(([hp, rows, modules]) => {
        // Filter out small 1U formats (Intellijel and PulpLogic), keep all larger formats
        const largeFormatModules = (modules || []).filter(m => {
          if (!m) return false;
          const standardId = m.standard?.id ?? STANDARDS.EURORACK_3U.id;
          // Exclude Intellijel 1U (id: 1) and PulpLogic 1U (id: 2)
          return standardId !== STANDARDS.INTELLIJEL_1U.id && standardId !== STANDARDS.PULPLOGIC_1U.id;
        });
        return this.moduleCollectionAnalysisService.analyzeRackConfiguration(hp, rows, largeFormatModules);
      })
    );
    
    
    this.save$
      .pipe(
        withLatestFrom(this.backend.auth.getUserSession$()),
        // check if user is logged in
        filter(([_, user]) => !!user),
        // create rack in database
        switchMap(() => this.backend.add.rack(
          {
            name: this.fields.name.control.value,
            hp: this.fields.hp.control.value,
            rows: this.fields.rows.control.value,
            public: this.fields.public.control.value,
            locked: false
          }
        )),
        takeUntil(this.destroy$)
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
  
  private generateRackName(): string {
    return uniqueNamesGenerator({
      dictionaries: [adjectives, colors, animals],
      separator: ' ',
      style: 'capital',
      length: 2
    });
  }
  
  ngOnInit(): void {
    // rackAnalysis$ is now a direct Observable that the template subscribes to via async pipe
  }
  
}
