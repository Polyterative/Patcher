import {
  MARKETPLACE_LISTING_MEDIA_ALLOWED_URL_PREFIXES,
  MARKETPLACE_LISTING_MEDIA_IMAGE_MIME_TYPES,
  MARKETPLACE_LISTING_MEDIA_KIND,
  MARKETPLACE_LISTING_MEDIA_MAX_IMAGE_COUNT,
  MARKETPLACE_LISTING_MEDIA_MAX_PREPROCESSING_SIZE_BYTES,
  type MarketplaceListingMediaDraft,
  type MarketplaceListingMediaDraftIssue,
  type MarketplaceListingMediaDraftNormalizationResult,
  type MarketplaceListingMediaImageMimeType,
  type MarketplaceListingNormalizedMediaDraft
} from './marketplace-listing.model';
import {
  isObjectRecord,
  MAX_MEDIA_FILENAME_LENGTH,
  MAX_MEDIA_URL_LENGTH,
  trimOptionalText
} from './marketplace-listing-shared.utils';

interface MarketplaceListingMediaDraftCandidate extends MarketplaceListingNormalizedMediaDraft {
  inputIndex: number;
  sortPosition?: number;
}

export function normalizeMarketplaceListingMediaDrafts(
  drafts: readonly MarketplaceListingMediaDraft[] | null | undefined
): MarketplaceListingMediaDraftNormalizationResult {
  const errors: MarketplaceListingMediaDraftIssue[] = [];
  const warnings: MarketplaceListingMediaDraftIssue[] = [];

  if (drafts === null || drafts === undefined) {
    return {
      errors,
      media: [],
      warnings
    };
  }

  if (!Array.isArray(drafts)) {
    return {
      errors: [{
        message: 'Use a list of media drafts',
        index: -1
      }],
      media: [],
      warnings
    };
  }

  const seenIdentityKeys = new Set<string>();
  const candidates: MarketplaceListingMediaDraftCandidate[] = [];

  drafts.forEach((draft, inputIndex) => {
    if (!isObjectRecord(draft)) {
      errors.push({
        index: inputIndex,
        message: 'Use a media object'
      });
      return;
    }

    const kind = trimOptionalText(draft.kind) ?? MARKETPLACE_LISTING_MEDIA_KIND;
    const mimeType = normalizeMarketplaceListingMediaMimeType(draft.mimeType);
    const id = trimOptionalText(draft.id);
    const url = normalizeMarketplaceListingMediaUrl(draft.url);
    const filename = normalizeMarketplaceListingMediaFilename(draft.filename);
    const sizeBytes = normalizeMarketplaceListingMediaSizeBytes(draft.sizeBytes);
    const sortPosition = normalizeMarketplaceListingMediaPosition(draft.position);
    let hasError = false;

    if (kind !== MARKETPLACE_LISTING_MEDIA_KIND) {
      errors.push({
        field: 'kind',
        index: inputIndex,
        message: 'Only image media is supported'
      });
      hasError = true;
    }

    if (!mimeType) {
      errors.push({
        field: 'mimeType',
        index: inputIndex,
        message: 'Use JPEG, PNG, or WebP image media'
      });
      hasError = true;
    }

    if (!id && !url && !filename) {
      errors.push({
        index: inputIndex,
        message: 'Provide a safe media id, URL, or filename'
      });
      hasError = true;
    }

    if (draft.url !== null && draft.url !== undefined && !url) {
      errors.push({
        field: 'url',
        index: inputIndex,
        message: 'Use a Patcher image proxy media URL'
      });
      hasError = true;
    }

    if (draft.filename !== null && draft.filename !== undefined && !filename) {
      errors.push({
        field: 'filename',
        index: inputIndex,
        message: 'Use a filename without path segments'
      });
      hasError = true;
    }

    if (draft.sizeBytes !== null && draft.sizeBytes !== undefined && sizeBytes === undefined) {
      errors.push({
        field: 'sizeBytes',
        index: inputIndex,
        message: `Use an image smaller than ${MARKETPLACE_LISTING_MEDIA_MAX_PREPROCESSING_SIZE_BYTES} bytes`
      });
      hasError = true;
    }

    if (draft.position !== null && draft.position !== undefined && sortPosition === undefined) {
      warnings.push({
        field: 'position',
        index: inputIndex,
        message: 'Ignoring malformed media position'
      });
    }

    if (hasError) {
      return;
    }

    const identityKeys = getMarketplaceListingMediaIdentityKeys({filename, id, url});
    if (identityKeys.some((key) => seenIdentityKeys.has(key))) {
      warnings.push({
        index: inputIndex,
        message: 'Ignoring duplicate media draft'
      });
      return;
    }

    identityKeys.forEach((key) => seenIdentityKeys.add(key));
    candidates.push({
      kind: MARKETPLACE_LISTING_MEDIA_KIND,
      mimeType: mimeType as MarketplaceListingMediaImageMimeType,
      position: 0,
      inputIndex,
      ...(sortPosition !== undefined ? {sortPosition} : {}),
      ...(id ? {id} : {}),
      ...(url ? {url} : {}),
      ...(filename ? {filename} : {}),
      ...(sizeBytes !== undefined ? {sizeBytes} : {})
    });
  });

  const orderedMedia = candidates
    .sort((first, second) => compareMarketplaceListingMediaCandidates(first, second))
    .slice(0, MARKETPLACE_LISTING_MEDIA_MAX_IMAGE_COUNT)
    .map(({inputIndex, sortPosition, ...media}, position) => ({
      ...media,
      position
    }));

  if (candidates.length > MARKETPLACE_LISTING_MEDIA_MAX_IMAGE_COUNT) {
    candidates
      .sort((first, second) => compareMarketplaceListingMediaCandidates(first, second))
      .slice(MARKETPLACE_LISTING_MEDIA_MAX_IMAGE_COUNT)
      .forEach((candidate) => {
        warnings.push({
          index: candidate.inputIndex,
          message: `Ignoring media beyond the ${MARKETPLACE_LISTING_MEDIA_MAX_IMAGE_COUNT} image limit`
        });
      });
  }

  return {
    errors,
    media: orderedMedia,
    warnings
  };
}

