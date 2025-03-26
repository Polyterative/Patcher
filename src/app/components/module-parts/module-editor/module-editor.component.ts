import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnDestroy,
  OnInit
} from '@angular/core';
import {
  UntypedFormBuilder,
  UntypedFormControl,
  UntypedFormGroup,
  Validators
} from '@angular/forms';
import { MatSnackBar } from "@angular/material/snack-bar";
import {
  BehaviorSubject,
  concat,
  EMPTY,
  from,
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
  selector: 'app-module-editor',
  templateUrl: './module-editor.component.html',
  styleUrls: ['./module-editor.component.scss'],
  providers: [FileDragHostService],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModuleEditorComponent implements OnInit, OnDestroy {
  
  // Inputs
  @Input() data: DbModule;
  
  // Subjects and Observables
  readonly saveInsOuts$ = new Subject<void>();
  readonly savePanels$ = new Subject<void>();
  readonly savePower$ = new Subject<void>();
  readonly savePhysical$ = new Subject<void>();
  
  removeIN$ = new Subject<number>();
  removeOUT$ = new Subject<number>();
  addIN$ = new Subject<CV>();
  addOUT$ = new Subject<CV>();
  
  INs$ = new BehaviorSubject<FormCV[]>([]);
  OUTs$ = new BehaviorSubject<FormCV[]>([]);
  
  protected destroyEvent$ = new Subject<void>();
  
  // Forms and FormGroups
  formGroupA: UntypedFormGroup;
  formGroupB: UntypedFormGroup;
  formGroupPanel: UntypedFormGroup;
  formGroupPower: UntypedFormGroup;
  formGroupPhysical: UntypedFormGroup;
  
  panelDescription: IMatFormEntityConfig;
  panelType: IMatFormEntityConfig;
  
  powerRailPositive: IMatFormEntityConfig;
  powerRailNegative: IMatFormEntityConfig;
  powerRailFiveVolts: IMatFormEntityConfig;
  
  weight: IMatFormEntityConfig;
  depth: IMatFormEntityConfig;
  
  // Validators
  private validatorsNum = Validators.compose([
    Validators.max(12),
    Validators.min(-12)
  ]);
  
  private validatorsName = Validators.compose([
    Validators.required,
    Validators.minLength(1),
    Validators.maxLength(36)
  ]);
  
  private validatorsPower = Validators.compose([
    Validators.required,
    Validators.min(0),
    Validators.max(2000)
  ]);
  
  // Other properties
  types = FormTypes;
  
  constructor(
    public backend: SupabaseService,
    public formBuilder: UntypedFormBuilder,
    public dataService: ModuleDetailDataService,
    public snackBar: MatSnackBar,
    public fileDragHostService: FileDragHostService
  ) {
    this.initializeFormControls();
    this.initializeFormGroups();
    this.initializeSubscriptions();
  }
  
  ngOnInit(): void {
    if (this.data) {
      if (Array.isArray(this.data.ins)) {
        this.data.ins.forEach(cv => this.addIN$.next(cv));
      }
      if (Array.isArray(this.data.outs)) {
        this.data.outs.forEach(cv => this.addOUT$.next(cv));
      }
      
      // Initialize power form controls with data if available
      if (this.data.powerPos12 != null) {
        this.powerRailPositive.control.setValue(this.data.powerPos12);
      }
      
      if (this.data.powerNeg12 != null) {
        this.powerRailNegative.control.setValue(this.data.powerNeg12);
      }
      
      if (this.data.powerPos5 != null) {
        this.powerRailFiveVolts.control.setValue(this.data.powerPos5);
      }
      
      // Initialize physical form controls with data if available
      if (this.data.weight != null) {
        this.weight.control.setValue(this.data.weight);
      }
      
      if (this.data.depth != null) {
        this.depth.control.setValue(this.data.depth);
      }
      
    } else {
      console.error('Data input is undefined.');
    }
  }
  
  ngOnDestroy(): void {
    this.destroyEvent$.next();
    this.destroyEvent$.complete();
  }
  
  private initializeFormControls(): void {
    // Panel form controls
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
      control: new UntypedFormControl(
        {
          name: 'Light',
          value: 1,
          id: '0'
        },
        [Validators.required]
      ),
      options$: of([
        {name: 'Light', value: 1, id: '0'},
        {name: 'Dark', value: 2, id: '1'},
        {name: 'Special edition', value: 3, id: '2'},
        {name: 'Limited edition', value: 4, id: '3'}
      ]),
      flex: 'auto'
    };
    
    // Power form controls
    this.powerRailPositive = {
      code: 'powerRailPositive',
      label: '+12V Rail Current (mA)',
      type: FormTypes.NUMBER,
      control: new UntypedFormControl('', this.validatorsPower),
      flex: 'auto'
    };
    
    this.powerRailNegative = {
      code: 'powerRailNegative',
      label: '-12V Rail Current (mA)',
      type: FormTypes.NUMBER,
      control: new UntypedFormControl('', this.validatorsPower),
      flex: 'auto'
    };
    
    this.powerRailFiveVolts = {
      code: 'powerRailFiveVolts',
      label: '+5V Rail Current (mA)',
      type: FormTypes.NUMBER,
      control: new UntypedFormControl('', this.validatorsPower),
      flex: 'auto'
    };
    
    // Depth and weight form controls
    this.weight = {
      code: 'weight',
      label: 'Weight (g)',
      type: FormTypes.NUMBER,
      control: new UntypedFormControl('', [
        Validators.min(0),
        Validators.max(2000)
      ]),
      flex: 'auto'
    };
    
    this.depth = {
      code: 'depth',
      label: 'Depth (mm)',
      type: FormTypes.NUMBER,
      control: new UntypedFormControl('', [
        Validators.min(0),
        Validators.max(500)
      ]),
      flex: 'auto'
    };
  }
  
  private initializeFormGroups(): void {
    this.formGroupPanel = this.formBuilder.group({
      panelDescription: this.panelDescription.control,
      panelType: this.panelType.control
    });
    
    this.formGroupPower = this.formBuilder.group({
      powerRailPositive: this.powerRailPositive.control,
      powerRailNegative: this.powerRailNegative.control,
      powerRailFiveVolts: this.powerRailFiveVolts.control
    });
    
    this.formGroupA = this.formBuilder.group({});
    this.formGroupB = this.formBuilder.group({});
    
    this.formGroupPhysical = this.formBuilder.group({
      weight: this.weight.control,
      depth: this.depth.control
    });
  }
  
  private initializeSubscriptions(): void {
    // Subscriptions for adding INs
    this.addIN$
      .pipe(takeUntil(this.destroyEvent$))
      .subscribe(cv => {
        const formCVs = [...this.INs$.value, this.createFormCV(cv)];
        this.updateFormGroupAndContainer(formCVs, this.formGroupA, this.INs$);
      });
    
    // Subscriptions for adding OUTs
    this.addOUT$
      .pipe(takeUntil(this.destroyEvent$))
      .subscribe(cv => {
        const formCVs = [...this.OUTs$.value, this.createFormCV(cv)];
        this.updateFormGroupAndContainer(formCVs, this.formGroupB, this.OUTs$);
      });
    
    // Subscriptions for removing INs
    this.removeIN$
      .pipe(takeUntil(this.destroyEvent$))
      .subscribe(index => {
        const formCVs = [...this.INs$.value];
        formCVs.splice(index, 1);
        this.updateFormGroupAndContainer(formCVs, this.formGroupA, this.INs$);
      });
    
    // Subscriptions for removing OUTs
    this.removeOUT$
      .pipe(takeUntil(this.destroyEvent$))
      .subscribe(index => {
        const formCVs = [...this.OUTs$.value];
        formCVs.splice(index, 1);
        this.updateFormGroupAndContainer(formCVs, this.formGroupB, this.OUTs$);
      });
    
    // Subscription for saving INs and OUTs
    this.saveInsOuts$
      .pipe(
        map(() => [
          this.formCVToCV(this.INs$.value),
          this.formCVToCV(this.OUTs$.value)
        ]),
        filter(([ins, outs]) => this.shouldSaveInsOuts(ins, outs)),
        switchMap(([ins, outs]) =>
          concat(
            this.backend.update.moduleINsOUTs(this.data.id, ins, outs),
            this.backend.update.module({id: this.data.id})
          )
        ),
        catchError(error => {
          console.error('Error saving INs/OUTs:', error);
          this.snackBar.open('An error occurred while saving.', undefined, {
            duration: 5000
          });
          return EMPTY;
        }),
        withLatestFrom(this.dataService.updateSingleModuleData$),
        takeUntil(this.destroyEvent$)
      )
      .subscribe(([, updateSingleModuleData]) => {
        this.dataService.updateSingleModuleData$.next(updateSingleModuleData);
        this.snackBar.open('Thank you for your contribution!', undefined, {
          duration: 5000
        });
      });
    
    // Subscription for panelType control value changes
    this.panelType.control.valueChanges
      .pipe(
        takeUntil(this.destroyEvent$),
        startWith(this.panelType.control.value),
        withLatestFrom(this.panelType.options$)
      )
      .subscribe(([panelTypeValue, options]) => {
        const descValue = this.panelDescription.control.value;
        const isDefaultDescription = options
          .map(option => option.name)
          .includes(descValue);
        
        if (!descValue || isDefaultDescription) {
          this.panelDescription.control.patchValue(panelTypeValue.name);
        }
      });
    
    // Subscription for saving power data
    this.savePower$
      .pipe(
        switchMap(() => {
          // Check if the power form is valid
          if (this.formGroupPower.invalid) {
            this.snackBar.open('Please enter valid power values.', undefined, {
              duration: 5000
            });
            return EMPTY;
          }
          
          // Gather power data from controls
          const powerData = {
            powerPos12: this.powerRailPositive.control.value,
            powerNeg12: this.powerRailNegative.control.value,
            powerPos5: this.powerRailFiveVolts.control.value
          };
          
          // Perform a single update call with the full module data merged with the power data.
          // Ensure that the backend update method returns the updated module.
          return this.backend.update.module({
            ...this.data,
            ...powerData
          });
        }),
        catchError(error => {
          console.error('Error saving power data:', error);
          this.snackBar.open('An error occurred while saving power data.', undefined, {
            duration: 5000
          });
          return EMPTY;
        }),
        takeUntil(this.destroyEvent$)
      )
      .subscribe(updatedModule => {
        if (updatedModule) {
          this.snackBar.open('Power data saved successfully.', undefined, {
            duration: 5000
          });
          this.dataService.updateSingleModuleData$.next(this.data.id);
        }
        
      });
    
    
    // subscription for adding depth and weight
    this.savePhysical$
      .pipe(
        switchMap(() => {
          if (this.formGroupPhysical.invalid) {
            this.snackBar.open('Please enter valid physical values.', undefined, {
              duration: 5000
            });
            return EMPTY;
          }
          
          const physicalData = {
            weight: this.weight.control.value !== '' ? this.weight.control.value : undefined,
            depth: this.depth.control.value !== '' ? this.depth.control.value : undefined
          };
          
          return this.backend.update.module({
              ...this.data,
              weight: physicalData.weight,
              depth: physicalData.depth
            }
          );
        }),
        switchMap(() => this.backend.update.module({id: this.data.id})),
        catchError(error => {
          console.error('Error saving physical data:', error);
          this.snackBar.open('An error occurred while saving physical data.', undefined, {
            duration: 5000
          });
          return EMPTY;
        }),
        withLatestFrom(this.dataService.updateSingleModuleData$),
        takeUntil(this.destroyEvent$),
      )
      .subscribe(([, updateSingleModuleData]) => {
        this.dataService.updateSingleModuleData$.next(updateSingleModuleData);
        this.snackBar.open('Physical data saved successfully.', undefined, {
          duration: 5000
        });
      });
    
    // Subscription to save panels (including image upload)
// Subscription to save panels (including image upload)
    this.savePanels$
      .pipe(
        // Retrieve the first file from the file drag host service
        map(() => this.fileDragHostService.files$.value[0]),
        // Convert the file to an ArrayBuffer and get the file name and type
        switchMap(file =>
          from(file.arrayBuffer()).pipe(
            withLatestFrom(of([file.name, file.type]))
          )
        ),
        // Construct a new filename and upload the file to the server
        switchMap(([fileBuffer, [filename, fileType]]) => {
          // Extract the extension from the original filename
          const extension: string = filename.split('.').pop();
          // Build a new filename using the module's name, manufacturer, panel type, and standard,
          // sanitized using safeString to avoid invalid characters.
          const name: string = `${ this.safeString(this.data.name) }-${ this.safeString(this.data.manufacturer.name) }-${ this.panelType.control.value.name }-${ this.safeString(this.data.standard.name) }`;
          const filenameAndExtension: string = `${ name }.${ extension }`;
          // Upload the file to the server
          return this.backend.storage.uploadModulePanel(fileBuffer, filenameAndExtension, fileType);
        }),
        // Add the panel to the database with the returned filename and panel details
        switchMap(dbFilename =>
          this.backend.add.panel([
            {
              filename: dbFilename,
              color: +this.panelType.control.value.value,
              description: this.panelDescription.control.value,
              moduleid: this.data.id
            }
          ])
        ),
        // Update the module to refresh its last updated datetime
        switchMap(() => this.backend.update.module({id: this.data.id})),
        // Error handling: inspect the error message to detect duplicate entry errors
        catchError(error => {
          console.error('Error during panel upload:', error);
          if (error && error.message && error.message.includes('duplicate key value violates')) {
            // Duplicate panel exists: notify the user accordingly
            this.snackBar.open('Panel already exists.', undefined, {duration: 10000});
          } else {
            // Generic error message for any other errors
            this.snackBar.open('Something went wrong during the upload, please try again', undefined, {duration: 10000});
          }
          return EMPTY;
        })
      )
      .subscribe(() => {
        // Provide user feedback on successful panel upload
        const message = '✔ Panel added, thanks! It is now available for the community';
        this.snackBar.open(message, undefined, {duration: 10000});
        // Reload the module data
        this.dataService.updateSingleModuleData$.next(this.data.id);
      });
    
  }
  
  private shouldSaveInsOuts(ins: CV[], outs: CV[]): boolean {
    if (ins.length === 0 && outs.length === 0) {
      this.snackBar.open('Nothing to save', undefined, {
        duration: 2000
      });
      this.reload();
      return false;
    }
    
    const approvedIns = ins.filter(cv => cv.isApproved);
    const approvedOuts = outs.filter(cv => cv.isApproved);
    
    const sameApproved =
      approvedIns.length === this.data.ins.length &&
      approvedOuts.length === this.data.outs.length;
    
    const sameUnapproved =
      ins.length === this.data.ins.length &&
      outs.length === this.data.outs.length;
    
    if (sameApproved && sameUnapproved) {
      this.snackBar.open('All CVs are approved. Nothing to save.', undefined, {
        duration: 3000
      });
      this.reload();
      return false;
    }
    
    return true;
  }
  
  private reload(): void {
    of(null)
      .pipe(withLatestFrom(this.dataService.updateSingleModuleData$))
      .subscribe(([, data]) => {
        if (data) {
          this.dataService.updateSingleModuleData$.next(data);
        } else {
          console.error('No data to reload.');
        }
      });
  }
  
  private updateFormGroupAndContainer(
    cvs: FormCV[],
    group: UntypedFormGroup,
    subject: BehaviorSubject<FormCV[]>
  ): void {
    const controlsToRemove = Object.keys(group.controls);
    controlsToRemove.forEach(controlName => {
      group.removeControl(controlName);
    });
    
    cvs
      .filter(cv => !cv.isApproved)
      .forEach((cv, index) => {
        group.addControl(`name${ index }`, cv.name);
        group.addControl(`a${ index }`, cv.a);
        group.addControl(`b${ index }`, cv.b);
      });
    
    subject.next(cvs);
  }
  
  private createFormCV(data: Partial<CV>): FormCV {
    const formCV: FormCV = {
      name: new UntypedFormControl(data.name || '', this.validatorsName),
      a: new UntypedFormControl(
        data.min != null ? data.min : 0,
        this.validatorsNum
      ),
      b: new UntypedFormControl(
        data.max != null ? data.max : 0,
        this.validatorsNum
      ),
      id: data.id || 0,
      isApproved: data.isApproved || false
    };
    
    if (formCV.id > 0 && formCV.isApproved) {
      formCV.name.disable();
      formCV.a.disable();
      formCV.b.disable();
    }
    
    return formCV;
  }
  
  private formCVToCV(formCVs: FormCV[]): CV[] {
    return formCVs.map(formCV => ({
      name: formCV.name.value,
      id: formCV.id,
      min: formCV.a.value,
      max: formCV.b.value,
      isApproved: formCV.isApproved || false
    }));
  }
  
  // Helper method to sanitize strings for use in filenames
  private safeString(str: string | undefined): string {
    return (str || '').replace(/[^a-z0-9]/gi, '_');
  }
}