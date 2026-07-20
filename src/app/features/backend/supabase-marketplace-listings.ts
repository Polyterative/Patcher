import {
  MARKETPLACE_LISTING_MEDIA_KIND,
  normalizeMarketplaceListingMediaDrafts,
  validateAndNormalizeMarketplaceListingDraft,
  type MarketplaceListing,
  type MarketplaceListingCondition,
  type MarketplaceListingDraft,
  type MarketplaceListingMedia,
  type MarketplaceListingMediaImageMimeType,
  type MarketplaceListingMediaSaveDraft,
  type MarketplaceListingModuleSummary,
  type MarketplaceListingSellerSummary,
  type MarketplaceListingStatus
} from 'src/app/features/marketplace/marketplace-listing.utils';
import { StorageUrls } from './DatabaseStrings';
import {
  responseData,
  type SupabaseSingleResponse,
  type SupabaseTableInsert,
  type SupabaseTableRow,
  type SupabaseTableUpdate
} from './supabase-db.types';

export const MARKETPLACE_LISTING_COLUMNS =
  'id,public_id,seller_profileid,moduleid,title_override,description,condition,asking_price_amount_minor,asking_price_currency,open_to_offers,ships_from_country,shipping_options,shipping_notes,external_link,status,created_at,updated_at,expires_at';
export const LISTING_MEDIA_COLUMNS =
  'id,listing_id,kind,url,storage_path,position,mime_type,created_at';
export const MARKETPLACE_LISTING_WITH_RELATIONS_COLUMNS = `${ MARKETPLACE_LISTING_COLUMNS },
  media:listing_media!listing_media_listing_id_fkey(${ LISTING_MEDIA_COLUMNS }),
  module:modules!marketplace_listings_moduleid_fkey(id,name,hp,public,manufacturer:manufacturerId(id,name,logo),standard:standards!modules_standard_fkey(id,name),panels:module_panels!module_panels_moduleid_fkey(*)),
  seller:profiles!marketplace_listings_seller_profileid_fkey(id,username,public,avatar_url,website)`;

export type MarketplaceListingRow = SupabaseTableRow<'marketplace_listings'> & {
  media?: ListingMediaRow[] | null;
  module?: MarketplaceListingModuleRow | null;
  seller?: MarketplaceListingSellerRow | null;
};
export type ListingMediaRow = SupabaseTableRow<'listing_media'>;

interface MarketplaceListingModuleRow {
  hp: number | null;
  id: number;
  name: string | null;
  panels?: MarketplaceListingModulePanelRow[] | null;
  public: boolean;
  standard?: {
    id: number;
    name: string;
  } | null;
  manufacturer: {
    id: number;
    name: string;
    logo: string | null;
  } | null;
}

type MarketplaceListingModulePanelRow = SupabaseTableRow<'module_panels'>;

interface MarketplaceListingSellerRow {
  id: string;
  username: string | null;
  public: boolean;
  avatar_url: string | null;
  website: string | null;
}

export function buildMarketplaceListingInsert(
  sellerProfileId: string,
  draft: MarketplaceListingDraft
): SupabaseTableInsert<'marketplace_listings'> {
  const listing = normalizeMarketplaceListingForPersistence(sellerProfileId, draft);
  return {
    asking_price_amount_minor: listing.askingPriceAmountMinor,
    asking_price_currency: listing.askingPriceCurrency,
    condition: listing.condition,
    description: listing.description ?? null,
    external_link: listing.externalLink ?? null,
    moduleid: listing.moduleId,
    open_to_offers: listing.openToOffers,
    seller_profileid: sellerProfileId,
    shipping_notes: listing.shippingNotes ?? null,
    shipping_options: listing.shippingOptions,
    ships_from_country: listing.shipsFromCountry,
    status: listing.status,
    title_override: listing.titleOverride ?? null
  };
}

export function buildMarketplaceListingUpdate(
  sellerProfileId: string,
  draft: MarketplaceListingDraft
): SupabaseTableUpdate<'marketplace_listings'> {
  const {seller_profileid: _sellerProfileId, ...update} = buildMarketplaceListingInsert(sellerProfileId, draft);
  return update;
}

export function buildListingMediaInsert(
  listingId: string,
  draft: MarketplaceListingMediaSaveDraft
): SupabaseTableInsert<'listing_media'> {
  const media = normalizeMarketplaceListingMediaDrafts([draft]).media[0];
  if (!media) {
    throw new Error('Listing media is invalid');
  }

  const storagePath = normalizeListingMediaStoragePath(draft.storagePath)
    ?? storagePathFromMarketplaceListingImageUrl(media.url);
  const url = media.url ?? (storagePath ? getMarketplaceListingImagePublicUrl(storagePath) : undefined);

  if (!storagePath || !url) {
    throw new Error('Listing media requires an owner-safe storage path');
  }

  return {
    kind: MARKETPLACE_LISTING_MEDIA_KIND,
    listing_id: listingId,
    mime_type: media.mimeType,
    position: media.position,
    storage_path: storagePath,
    url
  };
}

