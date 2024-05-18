import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnDestroy,
  OnInit
} from '@angular/core';
import {
  FormGroup,
  UntypedFormBuilder,
  UntypedFormControl,
  UntypedFormGroup,
  ValidatorFn,
  Validators
} from '@angular/forms';
import { MatSnackBar } from "@angular/material/snack-bar";
import {
  BehaviorSubject,
  concat,
  from,
  NEVER,
  of,
  Subject
} from 'rxjs';
import {
  catchError,
  filter,
  map,
  startWith,
  switchMap,
  takeUntil,
  withLatestFrom
} from 'rxjs/operators';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { CV } from 'src/app/models/cv';
import { DbModule } from 'src/app/models/module';
import { FileDragHostService } from 'src/app/shared-interproject/components/@smart/file-drag-host/file-drag-host.service';
import { FormTypes } from 'src/app/shared-interproject/components/@smart/mat-form-entity/form-element-models';
import { IMatFormEntityConfig } from 'src/app/shared-interproject/components/@smart/mat-form-entity/mat-form-entity.component';
import { ModuleDetailDataService } from '../module-detail-data.service';


export interface FormCV {
  id: number;
  name: UntypedFormControl;
  a: UntypedFormControl;
  b: UntypedFormControl;
  isApproved: boolean;
}

let URLReg = '(https?://)?([\\da-z.-]+)\\.([a-z.]{2,6})[/\\w .-]*/?';

