import { FormControl } from '@angular/forms';
import {
  Observable,
  of
} from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import {
  FormTypes,
  ISelectable
} from 'src/app/shared-interproject/components/@smart/mat-form-entity/form-element-models';
import {
  conditionLabel,
  MarketplaceBrowseFacets,
  MarketplaceSortKey
} from 'src/app/features/marketplace/marketplace-view-models';

interface MarketplaceTextField {
  code: string;
  control: FormControl<string>;
  flex: string;
  label: string;
  type: FormTypes;
}

interface MarketplaceSelectField {
  code: string;
  control: FormControl<ISelectable>;
  flex: string;
  label: string;
  options$: Observable<ISelectable[]>;
  type: FormTypes;
}

export interface MarketplaceBrowserFields {
  condition: MarketplaceSelectField;
  currency: MarketplaceSelectField;
  manufacturer: MarketplaceSelectField;
  maxPrice: MarketplaceTextField;
  minPrice: MarketplaceTextField;
  query: MarketplaceTextField;
  shippingOption: MarketplaceSelectField;
  shipsFromCountry: MarketplaceSelectField;
  sort: MarketplaceSelectField;
}

interface CreateMarketplaceBrowserFieldsOptions {
  facets$: Observable<MarketplaceBrowseFacets>;
}

export const MARKETPLACE_SORT_OPTIONS: ISelectable[] = [
  {id: 'newest' satisfies MarketplaceSortKey, name: 'Newest'},
  {id: 'price-low' satisfies MarketplaceSortKey, name: 'Price low to high'},
  {id: 'price-high' satisfies MarketplaceSortKey, name: 'Price high to low'}
];

export function createMarketplaceBrowserFields({
  facets$
}: CreateMarketplaceBrowserFieldsOptions): MarketplaceBrowserFields {
  return {
    query: textField('query', 'Search listings', '14rem'),
    manufacturer: selectField(
      'manufacturer',
      'Manufacturer',
      '12rem',
      facets$.pipe(map(facets => optionList(facets.manufacturers, value => value, 'All manufacturers')), shareReplay({bufferSize: 1, refCount: true})),
      marketplaceOption('', 'All manufacturers')
    ),
    condition: selectField(
      'condition',
      'Condition',
      '10rem',
      facets$.pipe(map(facets => optionList(facets.conditions, conditionLabel, 'Any condition')), shareReplay({bufferSize: 1, refCount: true})),
      marketplaceOption('', 'Any condition')
    ),
    currency: selectField(
      'currency',
      'Currency',
      '8rem',
      facets$.pipe(map(facets => optionList(facets.currencies, value => value, 'All currencies')), shareReplay({bufferSize: 1, refCount: true})),
      marketplaceOption('', 'All currencies')
    ),
    minPrice: textField('minPrice', 'Min price', '7rem', FormTypes.NUMBER),
    maxPrice: textField('maxPrice', 'Max price', '7rem', FormTypes.NUMBER),
    shipsFromCountry: selectField(
      'shipsFromCountry',
      'Ships from',
      '12rem',
      facets$.pipe(map(facets => optionList(facets.shipsFromCountries, value => value, 'All countries / global')), shareReplay({bufferSize: 1, refCount: true})),
      marketplaceOption('', 'All countries / global')
    ),
    shippingOption: selectField(
      'shippingOption',
      'Shipping option',
      '12rem',
      facets$.pipe(map(facets => optionList(facets.shippingOptions, value => value, 'Any shipping option')), shareReplay({bufferSize: 1, refCount: true})),
      marketplaceOption('', 'Any shipping option')
    ),
    sort: selectField(
      'sort',
      'Sort',
      '10rem',
      of(MARKETPLACE_SORT_OPTIONS),
      MARKETPLACE_SORT_OPTIONS[0]
    )
  };
}

export function marketplaceOption(id: string, name = id): ISelectable {
  return {id, name};
}

function textField(
  code: string,
  label: string,
  flex: string,
  type: FormTypes = FormTypes.TEXT
): MarketplaceTextField {
  return {
    code,
    control: new FormControl<string>('', {nonNullable: true}),
    flex,
    label,
    type
  };
}

function selectField(
  code: string,
  label: string,
  flex: string,
  options$: Observable<ISelectable[]>,
  startingValue: ISelectable = marketplaceOption('')
): MarketplaceSelectField {
  return {
    code,
    control: new FormControl<ISelectable | null>(startingValue),
    flex,
    label,
    options$,
    type: FormTypes.SELECT
  };
}

function optionList(
  values: string[],
  labelFor: (value: string) => string = value => value,
  emptyLabel?: string
): ISelectable[] {
  const options = values.map(value => marketplaceOption(value, labelFor(value)));
  return emptyLabel ? [marketplaceOption('', emptyLabel), ...options] : options;
}