export function mapMarketplaceListingRow(row: MarketplaceListingRow): MarketplaceListing {
  return {
    askingPriceAmountMinor: row.asking_price_amount_minor,
    askingPriceCurrency: row.asking_price_currency,
    condition: row.condition as MarketplaceListingCondition,
    createdAt: row.created_at,
    description: row.description,
    expiresAt: row.expires_at,
    externalLink: row.external_link,
    id: row.id,
    media: (row.media ?? []).map(mapListingMediaRow).sort((first, second) => first.position - second.position),
    module: row.module ? mapMarketplaceListingModuleRow(row.module) : null,
    moduleId: row.moduleid,
    openToOffers: row.open_to_offers,
    publicId: row.public_id,
    seller: row.seller ? mapMarketplaceListingSellerRow(row.seller) : null,
    sellerProfileId: row.seller_profileid,
    shippingNotes: row.shipping_notes,
    shippingOptions: row.shipping_options,
    shipsFromCountry: row.ships_from_country,
    status: row.status as MarketplaceListingStatus,
    titleOverride: row.title_override,
    updatedAt: row.updated_at
  };
}

export function mapListingMediaRow(row: ListingMediaRow): MarketplaceListingMedia {
  return {
    createdAt: row.created_at,
    id: row.id,
    kind: row.kind as typeof MARKETPLACE_LISTING_MEDIA_KIND,
    listingId: row.listing_id,
    mimeType: row.mime_type as MarketplaceListingMediaImageMimeType,
    position: row.position,
    storagePath: row.storage_path,
    url: row.url
  };
}

export function mapMarketplaceListingResponse(
  response: SupabaseSingleResponse<MarketplaceListingRow>
): MarketplaceListing {
  const row = responseData(response);
  if (!row) {
    throw new Error('Marketplace listing response missing data');
  }
  return mapMarketplaceListingRow(row);
}

export function mapListingMediaResponse(
  response: SupabaseSingleResponse<ListingMediaRow>
): MarketplaceListingMedia {
  const row = responseData(response);
  if (!row) {
    throw new Error('Listing media response missing data');
  }
  return mapListingMediaRow(row);
}

export function getMarketplaceListingImagePublicUrl(storagePath: string): string {
  return `${ StorageUrls.marketplaceListings }${ storagePath }`;
}

export function storagePathFromMarketplaceListingImageUrl(url: string | undefined): string | undefined {
  if (!url?.startsWith(StorageUrls.marketplaceListings)) {
    return undefined;
  }
  return normalizeListingMediaStoragePath(url.slice(StorageUrls.marketplaceListings.length));
}

export function buildMarketplaceListingImagePath(
  sellerProfileId: string,
  listingId: string,
  filenameAndExtension: string
): string {
  const safeFilename = filenameAndExtension
    .toLowerCase()
    .trim()
    .replace(/\\/g, '/')
    .split('/')
    .pop()
    ?.replace(/[^a-z0-9._-]/g, '-')
    .replace(/-+/g, '-');

  if (!safeFilename || !/\.(jpg|jpeg|png|webp)$/u.test(safeFilename)) {
    throw new Error('Listing images must use a JPEG, PNG, or WebP filename');
  }

  const extensionIndex = safeFilename.lastIndexOf('.');
  const base = safeFilename.slice(0, extensionIndex).replace(/^[._-]+/u, '').slice(0, 96) || 'listing-image';
  const extension = safeFilename.slice(extensionIndex + 1);
  const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/[^0-9-]/g, '');

  return `${ sellerProfileId }/${ listingId }/${ base }_${ timestamp }.${ extension }`;
}

function normalizeMarketplaceListingForPersistence(
  sellerProfileId: string,
  draft: MarketplaceListingDraft
) {
  const normalized = validateAndNormalizeMarketplaceListingDraft({
    ...draft,
    sellerProfileId
  });

  if (!normalized.valid) {
    throw new Error('Marketplace listing is incomplete');
  }

  const moduleId = Number(normalized.listing.moduleId);
  if (!Number.isSafeInteger(moduleId) || moduleId <= 0) {
    throw new Error('Marketplace listing module id is invalid');
  }

  return {
    ...normalized.listing,
    moduleId
  };
}

function normalizeListingMediaStoragePath(value: string | null | undefined): string | undefined {
  const normalized = value?.trim().toLowerCase();
  if (!normalized
    || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[a-z0-9][a-z0-9._-]{0,180}\.(jpg|jpeg|png|webp)$/u.test(normalized)) {
    return undefined;
  }

  return normalized;
}

function mapMarketplaceListingModuleRow(row: MarketplaceListingModuleRow): MarketplaceListingModuleSummary {
  return {
    hp: row.hp,
    id: row.id,
    manufacturer: row.manufacturer,
    name: row.name,
    panels: (row.panels ?? [])
      .map(mapMarketplaceListingModulePanelRow)
      .sort((first, second) => first.color - second.color),
    standard: row.standard ?? null,
    public: row.public
  };
}

function mapMarketplaceListingModulePanelRow(row: MarketplaceListingModulePanelRow) {
  return {
    color: row.color ?? 0,
    description: row.description,
    filename: row.filename,
    id: row.id,
    moduleid: row.moduleid
  };
}

function mapMarketplaceListingSellerRow(row: MarketplaceListingSellerRow): MarketplaceListingSellerSummary {
  return {
    avatarUrl: row.avatar_url,
    id: row.id,
    public: row.public,
    username: row.username,
    website: row.website
  };
}
