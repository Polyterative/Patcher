import { type ModulePanel } from 'src/app/models/module';
import { type Standard } from 'src/app/models/standard';

export const MARKETPLACE_LISTING_STATUSES = [
  'draft',
  'active',
  'paused',
  'reserved',
  'closed_sold',
  'closed_unsold',
  'expired'
] as const;

export const MARKETPLACE_LISTING_CONDITIONS = [
  'new',
  'excellent',
  'good',
  'fair',
  'for_parts'
] as const;

export type MarketplaceListingStatus = typeof MARKETPLACE_LISTING_STATUSES[number];
export type MarketplaceListingCondition = typeof MARKETPLACE_LISTING_CONDITIONS[number];

export const MARKETPLACE_DUPLICATE_LISTING_WARNING_STATUSES = [
  'active',
  'reserved',
  'paused',
  'draft'
] as const satisfies readonly MarketplaceListingStatus[];

export type MarketplaceDuplicateListingWarningStatus = typeof MARKETPLACE_DUPLICATE_LISTING_WARNING_STATUSES[number];

export const MARKETPLACE_LISTING_MEDIA_KIND = 'image' as const;
export const MARKETPLACE_LISTING_MEDIA_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp'
] as const;
export const MARKETPLACE_LISTING_MEDIA_MAX_IMAGE_COUNT = 8;
export const MARKETPLACE_LISTING_MEDIA_MAX_PREPROCESSING_SIZE_BYTES = 10 * 1024 * 1024;
export const MARKETPLACE_LISTING_MEDIA_OUTPUT_MAX_WIDTH = 2048;
export const MARKETPLACE_LISTING_MEDIA_OUTPUT_MAX_HEIGHT = 2048;
export const MARKETPLACE_LISTING_MEDIA_ALLOWED_URL_PREFIXES = [
  'https://images.patcher.xyz/'
] as const;

export type MarketplaceListingMediaKind = typeof MARKETPLACE_LISTING_MEDIA_KIND;
export type MarketplaceListingMediaImageMimeType = typeof MARKETPLACE_LISTING_MEDIA_IMAGE_MIME_TYPES[number];

export interface MarketplaceListingMediaDraft {
  id?: string | null;
  kind?: MarketplaceListingMediaKind | string | null;
  url?: string | null;
  filename?: string | null;
  position?: number | string | null;
  sizeBytes?: number | null;
  mimeType?: MarketplaceListingMediaImageMimeType | string | null;
}

export interface MarketplaceListingMediaSaveDraft extends MarketplaceListingMediaDraft {
  listingId?: string | null;
  storagePath?: string | null;
}

export type MarketplaceListingMediaDraftField =
  | 'id'
  | 'kind'
  | 'url'
  | 'filename'
  | 'position'
  | 'sizeBytes'
  | 'mimeType';

export interface MarketplaceListingNormalizedMediaDraft {
  kind: MarketplaceListingMediaKind;
  position: number;
  id?: string;
  url?: string;
  filename?: string;
  sizeBytes?: number;
  mimeType: MarketplaceListingMediaImageMimeType;
}

export interface MarketplaceListingMediaDraftIssue {
  index: number;
  field?: MarketplaceListingMediaDraftField;
  message: string;
}

export interface MarketplaceListingMediaDraftNormalizationResult {
  media: MarketplaceListingNormalizedMediaDraft[];
  errors: MarketplaceListingMediaDraftIssue[];
  warnings: MarketplaceListingMediaDraftIssue[];
}

export interface MarketplaceListingDraft {
  moduleId?: string | null;
  sellerProfileId?: string | null;
  titleOverride?: string | null;
  description?: string | null;
  condition?: MarketplaceListingCondition | string | null;
  askingPrice?: string | number | null;
  askingPriceCurrency?: string | null;
  openToOffers?: boolean | null;
  shipsFromCountry?: string | null;
  shippingOptions?: readonly (string | null | undefined)[] | null;
  shippingNotes?: string | null;
  externalLink?: string | null;
  status?: MarketplaceListingStatus | string | null;
}

export type MarketplaceListingDraftField =
  | 'moduleId'
  | 'sellerProfileId'
  | 'titleOverride'
  | 'description'
  | 'condition'
  | 'askingPrice'
  | 'askingPriceCurrency'
  | 'shipsFromCountry'
  | 'shippingOptions'
  | 'shippingNotes'
  | 'externalLink'
  | 'status';

export interface MarketplaceListingNormalizedDraft {
  moduleId: string;
  sellerProfileId: string;
  condition: MarketplaceListingCondition;
  askingPriceAmountMinor: number;
  askingPriceCurrency: string;
  openToOffers: boolean;
  shipsFromCountry: string;
  shippingOptions: string[];
  shippingNotes?: string;
  titleOverride?: string;
  description?: string;
  externalLink?: string;
  status: MarketplaceListingStatus;
}

export interface MarketplaceListingSellerSummary {
  id: string;
  username: string | null;
  public: boolean;
  avatarUrl: string | null;
}

export interface MarketplaceListingModuleSummary {
  hp: number | null;
  id: number;
  name: string | null;
  panels: ModulePanel[];
  public: boolean;
  standard: Standard | null;
  manufacturer: {
    id: number;
    name: string;
    logo: string | null;
  } | null;
}

export interface MarketplaceListingMedia {
  id: string;
  listingId: string;
  kind: MarketplaceListingMediaKind;
  url: string;
  storagePath: string;
  position: number;
  mimeType: MarketplaceListingMediaImageMimeType;
  createdAt: string;
}

export interface MarketplaceListing {
  id: string;
  publicId: string;
  sellerProfileId: string;
  moduleId: number;
  titleOverride: string | null;
  description: string | null;
  condition: MarketplaceListingCondition;
  askingPriceAmountMinor: number;
  askingPriceCurrency: string;
  openToOffers: boolean;
  shipsFromCountry: string;
  shippingOptions: string[];
  shippingNotes: string | null;
  externalLink: string | null;
  status: MarketplaceListingStatus;
  createdAt: string;
  updatedAt: string;
  media: MarketplaceListingMedia[];
  module: MarketplaceListingModuleSummary | null;
  seller: MarketplaceListingSellerSummary | null;
}

export type MarketplaceListingDraftValidationResult =
  | {
      valid: true;
      listing: MarketplaceListingNormalizedDraft;
      errors: Record<string, never>;
    }
  | {
      valid: false;
      errors: Partial<Record<MarketplaceListingDraftField, string>>;
    };

export interface MarketplaceDuplicateListingCandidate {
  id?: string | null;
  publicId?: string | null;
  moduleId?: string | null;
  sellerProfileId?: string | null;
  status?: MarketplaceListingStatus | string | null;
  titleOverride?: string | null;
}

export interface MarketplaceDuplicateListingDraftIdentity {
  moduleId?: string | null;
  sellerProfileId?: string | null;
}

export interface MarketplaceDuplicateListingWarning {
  hasDuplicate: true;
  message: string;
  moduleId: string;
  listing: {
    status: MarketplaceDuplicateListingWarningStatus;
    id?: string;
    publicId?: string;
    titleOverride?: string;
  };
}

export type MarketplaceDuplicateListingWarningResult =
  | MarketplaceDuplicateListingWarning
  | {
      hasDuplicate: false;
    };
