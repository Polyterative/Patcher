import { Injectable } from '@angular/core';
import {
  FormControl,
  FormGroup,
  UntypedFormControl,
  UntypedFormGroup,
  Validators
} from '@angular/forms';
import { MatDialog } from "@angular/material/dialog";
import { MatSnackBar } from "@angular/material/snack-bar";
import {
  BehaviorSubject,
  merge,
  Observable,
  of,
  Subject
} from 'rxjs';
import {
  filter,
  map,
  share,
  startWith,
  switchMap,
  takeUntil,
  tap
} from 'rxjs/operators';
import { StandardsService } from 'src/app/components/format-translator/standards.service';
import { MinimalModule } from 'src/app/models/module';
import {
  CustomValidators,
  FormTypes,
  getCleanedValueId
} from 'src/app/shared-interproject/components/@smart/mat-form-entity/form-element-models';
import {
  ConfirmDialogComponent,
  ConfirmDialogDataInModel,
  ConfirmDialogDataOutModel
} from 'src/app/shared-interproject/dialogs/confirm-dialog/confirm-dialog.component';
import { SupabaseService } from '../../backend/supabase.service';
import { SubManager } from "src/app/shared-interproject/directives/subscription-manager";
import { DomSanitizer } from "@angular/platform-browser";


import { plainSanitize } from "src/app/shared-interproject/components/@smart/mat-form-entity/app-form-utils";
import { Router } from "@angular/router";


@Injectable()
export class ModuleAdderDataService extends SubManager {
  
  similarModulesData$ = new BehaviorSubject<MinimalModule[] | undefined>(undefined);
  updateModulesList$ = new Subject<void>();
  //
  submitModuleForm$  = new Subject<void>();
  
  formData: {
    standard: {
      code: string;
      flex: string;
      control: FormControl<any>;
      label: string;
      options$: Observable<any[] | {
        name: string;
        id: number
      }[]>;
      type: FormTypes
    };
    diy: {
      code: string;
      flex: string;
      hint: string;
      control: FormControl<any>;
      label: string;
      options$: Observable<({
        name: string;
        id: string
      })[]>;
      type: FormTypes
    };
    name: {
      code: string;
      flex: string;
      hint: string;
      control: FormControl<any>;
      label: string;
      type: FormTypes
    };
    hp: {
      code: string;
      flex: string;
      control: FormControl<any>;
      label: string;
      type: FormTypes
    };
    description: {
      code: string;
      flex: string;
      hint: string;
      control: FormControl<any>;
      label: string;
      type: FormTypes
    };
    manual: {
      code: string;
      flex: string;
      hint: string;
      control: FormControl<any>;
      label: string;
      type: FormTypes
    };
    manufacturer: {
      code: string;
      flex: string;
      hint: string;
      control: FormControl<any>;
      label: string;
      type: FormTypes;
      options$: Observable<any>
    }
  };
  
  formGroup: FormGroup;
  
