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


export interface RackCreatorOutModel {
}

export interface RackCreatorInModel {
  userModules?: MinimalModule[];
}

interface StandardAnalysis {
  standardId: number;
  standardName: string;
  moduleCount: number;
  largestModuleHp: number;
  totalModulesHp: number;
  canFitLargest: boolean;
}

interface RackAnalysis {
  totalCapacity: number;
  moduleCount: number;
  totalModulesHp: number;
  utilizationPercent: number;
  recommendation: string;
  warningMessage?: string;
  standardAnalyses: StandardAnalysis[];
  primaryStandard?: StandardAnalysis;
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
  
  readonly rackAnalysis$: BehaviorSubject<RackAnalysis | null> = new BehaviorSubject<RackAnalysis | null>(null);
  
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
  
  formGroup: FormGroup;
  
  constructor(
    public snackBar: MatSnackBar,
    public backend: SupabaseService,
    public dialogRef: MatDialogRef<RackCreatorComponent, RackCreatorOutModel>,
    @Inject(MAT_DIALOG_DATA) public data: RackCreatorInModel
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
            public: true,
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
  
  ngOnInit(): void {
    // Analyze rack configuration whenever HP or rows change
    combineLatest([
      this.fields.hp.control.valueChanges.pipe(startWith(this.fields.hp.control.value)),
      this.fields.rows.control.valueChanges.pipe(startWith(this.fields.rows.control.value)),
      this.userModules$
    ])
      .pipe(
        map(([hp, rows, modules]) => this.analyzeRackConfiguration(hp, rows, modules)),
        takeUntil(this.destroy$)
      )
      .subscribe(analysis => this.rackAnalysis$.next(analysis));
  }
  
  private analyzeRackConfiguration(hp: number, rows: number, modules: MinimalModule[]): RackAnalysis {
    const totalCapacity = Number(hp) * Number(rows);
    
    if (modules.length === 0) {
      return {
        totalCapacity,
        moduleCount: 0,
        totalModulesHp: 0,
        utilizationPercent: 0,
        recommendation: 'Standard eurorack case (84 HP × 2 rows)',
        warningMessage: undefined,
        standardAnalyses: [],
        primaryStandard: undefined
      };
    }
    
    // Group modules by standard
    const modulesByStandard = new Map<number, MinimalModule[]>();
    modules.forEach(module => {
      const standardId = module.standard?.id ?? 0;
      if (!modulesByStandard.has(standardId)) {
        modulesByStandard.set(standardId, []);
      }
      modulesByStandard.get(standardId)!.push(module);
    });
    
    // Analyze each standard family
    const standardAnalyses: StandardAnalysis[] = [];
    modulesByStandard.forEach((standardModules, standardId) => {
      const moduleHpValues = standardModules.map(m => m.hp);
      const largestModuleHp = Math.max(...moduleHpValues);
      const totalModulesHp = moduleHpValues.reduce((sum, hp) => sum + hp, 0);
      const canFitLargest = hp >= largestModuleHp;
      
      const standardName = this.getStandardName(standardId);
      
      standardAnalyses.push({
        standardId,
        standardName,
        moduleCount: standardModules.length,
        largestModuleHp,
        totalModulesHp,
        canFitLargest
      });
    });
    
    // Sort by module count (descending) to find the primary standard
    standardAnalyses.sort((a, b) => b.moduleCount - a.moduleCount);
    
    // Primary standard is the one with most modules
    const primaryStandard = standardAnalyses[0];
    
    // Calculate overall stats
    const totalModulesHp = standardAnalyses.reduce((sum, std) => sum + std.totalModulesHp, 0);
    const utilizationPercent = (totalModulesHp / totalCapacity) * 100;
    
    // Calculate minimum rows needed if modules were grouped by standard
    const minRowsNeeded = standardAnalyses.reduce((sum, std) => sum + Math.ceil(std.totalModulesHp / hp), 0);
    
    // Generate intelligent recommendation based on grouped standards
    let recommendation: string;
    let warningMessage: string | undefined = undefined;
    
    // Check for warnings across all standards
    const problematicStandards = standardAnalyses.filter(std => !std.canFitLargest);
    if (problematicStandards.length > 0) {
      const issues = problematicStandards.map(std =>
        `${ std.standardName }: ${ std.largestModuleHp } HP`
      ).join(', ');
      warningMessage = `⚠️ Largest modules won't fit in ${ hp } HP row - ${ issues }`;
      recommendation = `Consider at least ${ Math.max(...problematicStandards.map(s => s.largestModuleHp)) } HP per row`;
    } else if (standardAnalyses.length > 1) {
      // Multiple standards detected - show all groups
      const standardSummary = standardAnalyses
        .map(std => `${ std.moduleCount } × ${ std.standardName }`)
        .join(', ');
      
      if (rows < minRowsNeeded) {
        recommendation = `Consider ${ minRowsNeeded }+ rows to separate ${ standardAnalyses.length } module families`;
      } else if (utilizationPercent > 90) {
        recommendation = `Tightly packed! ${ standardSummary } almost full`;
      } else {
        recommendation = `Good fit for ${ standardSummary } (${ utilizationPercent.toFixed(0) }% full)`;
      }
    } else if (standardAnalyses.length === 1) {
      // Single standard family - use primary (which is the only one)
      const std = primaryStandard;
      const modulesLabel = std.moduleCount === 1 ? 'module' : 'modules';
      
      if (utilizationPercent > 100) {
        const suggestedRows = Math.ceil(std.totalModulesHp / hp);
        recommendation = `All ${ std.moduleCount } ${ std.standardName } ${ modulesLabel } need ${ suggestedRows }+ rows (${ std.totalModulesHp } HP total)`;
      } else if (utilizationPercent > 80) {
        recommendation = `Perfect for your ${ std.moduleCount } ${ std.standardName } ${ modulesLabel } (${ utilizationPercent.toFixed(0) }% full)`;
      } else if (utilizationPercent > 50) {
        recommendation = `Good size for ${ std.moduleCount } ${ std.standardName } ${ modulesLabel } (${ utilizationPercent.toFixed(0) }% full)`;
      } else if (utilizationPercent > 20) {
        recommendation = `Spacious for ${ std.moduleCount } ${ std.standardName } ${ modulesLabel } (${ utilizationPercent.toFixed(0) }% full)`;
      } else {
        recommendation = `Very spacious (${ utilizationPercent.toFixed(0) }% full)`;
      }
    } else {
      // No modules - shouldn't happen but safe fallback
      recommendation = 'Standard eurorack case (84 HP × 2 rows)';
    }
    
    return {
      totalCapacity,
      moduleCount: modules.length,
      totalModulesHp,
      utilizationPercent,
      recommendation,
      warningMessage,
      standardAnalyses,
      primaryStandard
    };
  }
  
  private getStandardName(standardId: number): string {
    switch (standardId) {
      case 0:
        return '3U Eurorack';
      case 1:
        return 'Intellijel 1U';
      case 2:
        return 'PulpLogic 1U';
      default:
        return 'Unknown';
    }
  }
  
}