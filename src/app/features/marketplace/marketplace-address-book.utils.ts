export interface MarketplaceShippingAddressDraft {
  id?: string | null;
  label?: string | null;
  recipientName?: string | null;
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  region?: string | null;
  postalCode?: string | null;
  countryCode?: string | null;
  phone?: string | null;
  isDefault?: boolean | null;
}

export interface MarketplaceShippingAddressSaveDraft extends Omit<MarketplaceShippingAddressDraft, 'id' | 'phone'> {
}

export interface MarketplaceNormalizedShippingAddressSaveDraft {
  label: string;
  recipientName: string;
  line1: string;
  line2: string | null;
  city: string;
  region: string | null;
  postalCode: string | null;
  countryCode: string;
  isDefault: boolean;
}

export interface MarketplaceSavedShippingAddress extends MarketplaceNormalizedShippingAddressSaveDraft {
  id: string;
  profileid: string;
  createdAt: string;
  updatedAt: string;
}

export type MarketplaceShippingAddressField =
  | 'label'
  | 'recipientName'
  | 'line1'
  | 'city'
  | 'countryCode';

export interface MarketplaceShippingAddressValidationResult {
  valid: boolean;
  errors: Partial<Record<MarketplaceShippingAddressField, string>>;
}

export interface MarketplaceShippingAddressTransactionSnapshot {
  recipientName: string;
  line1: string;
  line2?: string;
  city: string;
  region?: string;
  postalCode: string;
  countryCode: string;
  phone?: string;
  privateSummary: string;
}

export interface MarketplaceAddressChipPickerAddress extends MarketplaceShippingAddressDraft {
  id: string;
}

export interface MarketplaceAddressChipOption {
  id: string;
  chipLabel: string;
  privateSummary: string;
  isDefault: boolean;
  isSelected: boolean;
  disabled: boolean;
  disabledReason?: string;
}

const COUNTRY_CODE_PATTERN = /^[A-Z]{2}$/u;
const REQUIRED_FIELDS: MarketplaceShippingAddressField[] = [
  'label',
  'recipientName',
  'line1',
  'city',
  'countryCode'
];

export function normalizeMarketplaceAddressCountryCode(value: string | null | undefined): string | undefined {
  const normalized = value?.trim().toUpperCase();

  if (!normalized || !COUNTRY_CODE_PATTERN.test(normalized)) {
    return undefined;
  }

  return normalized;
}

export function validateMarketplaceShippingAddressDraft(
  draft: MarketplaceShippingAddressDraft
): MarketplaceShippingAddressValidationResult {
  const errors: Partial<Record<MarketplaceShippingAddressField, string>> = {};

  for (const field of REQUIRED_FIELDS) {
    if (!hasTrimmedValue(draft[field])) {
      errors[field] = 'Required';
    }
  }

  if (hasTrimmedValue(draft.countryCode) && !normalizeMarketplaceAddressCountryCode(draft.countryCode)) {
    errors.countryCode = 'Use a two-letter country code';
  }

  return {
    errors,
    valid: Object.keys(errors).length === 0
  };
}

export function normalizeMarketplaceShippingAddressSaveDraft(
  draft: MarketplaceShippingAddressDraft
): MarketplaceNormalizedShippingAddressSaveDraft | null {
  const label = trimRequiredText(draft.label);
  const recipientName = trimRequiredText(draft.recipientName);
  const line1 = trimRequiredText(draft.line1);
  const city = trimRequiredText(draft.city);
  const countryCode = normalizeMarketplaceAddressCountryCode(draft.countryCode);

  if (!label || !recipientName || !line1 || !city || !countryCode) {
    return null;
  }

  return {
    city,
    countryCode,
    isDefault: draft.isDefault === true,
    label,
    line1,
    line2: trimOptionalText(draft.line2) ?? null,
    postalCode: trimOptionalText(draft.postalCode) ?? null,
    recipientName,
    region: trimOptionalText(draft.region) ?? null
  };
}

export function buildMarketplaceAddressPrivateSummary(
  draft: Pick<MarketplaceShippingAddressDraft, 'city' | 'countryCode'>
): string {
  const city = trimOptionalText(draft.city);
  const countryCode = normalizeMarketplaceAddressCountryCode(draft.countryCode);

  if (city && countryCode) {
    return `${city}, ${countryCode}`;
  }

  return city || countryCode || 'Private address';
}

