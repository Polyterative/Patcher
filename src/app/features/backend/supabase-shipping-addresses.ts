import {
  MarketplaceSavedShippingAddress,
  MarketplaceShippingAddressDraft,
  normalizeMarketplaceShippingAddressSaveDraft
} from 'src/app/features/marketplace/marketplace-address-book.utils';
import {
  responseData,
  type SupabaseSingleResponse,
  type SupabaseTableInsert,
  type SupabaseTableRow,
  type SupabaseTableUpdate
} from './supabase-db.types';

export const SHIPPING_ADDRESS_COLUMNS =
  'id,profileid,label,recipient_name,line1,line2,city,region,postal_code,country_code,is_default,created_at,updated_at';

export type ShippingAddressRow = SupabaseTableRow<'shipping_addresses'>;

export function buildShippingAddressInsert(
  profileid: string,
  draft: MarketplaceShippingAddressDraft
): SupabaseTableInsert<'shipping_addresses'> {
  const normalized = normalizeMarketplaceShippingAddressSaveDraft(draft);

  if (!normalized) {
    throw new Error('Shipping address is incomplete');
  }

  return {
    city: normalized.city,
    country_code: normalized.countryCode,
    is_default: normalized.isDefault,
    label: normalized.label,
    line1: normalized.line1,
    line2: normalized.line2,
    postal_code: normalized.postalCode,
    profileid,
    recipient_name: normalized.recipientName,
    region: normalized.region
  };
}

export function buildShippingAddressUpdate(
  draft: MarketplaceShippingAddressDraft
): SupabaseTableUpdate<'shipping_addresses'> {
  const normalized = normalizeMarketplaceShippingAddressSaveDraft(draft);

  if (!normalized) {
    throw new Error('Shipping address is incomplete');
  }

  return {
    city: normalized.city,
    country_code: normalized.countryCode,
    is_default: normalized.isDefault,
    label: normalized.label,
    line1: normalized.line1,
    line2: normalized.line2,
    postal_code: normalized.postalCode,
    recipient_name: normalized.recipientName,
    region: normalized.region
  };
}

export function mapShippingAddressRow(row: ShippingAddressRow): MarketplaceSavedShippingAddress {
  return {
    city: row.city,
    countryCode: row.country_code,
    createdAt: row.created_at,
    id: row.id,
    isDefault: row.is_default,
    label: row.label,
    line1: row.line1,
    line2: row.line2,
    postalCode: row.postal_code,
    profileid: row.profileid,
    recipientName: row.recipient_name,
    region: row.region,
    updatedAt: row.updated_at
  };
}

export function mapShippingAddressResponse(
  response: SupabaseSingleResponse<ShippingAddressRow>
): MarketplaceSavedShippingAddress {
  const row = responseData(response);

  if (!row) {
    throw new Error('Shipping address response missing data');
  }

  return mapShippingAddressRow(row);
}