function normalizeMarketplaceListingMediaMimeType(value: unknown): MarketplaceListingMediaImageMimeType | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim().toLocaleLowerCase();
  return MARKETPLACE_LISTING_MEDIA_IMAGE_MIME_TYPES.includes(normalized as MarketplaceListingMediaImageMimeType)
    ? normalized as MarketplaceListingMediaImageMimeType
    : undefined;
}

function normalizeMarketplaceListingMediaUrl(value: unknown): string | undefined {
  const normalized = trimOptionalText(value);

  if (!normalized || normalized.length > MAX_MEDIA_URL_LENGTH || !isAllowedMarketplaceMediaUrl(normalized)) {
    return undefined;
  }

  return normalized;
}

function normalizeMarketplaceListingMediaFilename(value: unknown): string | undefined {
  const normalized = trimOptionalText(value);

  if (!normalized
    || normalized.length > MAX_MEDIA_FILENAME_LENGTH
    || normalized.includes('/')
    || normalized.includes('\\')
    || /[\u0000-\u001f\u007f]/u.test(normalized)) {
    return undefined;
  }

  return normalized;
}

function normalizeMarketplaceListingMediaSizeBytes(value: unknown): number | undefined {
  if (typeof value !== 'number'
    || !Number.isInteger(value)
    || value < 0
    || value > MARKETPLACE_LISTING_MEDIA_MAX_PREPROCESSING_SIZE_BYTES) {
    return undefined;
  }

  return value;
}

function normalizeMarketplaceListingMediaPosition(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== 'string' || value.trim().length === 0) {
    return undefined;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : undefined;
}

function getMarketplaceListingMediaIdentityKeys(
  media: Pick<MarketplaceListingNormalizedMediaDraft, 'filename' | 'id' | 'url'>
): string[] {
  return [
    media.id ? `id:${media.id}` : undefined,
    media.url ? `url:${media.url}` : undefined,
    !media.id && !media.url && media.filename ? `filename:${media.filename.toLocaleLowerCase()}` : undefined
  ].filter((key): key is string => key !== undefined);
}

function compareMarketplaceListingMediaCandidates(
  first: MarketplaceListingMediaDraftCandidate,
  second: MarketplaceListingMediaDraftCandidate
): number {
  const firstHasPosition = first.sortPosition !== undefined;
  const secondHasPosition = second.sortPosition !== undefined;

  if (firstHasPosition && secondHasPosition && first.sortPosition !== second.sortPosition) {
    return (first.sortPosition as number) - (second.sortPosition as number);
  }

  if (firstHasPosition !== secondHasPosition) {
    return firstHasPosition ? -1 : 1;
  }

  return first.inputIndex - second.inputIndex;
}

function isAllowedMarketplaceMediaUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && MARKETPLACE_LISTING_MEDIA_ALLOWED_URL_PREFIXES.some(prefix => value.startsWith(prefix));
  } catch {
    return false;
  }
}