export function buildMarketplaceShippingAddressTransactionSnapshot(
  draft: MarketplaceShippingAddressDraft
): MarketplaceShippingAddressTransactionSnapshot | null {
  if (!validateMarketplaceShippingAddressDraft(draft).valid) {
    return null;
  }

  const recipientName = trimRequiredText(draft.recipientName);
  const line1 = trimRequiredText(draft.line1);
  const city = trimRequiredText(draft.city);
  const postalCode = trimRequiredText(draft.postalCode);
  const countryCode = normalizeMarketplaceAddressCountryCode(draft.countryCode);

  if (!recipientName || !line1 || !city || !postalCode || !countryCode) {
    return null;
  }

  const snapshot: MarketplaceShippingAddressTransactionSnapshot = {
    city,
    countryCode,
    line1,
    postalCode,
    privateSummary: buildMarketplaceAddressPrivateSummary({city, countryCode}),
    recipientName
  };
  const line2 = trimOptionalText(draft.line2);
  const phone = trimOptionalText(draft.phone);
  const region = trimOptionalText(draft.region);

  if (line2) {
    snapshot.line2 = line2;
  }

  if (region) {
    snapshot.region = region;
  }

  if (phone) {
    snapshot.phone = phone;
  }

  return snapshot;
}

export function buildMarketplaceAddressChipLabel(
  address: Pick<MarketplaceShippingAddressDraft, 'label' | 'city' | 'countryCode'>
): string {
  const label = trimOptionalText(address.label);
  const privateSummary = buildMarketplaceAddressPrivateSummary(address);
  const hasDestinationSummary = privateSummary !== 'Private address';

  if (label && hasDestinationSummary) {
    return `${label} · ${privateSummary}`;
  }

  return label || (hasDestinationSummary ? privateSummary : 'Saved address');
}

export function buildMarketplaceAddressChipOptions(
  addresses: readonly MarketplaceAddressChipPickerAddress[],
  selectedAddressId?: string | null
): MarketplaceAddressChipOption[] {
  return orderMarketplaceAddressChipsDefaultFirst(addresses).map(address => {
    const validation = validateMarketplaceShippingAddressDraft(address);
    const option: MarketplaceAddressChipOption = {
      chipLabel: buildMarketplaceAddressChipLabel(address),
      disabled: !validation.valid,
      id: address.id,
      isDefault: address.isDefault === true,
      isSelected: address.id === selectedAddressId,
      privateSummary: buildMarketplaceAddressPrivateSummary(address)
    };

    if (!validation.valid) {
      option.disabledReason = 'Address is incomplete';
    }

    return option;
  });
}

export function orderMarketplaceAddressChipsDefaultFirst<T extends { isDefault?: boolean | null }>(
  addresses: readonly T[]
): T[] {
  return addresses
    .map((address, index) => ({address, index}))
    .sort((left, right) => {
      const defaultDelta = Number(right.address.isDefault === true) - Number(left.address.isDefault === true);
      return defaultDelta || left.index - right.index;
    })
    .map(({address}) => address);
}

export function normalizeMarketplaceDefaultAddressSelection<T extends { id: string; isDefault?: boolean | null }>(
  addresses: readonly T[],
  selectedAddressId?: string | null
): T[] {
  if (addresses.length === 0) {
    return [];
  }

  const selectedIndex = selectedAddressId
    ? addresses.findIndex(address => address.id === selectedAddressId)
    : -1;
  const defaultIndex = selectedIndex >= 0 ? selectedIndex : findFallbackDefaultIndex(addresses);

  return addresses.map((address, index) => ({
    ...address,
    isDefault: index === defaultIndex
  }));
}

function findFallbackDefaultIndex(addresses: readonly { isDefault?: boolean | null }[]): number {
  const existingDefaultIndex = addresses.findIndex(address => address.isDefault === true);
  return existingDefaultIndex >= 0 ? existingDefaultIndex : 0;
}

function hasTrimmedValue(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function trimRequiredText(value: string | null | undefined): string | undefined {
  if (!hasTrimmedValue(value)) {
    return undefined;
  }

  return value.trim();
}

function trimOptionalText(value: string | null | undefined): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value?.trim();
  return trimmed || undefined;
}
