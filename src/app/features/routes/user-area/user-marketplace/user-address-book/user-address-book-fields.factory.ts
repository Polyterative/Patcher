import { UntypedFormControl } from '@angular/forms';
import {
  Observable,
  of
} from 'rxjs';
import { FormTypes } from 'src/app/shared-interproject/components/@smart/mat-form-entity/form-element-models';
import { ISelectable } from 'src/app/shared-interproject/components/@smart/mat-form-entity/form-element-models';

export interface UserAddressField {
  code: string;
  control: UntypedFormControl;
  hint?: string;
  iconL1: string;
  label: string;
  options$: Observable<ISelectable[]>;
  type: FormTypes;
}

export interface UserAddressFields {
  city: UserAddressField;
  countryCode: UserAddressField;
  label: UserAddressField;
  line1: UserAddressField;
  line2: UserAddressField;
  postalCode: UserAddressField;
  recipientName: UserAddressField;
  region: UserAddressField;
}

interface UserAddressFormControls {
  city: UntypedFormControl;
  countryCode: UntypedFormControl;
  label: UntypedFormControl;
  line1: UntypedFormControl;
  line2: UntypedFormControl;
  postalCode: UntypedFormControl;
  recipientName: UntypedFormControl;
  region: UntypedFormControl;
}

export function createUserAddressFields(controls: UserAddressFormControls): UserAddressFields {
  return {
    label: textField('label', 'Label', controls.label, 'label'),
    recipientName: textField('recipientName', 'Recipient name', controls.recipientName, 'person'),
    line1: textField('line1', 'Street / line 1', controls.line1, 'home'),
    line2: textField('line2', 'Line 2', controls.line2, 'home', 'Optional'),
    city: textField('city', 'City', controls.city, 'location_city'),
    region: textField('region', 'Region', controls.region, 'map', 'Optional'),
    postalCode: textField('postalCode', 'Postal code', controls.postalCode, 'markunread_mailbox', 'Optional'),
    countryCode: textField('countryCode', 'Country code', controls.countryCode, 'public', 'Two letters, e.g. IT')
  };
}

function textField(
  code: string,
  label: string,
  control: UntypedFormControl,
  iconL1: string,
  hint?: string
): UserAddressField {
  return {
    code,
    control,
    hint,
    iconL1,
    label,
    options$: of([]),
    type: FormTypes.TEXT
  };
}
