import { UntypedFormControl } from '@angular/forms';
import {
  Observable,
  of
} from 'rxjs';
import { SUPPORTED_MARKETPLACE_CURRENCIES } from 'src/app/features/marketplace/marketplace-money.utils';
import {
  FormTypes,
  ISelectable
} from 'src/app/shared-interproject/components/@smart/mat-form-entity/form-element-models';

export interface UserListingField {
  code: string;
  control: UntypedFormControl;
  flex: string;
  hint?: string;
  iconL1: string;
  label: string;
  options$: Observable<ISelectable[]>;
  type: FormTypes;
}

export interface UserListingFields {
  askingPrice: UserListingField;
  condition: UserListingField;
  currency: UserListingField;
  description: UserListingField;
  externalLink: UserListingField;
  shippingNotes: UserListingField;
  shipsFromCountry: UserListingField;
  titleOverride: UserListingField;
}

interface UserListingFormControls {
  askingPrice: UntypedFormControl;
  askingPriceCurrency: UntypedFormControl;
  condition: UntypedFormControl;
  description: UntypedFormControl;
  externalLink: UntypedFormControl;
  shippingNotes: UntypedFormControl;
  shipsFromCountry: UntypedFormControl;
  titleOverride: UntypedFormControl;
}

export const USER_LISTING_CONDITION_OPTIONS: ISelectable[] = [
  listingOption('new', 'New'),
  listingOption('excellent', 'Excellent'),
  listingOption('good', 'Good'),
  listingOption('fair', 'Fair'),
  listingOption('for_parts', 'For parts')
];

export const USER_LISTING_CURRENCY_OPTIONS: ISelectable[] = SUPPORTED_MARKETPLACE_CURRENCIES
  .map(currency => listingOption(currency));

export function createUserListingFields(controls: UserListingFormControls): UserListingFields {
  return {
    condition: selectField(
      'condition',
      'Condition',
      controls.condition,
      USER_LISTING_CONDITION_OPTIONS,
      'verified'
    ),
    askingPrice: textField('askingPrice', 'Asking price', controls.askingPrice, FormTypes.NUMBER, 'payments'),
    currency: selectField('askingPriceCurrency', 'Currency', controls.askingPriceCurrency, USER_LISTING_CURRENCY_OPTIONS, 'payments'),
    shipsFromCountry: textField('shipsFromCountry', 'Ships from country', controls.shipsFromCountry, FormTypes.TEXT, 'public'),
    shippingNotes: textField('shippingNotes', 'Shipping notes', controls.shippingNotes, FormTypes.AREA, 'local_shipping', 'Optional'),
    titleOverride: textField('titleOverride', 'Title override', controls.titleOverride, FormTypes.TEXT, 'title', 'Optional'),
    description: textField('description', 'Description', controls.description, FormTypes.AREA, 'notes', 'Optional'),
    externalLink: textField('externalLink', 'External link', controls.externalLink, FormTypes.TEXT, 'link', 'Optional')
  };
}

export function listingOption(id: string, name = id): ISelectable {
  return {id, name};
}

function textField(
  code: string,
  label: string,
  control: UntypedFormControl,
  type: FormTypes,
  iconL1: string,
  hint?: string
): UserListingField {
  return {
    code,
    control,
    flex: '100%',
    hint,
    iconL1,
    label,
    options$: of([]),
    type
  };
}

function selectField(
  code: string,
  label: string,
  control: UntypedFormControl,
  options: ISelectable[],
  iconL1: string
): UserListingField {
  return {
    code,
    control,
    flex: '100%',
    iconL1,
    label,
    options$: of(options),
    type: FormTypes.SELECT
  };
}