@Component({
  selector:        'app-module-editor',
  templateUrl:     './module-editor.component.html',
  styleUrls:       ['./module-editor.component.scss'],
  providers:       [
    FileDragHostService
  ],
  animations:      [
    // fadeInExpandOnEnterAnimation(
    //   {
    //     duration: 250,
    //     anchor:   'enter'
    //   }
    // ),
    // fadeOutCollapseOnLeaveAnimation(
    //   {
    //     duration: 250,
    //     anchor:   'exit'
    //   }
    // )
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModuleEditorComponent implements OnInit, OnDestroy {
  @Input() data: DbModule;
  readonly save$ = new Subject<void>();
  readonly savePanels$ = new Subject<void>();
  
  removeIN$ = new Subject<number>();
  removeOUT$ = new Subject<number>();
  //
  addIN$ = new Subject<CV>();
  addOUT$ = new Subject<CV>();
  addSwitch$ = new Subject<void>();
  
  types = FormTypes;
  
  INs$: BehaviorSubject<FormCV[]> = new BehaviorSubject([]);
  OUTs$: BehaviorSubject<FormCV[]> = new BehaviorSubject([]);
  
  formGroupA: FormGroup;
  formGroupB: FormGroup;
  // formGroupC = this.formBuilder.group({});
  //
  panelDescription: IMatFormEntityConfig
  panelType: IMatFormEntityConfig;
  formGroupPanel: FormGroup
  //
  protected destroyEvent$ = new Subject<void>();
  
  private validatorsNum: ValidatorFn = Validators.compose([
    // Validators.required,
    Validators.max(12),
    Validators.min(-12)
  ]);
  
  private validatorsName: ValidatorFn = Validators.compose([
    Validators.required,
    Validators.minLength(1),
    Validators.maxLength(36)
  ]);
  
  constructor(
    public backend: SupabaseService,
    public formBuilder: UntypedFormBuilder,
    public dataService: ModuleDetailDataService,
    // public userManagementService: UserManagementService,
    public snackBar: MatSnackBar,
    public fileDragHostService: FileDragHostService,
    // public HttpClient: HttpClient
  ) {
    
    this.panelDescription = {
      code: 'panelDescription',
      label: 'Panel Description',
      type: FormTypes.TEXT,
      control: new UntypedFormControl('', [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(144)
      ]),
      flex: 'auto'
    };
    
    this.panelType = {
      code: 'panelType',
      label: 'Panel Type',
      type: FormTypes.SELECT,
      control: new UntypedFormControl({
        name: 'Light',
        value: 1,
        id: '0'
      }, [Validators.required]),
      options$: of([
        {
          name: 'Light',
          value: 1,
          id: '0'
        },
        {
          name: 'Dark',
          value: 2,
          id: '1'
        },
        {
          name: 'Special edition',
          value: 3,
          id: '1'
        },
        {
          name: 'Limited edition',
          value: 4,
          id: '1'
        }
        // {
        //   name:  'Silver',
        //   value: 4,
        //   id:    '1'
        // }
      ]),
      flex: 'auto'
    };
    
    
    this.formGroupPanel = this.formBuilder.group({
      'panelDescription': this.panelDescription.control,
      'panelType': this.panelType.control
    });
    
    this.formGroupA = this.formBuilder.group({});
    this.formGroupB = this.formBuilder.group({});
    
    this.addIN$.pipe(takeUntil(this.destroyEvent$))
        .subscribe(cv => {
          const formCVS: FormCV[] = [
            ...this.INs$.value,
            this.createFomCV(cv)
          ];
          this.updateFormGroupAndContainer(
            formCVS,
            this.formGroupA,
            this.INs$
          );
      
        });
    
    this.addOUT$.pipe(takeUntil(this.destroyEvent$))
        .subscribe(cv => {
          const formCVS: FormCV[] = [
            ...this.OUTs$.value,
            this.createFomCV(cv)
          ];
          this.updateFormGroupAndContainer(
            formCVS,
            this.formGroupB,
            this.OUTs$
          );
      
        });
    
    this.removeIN$.pipe(takeUntil(this.destroyEvent$))
        .subscribe(i => {
          const x = this.INs$.value;
          x.splice(i, 1);
      
          this.updateFormGroupAndContainer(x, this.formGroupA, this.INs$);
        });
    
    this.removeOUT$.pipe(takeUntil(this.destroyEvent$))
        .subscribe(i => {
          const x = this.OUTs$.value;
          x.splice(i, 1);
      
          this.updateFormGroupAndContainer(x, this.formGroupB, this.OUTs$);
        });
    
    this.save$.pipe(
      map(() => ([
        this.formCVToCV(this.INs$.value),
        this.formCVToCV(this.OUTs$.value)
      ])),
      filter(([ins, outs]) => {
        
        if (ins.length === 0 && outs.length === 0) {
          this.snackBar.open('Nothing to save', null, {
            duration: 2000
          });
          this.reload();
          
          return false;
        }
        
        // avoid saving if all are approved
        const approvedIns = ins.filter(cv => cv.isApproved);
        const approvedOuts = outs.filter(cv => cv.isApproved);
        
        const sameApproved: boolean = approvedIns.length === this.data.ins.length && approvedOuts.length === this.data.outs.length;
        
        const sameUnapproved: boolean = ins.length === this.data.ins.length && outs.length === this.data.outs.length;
        
        if (sameApproved && sameUnapproved) {
          this.snackBar.open('All CVs are approved. Nothing to save.', null, {
            duration: 3000
          });
          
          this.reload();
          
          return false;
        } else {
          return true;
        }
        
      }),
      switchMap(([ins, outs]) => {
        return concat(
          this.backend.update.moduleINsOUTs(
            this.data.id,
            ins,
            outs
          ),
          // update only updated time
          this.backend.update.module({
            id: this.data.id
          })
        );
      }),
      withLatestFrom(this.dataService.updateSingleModuleData$),
      takeUntil(this.destroyEvent$)
    )
        .subscribe(([x, updateSingleModuleData]) => {
            this.dataService.updateSingleModuleData$.next(updateSingleModuleData);
          
          // let message: string = `The community appreciates your effort, thank you for your contribution. Your efforts will be remembered.`;
          this.snackBar.open("Thank you for your contribution!", undefined, {
              duration: 5000
            });
          }
        );
  
  
    // write default description on changes
    this.panelType.control.valueChanges
        .pipe(
          takeUntil(this.destroyEvent$),
          startWith(this.panelType.control.value),
          withLatestFrom(this.panelType.options$)
        )
        .subscribe(([panelTypeValue, options]) => {
          let descValue: string = this.panelDescription.control.value;
          let isValueADefaultOptionDerivedOne = options.map(x => x.name)
                                                       .includes(descValue);
    
          if (descValue === '' || isValueADefaultOptionDerivedOne
          ) {
            this.panelDescription.control.patchValue(panelTypeValue.name);
          }
        });
  
    // on savePanels$ upload image to server
    this.savePanels$.pipe(
      map(() => this.fileDragHostService.files$.value[0]),
      switchMap(file => (from(file.arrayBuffer())
        .pipe(withLatestFrom(of([
          file.name,
          file.type
        ]))))),
      switchMap(([file, [filename, fileType]]) => {
        let extension: string = filename.split('.')
                                        .pop();
        let name: string = `${ this.data.name.replace(/[^a-z0-9]/gi, '_') }-${ this.data.manufacturer.name.replace(/[^a-z0-9]/gi, '_') }-${ this.panelType.control.value.name }-${ this.data.standard.name }`;
        let filenameAndExtension: string = `${ name }.${ extension }`;
        return this.backend.storage.uploadModulePanel(
          file,
          filenameAndExtension,
          fileType
        );
      }),
      switchMap(dbFilename => this.backend.add.panel([
        {
          filename:    dbFilename,
          color:       +this.panelType.control.value.value,
          description: this.panelDescription.control.value,
          moduleid:    this.data.id
        }
      ])),
      // update only updated time
      switchMap(() => this.backend.update.module({
        id: this.data.id
      })),
      // also update the module to update it's last updated datetime
      catchError(() => {
          this.snackBar.open('Something went wrong during the upload, please try again');
          return of(NEVER);
        }
      ),
    )
        .subscribe(x => {
          // feedback to user
          // let message = '✔ Panel added, thanks! Will be available as soon as reviewed and approved.';
          let message = '✔ Panel added, thanks! It is now available for the community';
          
          this.snackBar.open(message, undefined, {
            duration: 10000
          });
      
          // reload data
          this.dataService.updateSingleModuleData$.next(this.data.id);
        });
  }
  
  ngOnDestroy(): void {
    this.destroyEvent$.next();
    this.destroyEvent$.complete();
    
  }
  
  ngOnInit(): void {
    
    const ins: CV[] = this.data.ins;
    ins.forEach(x => this.addIN$.next(x));
    const outs: CV[] = this.data.outs;
    outs.forEach(x => this.addOUT$.next(x));
    
  }
  
  private reload(): void {
    of(null)
      .pipe(
        withLatestFrom(this.dataService.updateSingleModuleData$)
      )
      .subscribe(([_, x]) => {
        this.dataService.updateSingleModuleData$.next(x);
      });
  }
  
  private updateFormGroupAndContainer(cvs: FormCV[], group: UntypedFormGroup, subject: BehaviorSubject<FormCV[]>): void {
    
    for (const key in group.controls) {
      group.removeControl(key);
    }
    
    // only add CV if not approved
    cvs.filter(cv => cv.isApproved === undefined || cv.isApproved === false)
       .forEach((a, i) => {
         group.addControl(`name${ i.toString() }`, a.name);
         group.addControl(`a${ i.toString() }`, a.a);
         group.addControl(`b${ i.toString() }`, a.b);
       });
    
    subject.next(cvs);
    
  }
  
  private serialize(cvs: CV[]): string {
    return JSON.stringify(cvs);
  }
  
  private createFomCV(data: Partial<CV>): FormCV {
    const toReturn: { a: UntypedFormControl; b: UntypedFormControl; name: UntypedFormControl; id: number; isApproved: boolean } = {
      name:       new UntypedFormControl(data.name, this.validatorsName),
      a:          new UntypedFormControl(data.min, this.validatorsNum),
      b:          new UntypedFormControl(data.max, this.validatorsNum),
      id:         data.id,
      isApproved: data.isApproved
    };
  
    // disable if has been uploaded already on the server and approved
    if (data.id > 0 && data.isApproved) {
      toReturn.name.disable();
      toReturn.a.disable();
      toReturn.b.disable();
    }
    
    return toReturn;
  }
  
  private formCVToCV(formCVS: FormCV[]): CV[] {
    const x = formCVS.map(formCV => ({
      name: formCV.name.value,
      // description?: string;
      id:         formCV.id,
      min:        formCV.a.value,
      max:        formCV.b.value,
      isApproved: formCV.isApproved ? formCV.isApproved : false
      // isVOCT?: boolean;
    }));
    
    return x;
  }
  
}