  constructor(
    readonly formatTranslatorService: StandardsService,
    public backend: SupabaseService,
    public dialog: MatDialog,
    public snackBar: MatSnackBar,
    private sanitizer: DomSanitizer,
    private router: Router
  ) {
    super();
    this.formData = {
      name:         {
        label: 'Name',
        code:  'name',
        flex:  '6rem',
        hint:  'Example: Maths',
        control: new UntypedFormControl('', Validators.compose([
          Validators.required,
          Validators.minLength(1),
          Validators.maxLength(144)
        ])),
        type:  FormTypes.TEXT
      },
      description:  {
        label: 'Description (brief)',
        code:  'description',
        flex:  '6rem',
        hint:  'Example: Analog computer designed for musical purposes',
        control: new UntypedFormControl('', Validators.compose([
          // Validators.required,
          Validators.minLength(1),
          Validators.maxLength(144 * 4)
        ])),
        type:  FormTypes.AREA
      },
      manufacturer: {
        label:    'Manufacturer',
        code:     'manufacturer',
        flex:     '6rem',
        hint:     'Example: Doepfer',
        control:  new UntypedFormControl('', Validators.compose([
          Validators.required
        ])),
        type:     FormTypes.AUTOCOMPLETE,
        options$: this.backend.GET.manufacturers(0, 99999, 'id,name')
                    .pipe(
                      map(x => x.data.map(z => ({
                        id:   z.id.toString(),
                        name: z.name
                      }))),
                      startWith([]),
                      share() // protects against multiple network requests
                    )
        
      },
      hp:           {
        label: 'HP',
        code:  'hp',
        flex:  '6rem',
        control: new UntypedFormControl('8', Validators.compose([
          Validators.required,
          Validators.min(1),
          Validators.max(216),
          CustomValidators.onlyIntegers
        ])),
        type:  FormTypes.NUMBER
      },
      manual:       {
        label: 'Manual URL',
        code:  'manual',
        flex:  '6rem',
        hint:  'PDF if available, include \'https://\')',
        control: new UntypedFormControl('', Validators.compose([
          Validators.minLength('https://'.length + 1),
          Validators.maxLength(999),
          CustomValidators.includesHttps
        ])),
        type:  FormTypes.TEXT
      },
      standard:     {
        label:    'Standard',
        code:     'format',
        flex:     '6rem',
        control:  new UntypedFormControl('', Validators.compose([
          Validators.required
        ])),
        options$: this.formatTranslatorService.standards.data$.pipe(
          filter(x => x !== undefined),
          map(x => x.map(y => ({
            id: y.id,
            name: y.name
          }))),
          startWith([]),
          share() // protects against multiple network requests
        ),
        type:     FormTypes.SELECT
      },
      diy:          {
        label:    'DIY/Commercial',
        code:     'diy',
        flex:     '6rem',
        hint:     '',
        control:  new UntypedFormControl({
          id: '0',
          name: 'Commercial'
        }, Validators.compose([
          Validators.required
        ])),
        options$: of([
          {
            id: '0',
            name: 'Commercial'
          },
          {
            id: '1',
            name: 'DIY'
          }
        ]),
        type:     FormTypes.SELECT
      }
    }
    
    
    this.formGroup = new UntypedFormGroup({
      name:        this.formData.name.control,
      description: this.formData.description.control,
      manufacturer: this.formData.manufacturer.control,
      hp:          this.formData.hp.control,
      format:      this.formData.standard.control,
      manual:      this.formData.manual.control,
      diy:         this.formData.diy.control
    });
    
    // apply default on init
    this.formData.standard.options$.pipe(
      tap(() => this.formData.standard.control.disable()),
      filter(x => x !== undefined),
      filter(x => x.length > 0),
      takeUntil(this.destroy$)
    )
      .subscribe(x => {
        this.formData.standard.control.enable();
        
        const found: any = x.find(y => y.id === 0);
        if (found) {
          this.formData.standard.control.setValue(found);
        }
        
      });
    
    // enable on init
    this.formData.manufacturer.options$.pipe(
      tap(() => this.formData.manufacturer.control.disable()),
      filter(x => x !== undefined),
      filter(x => x.length > 0),
      takeUntil(this.destroy$)
    )
      .subscribe(x => {
        this.formData.manufacturer.control.enable();
      });
    
    // when user changes name or manufacturer, we need to update the list of similar modules
    merge(
      this.formData.name.control.valueChanges,
      this.formData.manufacturer.control.valueChanges
    )
      .pipe(
        takeUntil(this.destroy$)
      )
      .subscribe(_ => {
        this.updateModulesList$.next();
      });
    
    // when requested similar modules list is updated, update the list
    this.updateModulesList$
      .pipe(
        tap(() => this.similarModulesData$.next(undefined)),
        filter(() => this.formData.name.control.value.length !== '' || this.formData.manufacturer.control.value.length !== ''),
        switchMap(() => this.backend.GET.modules(0, (10) - 1, this.formData.name.control.value, undefined, undefined, parseInt(getCleanedValueId(this.formData.manufacturer.control)), undefined, undefined, undefined, undefined, false)),
        takeUntil(this.destroy$)
      )
      .subscribe(x => {
        this.similarModulesData$.next(x.data);
      });
    
    // when user submits the form, we need to add the module on the server
    this.submitModuleForm$
      .pipe(
        switchMap(x => {
          
          const data: ConfirmDialogDataInModel = {
            title:       'Submit',
            description: 'Are you sure you want to submit this module? Please verify that all information is correct.',
            positive:    {
              label: 'Submit',
              theme: 'primary'
            },
            negative:    {
              label: 'Cancel',
              theme: 'negative'
            }
          };
          
          return this.dialog.open(
            ConfirmDialogComponent,
            {
              data,
              disableClose: false
            }
          )
            .afterClosed()
            .pipe(filter((x: ConfirmDialogDataOutModel) => x && x.answer)
            );
        }),
        tap(() => this.similarModulesData$.next(undefined)),
        map(() => {
          const manualValue    = this.formData.manual.control.value;
          const manualURL: any = manualValue && manualValue.length > 'https://'.length ? manualValue : undefined;
          
          return {
            name: plainSanitize(this.sanitizer, this.formData.name.control.value),
            description: plainSanitize(this.sanitizer, this.formData.description.control.value),
            manufacturerId: parseInt(getCleanedValueId(this.formData.manufacturer.control)),
            hp: parseInt(this.formData.hp.control.value),
            standard: parseInt(this.formData.standard.control.value.id),
            manualURL: plainSanitize(this.sanitizer, manualURL),
            isApproved: false,
            isDIY: this.formData.diy.control.value.id === '1',
            public: true
          };
          
        }),
        filter(x => !!x),
        switchMap((x: any) => this.backend.add.modules([x])),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        
        this.formData.name.control.setValue('');
        this.formData.description.control.setValue('');
        this.formData.manual.control.setValue('');
        this.formData.hp.control.setValue('');
        
        // inform user that the module was added
        this.snackBar.open(
          `
            Module submitted!
            Thank you very much for your contribution! 🙏
            It is now available to everyone
            `,
          '',
          {
            duration: 7000
          });
        
        // navigate to the module browser page
        this.router.navigate(
          ['/modules', 'browser'],
          {
            queryParams: {refresh: true},
            queryParamsHandling: 'merge' // This keeps existing query parameters and merges the new one.
          }
        );
      });
    
  }
  
}