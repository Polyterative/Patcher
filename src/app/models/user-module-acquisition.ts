export const USER_MODULE_ACQUISITION_SOURCES = [
  'unknown',
  'new',
  'used',
  'gift',
  'trade',
  'marketplace',
  'other'
] as const;

export const USER_MODULE_ACQUISITION_CURRENCIES = ['EUR', 'USD'] as const;

export type UserModuleAcquisitionSource = typeof USER_MODULE_ACQUISITION_SOURCES[number];
export type UserModuleAcquisitionCurrency = typeof USER_MODULE_ACQUISITION_CURRENCIES[number];

export interface UserModuleAcquisitionDraft {
  acquired_at?: string;
  price_amount_minor?: number | null;
  currency?: UserModuleAcquisitionCurrency | null;
  source?: UserModuleAcquisitionSource;
  note?: string | null;
}

export interface UserModuleAcquisition extends UserModuleAcquisitionDraft {
  id: number;
  profileid: string;
  moduleid: number;
  acquired_at: string;
  price_amount_minor: number | null;
  currency: UserModuleAcquisitionCurrency | null;
  source: UserModuleAcquisitionSource;
  note: string | null;
  created_at: string;
  updated_at: string;
}
