import { Injectable } from '@angular/core';
import {
  UntypedFormBuilder,
  UntypedFormControl,
  UntypedFormGroup,
  ValidatorFn,
  Validators
} from '@angular/forms';
import { DbModule } from 'src/app/models/module';
import { FormTypes } from 'src/app/shared-interproject/components/@smart/mat-form-entity/form-element-models';
import { IMatFormEntityConfig } from 'src/app/shared-interproject/components/@smart/mat-form-entity/mat-form-entity.component';
import { PANEL_TYPE_OPTIONS } from './module-editor.types';
import { FormCV } from './module-editor-data.service';
import { of } from 'rxjs';

@Injectable()
export class ModuleEditorFormStateService {
  readonly validatorsNum: ValidatorFn | null = Validators.compose([
    Validators.max(12),
    Validators.min(-12)
  ]);

  readonly validatorsName: ValidatorFn | null = Validators.compose([
    Validators.required,
    Validators.minLength(1),
    Validators.maxLength(36)
  ]);

  readonly validatorsPower: ValidatorFn | null = Validators.compose([
    Validators.required,
    Validators.min(0),
    Validators.max(2000)
  ]);

  readonly panelDescription: IMatFormEntityConfig;
  readonly panelType: IMatFormEntityConfig;
  readonly powerRailPositive: IMatFormEntityConfig;
  readonly powerRailNegative: IMatFormEntityConfig;
  readonly powerRailFiveVolts: IMatFormEntityConfig;
  readonly weight: IMatFormEntityConfig;
  readonly depth: IMatFormEntityConfig;
  readonly formGroupA: UntypedFormGroup;
  readonly formGroupB: UntypedFormGroup;
  readonly formGroupPanel: UntypedFormGroup;
  readonly formGroupPower: UntypedFormGroup;
  readonly formGroupPhysical: UntypedFormGroup;

  private powerAutofillReady = false;

  constructor(private readonly formBuilder: UntypedFormBuilder) {
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
      control: new UntypedFormControl(PANEL_TYPE_OPTIONS[0], [Validators.required]),
      options$: of(PANEL_TYPE_OPTIONS),
      flex: 'auto'
    };

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

    this.weight = {
      code: 'weight',
      label: 'Weight (g)',
      type: FormTypes.NUMBER,
      control: new UntypedFormControl('', [
        Validators.min(0),
        Validators.max(2000)
      ]),
      flex: 'auto',
      iconL1: 'fitness_center'
    };

    this.depth = {
      code: 'depth',
      label: 'Depth (mm)',
      type: FormTypes.NUMBER,
      control: new UntypedFormControl('', [
        Validators.min(0),
        Validators.max(500)
      ]),
      flex: 'auto',
      iconL1: 'vertical_align_center'
    };

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

  hydrateModule(data: DbModule): void {
    this.powerAutofillReady = false;

    if (data.powerPos12 != null) {
      this.powerRailPositive.control.setValue(data.powerPos12);
    }

    if (data.powerNeg12 != null) {
      this.powerRailNegative.control.setValue(data.powerNeg12);
    }

    if (data.powerPos5 != null) {
      this.powerRailFiveVolts.control.setValue(data.powerPos5);
    }

    if (data.weight != null) {
      this.weight.control.setValue(data.weight);
    }

    if (data.depth != null) {
      this.depth.control.setValue(data.depth);
    }
  }

  markPowerAutofillReady(): void {
    this.powerAutofillReady = true;
  }

  autoFillBlankPowerRails(changedControl: UntypedFormControl, value: unknown): void {
    if (!this.powerAutofillReady || value === '' || value === null || value === undefined) {
      return;
    }

    [
      this.powerRailPositive.control,
      this.powerRailNegative.control,
      this.powerRailFiveVolts.control
    ]
      .filter(control => control !== changedControl && (control.value === '' || control.value === null || control.value === undefined))
      .forEach(control => control.setValue(0, {emitEvent: false}));
  }

  markEditorFormsPristine(ins: FormCV[], outs: FormCV[]): void {
    [this.formGroupPower, this.formGroupPhysical, this.formGroupPanel, this.formGroupA, this.formGroupB]
      .forEach(group => group.markAsPristine());

    [...ins, ...outs].forEach(cv => {
      cv.name.markAsPristine();
      cv.a.markAsPristine();
      cv.b.markAsPristine();
    });
  }
}
