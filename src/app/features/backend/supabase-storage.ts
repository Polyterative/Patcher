import { MatSnackBar } from '@angular/material/snack-bar';
import {
  forkJoin,
  from as rxFrom,
  Observable,
  of,
  throwError
} from 'rxjs';
import {
  map,
  switchMap
} from 'rxjs/operators';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from 'src/backend/database.types';
import {
  DbStoragePaths,
  StorageUrls
} from './DatabaseStrings';
import { getPublicStorageUrl } from 'src/app/shared-interproject/utils/public-storage-url';
import {
  MARKETPLACE_LISTING_MEDIA_IMAGE_MIME_TYPES,
  MARKETPLACE_LISTING_MEDIA_MAX_PREPROCESSING_SIZE_BYTES,
  type MarketplaceListingMediaImageMimeType
} from 'src/app/features/marketplace/marketplace-listing.utils';
import {
  cacheBust,
  throwIfSupabaseError
} from './supabase.cache';
import {
  SimpleUserModel,
  SupabaseStorageFile
} from './supabase.types';
import {
  buildMarketplaceListingImagePath,
  getMarketplaceListingImagePublicUrl
} from './supabase-marketplace-listings';

export { getMarketplaceListingImagePublicUrl };

function cleanUpFileName(name: string): string {
  return name.toLowerCase().trim();
}

export function getModulePanelPublicUrl(filename: string, useDirectStorageFallback?: false): string;
export function getModulePanelPublicUrl(filename: string, useDirectStorageFallback: true): string | undefined;
export function getModulePanelPublicUrl(filename: string, useDirectStorageFallback: boolean): string | undefined;
export function getModulePanelPublicUrl(filename: string, useDirectStorageFallback = false): string | undefined {
  if (useDirectStorageFallback) {
    return getPublicStorageUrl(DbStoragePaths.module_panels, filename) ?? undefined;
  }

  return `${ StorageUrls.modulePanels }${ filename }`;
}

export function getRackImagePublicUrl(filename: string, useDirectStorageFallback?: false): string;
export function getRackImagePublicUrl(filename: string, useDirectStorageFallback: true): string | undefined;
export function getRackImagePublicUrl(filename: string, useDirectStorageFallback: boolean): string | undefined;
export function getRackImagePublicUrl(filename: string, useDirectStorageFallback = false): string | undefined {
  if (useDirectStorageFallback) {
    return getPublicStorageUrl(DbStoragePaths.racks, filename) ?? undefined;
  }

  return `${ StorageUrls.racks }${ filename }`;
}

export function createStorageNamespace(
  supabase: SupabaseClient<Database>,
  snackBar: MatSnackBar,
  getUserSession$: () => Observable<SimpleUserModel | null>
) {
  // Scoped per-instance (not module-level) so it is naturally torn down and re-created
  // alongside each SupabaseService instance, keeping per-test isolation in storage.spec.ts.
  const signedUrlCache = new Map<string, {url: string; expiresAt: number}>();

  const ns = {
    publicUrlBases: {
      manufacturerLogos: StorageUrls.manufacturerLogos,
      moduleCollections: StorageUrls.moduleCollections,
      modulePanels: StorageUrls.modulePanels,
      marketplaceListings: StorageUrls.marketplaceListings,
      patches: StorageUrls.patches,
      racks: StorageUrls.racks,
    },

    uploadModulePanel: (file: SupabaseStorageFile, filenameAndExtension: string, contentType: string = 'image/jpeg') => {
      filenameAndExtension = cleanUpFileName(filenameAndExtension);
      return getUserSession$().pipe(
        switchMap(user => {
          if (!user) return throwError(() => new Error('Authentication required'));
          const uploadNewPanel$ = rxFrom(
            supabase.storage
              .from(DbStoragePaths.module_panels)
              .upload(filenameAndExtension, file, {
                cacheControl: '360000',
                upsert: true,
                contentType
              })
          );
          const deleteThePossibleOldPanel$ = ns.deletePanelFile(filenameAndExtension);
          return forkJoin([deleteThePossibleOldPanel$, uploadNewPanel$]);
        }),
        cacheBust(['modules', 'currentUserModules', 'moduleWithId']),
        map(() => filenameAndExtension)
      );
    },
    
    uploadRackImage: (file: SupabaseStorageFile, filenameAndExtension: string) => {
      filenameAndExtension = cleanUpFileName(filenameAndExtension);
      filenameAndExtension = filenameAndExtension.split('.').join(
        `_${ new Date().toISOString().replace(/:/g, '-').replace(/[^0-9-]/g, '') }.`
      );
      
      return getUserSession$().pipe(
        switchMap(() => rxFrom(
          supabase.storage
            .from(DbStoragePaths.racks)
            .upload(filenameAndExtension, file, {
              cacheControl: '360',
              contentType: 'image/jpeg'
            })
        ).pipe(
          throwIfSupabaseError(),
          cacheBust(['rackWithId']),
          map(() => filenameAndExtension)
        ))
      );
    },

    uploadPatchPreview: (file: SupabaseStorageFile, filenameAndExtension: string) => {
      filenameAndExtension = cleanUpFileName(filenameAndExtension);

      return getUserSession$().pipe(
        switchMap(user => {
          if (!user) return throwError(() => new Error('Authentication required'));
          return rxFrom(
            supabase.storage
              .from(DbStoragePaths.patches)
              .upload(filenameAndExtension, file, {
                cacheControl: '31536000',
                contentType: 'image/svg+xml',
                upsert: true
              })
          ).pipe(
            throwIfSupabaseError(),
            cacheBust(['patches', 'patchesWithModule']),
            map(() => filenameAndExtension)
          );
        })
      );
    },

    uploadCollectionCover: (file: SupabaseStorageFile, filenameAndExtension: string) => {
      filenameAndExtension = cleanUpFileName(filenameAndExtension);
      filenameAndExtension = filenameAndExtension.split('.').join(
        `_${ new Date().toISOString().replace(/:/g, '-').replace(/[^0-9-]/g, '') }.`
      );

      return getUserSession$().pipe(
        switchMap(() => rxFrom(
          supabase.storage
            .from(DbStoragePaths.module_collections)
            .upload(filenameAndExtension, file, {
              cacheControl: '360',
              contentType: 'image/jpeg'
            })
        ).pipe(
          throwIfSupabaseError(),
          cacheBust(['moduleCollections', 'moduleCollectionWithId']),
          map(() => filenameAndExtension)
        ))
      );
    },

    uploadMarketplaceListingImage: (
      listingId: string,
      file: SupabaseStorageFile,
      filenameAndExtension: string,
      contentType: string
    ) => {
      const normalizedContentType = contentType.trim().toLocaleLowerCase();
      if (!MARKETPLACE_LISTING_MEDIA_IMAGE_MIME_TYPES.includes(
        normalizedContentType as MarketplaceListingMediaImageMimeType
      )) {
        return throwError(() => new Error('Listing media uploads must be JPEG, PNG, or WebP images'));
      }

      const byteSize = storageFileByteSize(file);
      if (byteSize !== undefined && byteSize > MARKETPLACE_LISTING_MEDIA_MAX_PREPROCESSING_SIZE_BYTES) {
        return throwError(() => new Error('Listing media uploads must be 10 MB or smaller'));
      }

      const storageFilename = filenameForMarketplaceListingMimeType(
        filenameAndExtension,
        normalizedContentType as MarketplaceListingMediaImageMimeType
      );
      return getUserSession$().pipe(
        switchMap(user => {
          if (!user) return throwError(() => new Error('Authentication required'));
          const storagePath = buildMarketplaceListingImagePath(user.id, listingId, storageFilename);
          return rxFrom(
            supabase.storage
              .from(DbStoragePaths.marketplace_listings)
              .upload(storagePath, file, {
                cacheControl: '31536000',
                contentType: normalizedContentType,
                upsert: false
              })
          ).pipe(
            throwIfSupabaseError(),
            cacheBust(['marketplaceListings', 'marketplaceListingWithId', 'currentUserMarketplaceListings']),
            map(() => storagePath)
          );
        })
      );
    },

    createMarketplaceListingImageSignedUrl: (storagePath: string, expiresInSeconds = 600) => {
      const normalizedPath = storagePath.trim().toLocaleLowerCase();
      if (!normalizedPath) {
        return throwError(() => new Error('Listing image path is required'));
      }

      const cacheKey = `${ normalizedPath }:${ expiresInSeconds }`;
      const cached = signedUrlCache.get(cacheKey);
      if (cached) {
        if (cached.expiresAt > Date.now()) {
          return of(cached.url);
        }
        // Opportunistic eviction: drop the stale entry now that we know it's expired,
        // so long browser sessions don't accumulate dead entries indefinitely.
        signedUrlCache.delete(cacheKey);
      }

      // Captured before the request fires so the memoized TTL is measured from when
      // Supabase actually starts the signed URL's validity, not from response-receipt time.
      const requestedAt = Date.now();

      return rxFrom(
        supabase.storage
          .from(DbStoragePaths.marketplace_listings)
          .createSignedUrl(normalizedPath, expiresInSeconds)
      ).pipe(
        throwIfSupabaseError<{data: {signedUrl?: string} | null}>(),
        map(response => {
          const signedUrl = response.data?.signedUrl;
          if (!signedUrl) {
            throw new Error('Listing image signed URL missing');
          }

          // Margin keeps the memoized URL safely inside its real signed-URL validity
          // window; clamped to at most half the requested duration so short-lived
          // signed URLs never get a negative/zero effective TTL.
          const marginSeconds = Math.min(60, expiresInSeconds / 2);
          const ttlMs = (expiresInSeconds - marginSeconds) * 1000;
          signedUrlCache.set(cacheKey, {url: signedUrl, expiresAt: requestedAt + ttlMs});

          return signedUrl;
        })
      );
    },

    deleteCollectionCover: (filenameAndExtension: string) => {
      filenameAndExtension = cleanUpFileName(filenameAndExtension);
      return getUserSession$().pipe(
        switchMap(user => {
          if (!user) return throwError(() => new Error('Authentication required'));
          return rxFrom(
            supabase.storage
              .from(DbStoragePaths.module_collections)
              .remove([filenameAndExtension])
          ).pipe(throwIfSupabaseError());
        }),
        cacheBust(['moduleCollections', 'moduleCollectionWithId'])
      );
    },

    deleteRackImage: (filenameAndExtension: string) => {
      filenameAndExtension = cleanUpFileName(filenameAndExtension);
      return getUserSession$().pipe(
        switchMap(user => {
          if (!user) return throwError(() => new Error('Authentication required'));
          return rxFrom(
            supabase.storage
              .from(DbStoragePaths.racks)
              .remove([filenameAndExtension])
          ).pipe(throwIfSupabaseError());
        }),
        cacheBust(['rackWithId'])
      );
    },

    deletePatchPreview: (filenameAndExtension: string) => {
      filenameAndExtension = cleanUpFileName(filenameAndExtension);
      return getUserSession$().pipe(
        switchMap(user => {
          if (!user) return throwError(() => new Error('Authentication required'));
          return rxFrom(
            supabase.storage
              .from(DbStoragePaths.patches)
              .remove([filenameAndExtension])
          ).pipe(throwIfSupabaseError());
        }),
        cacheBust(['patches', 'patchesWithModule'])
      );
    },

    deleteMarketplaceListingImage: (storagePath: string) => {
      storagePath = storagePath.trim().toLocaleLowerCase();
      return getUserSession$().pipe(
        switchMap(user => {
          if (!user) return throwError(() => new Error('Authentication required'));
          if (!storagePath.startsWith(`${ user.id }/`)) {
            return throwError(() => new Error('Listing image path is not owned by the current user'));
          }
          return rxFrom(
            supabase.storage
              .from(DbStoragePaths.marketplace_listings)
              .remove([storagePath])
          ).pipe(throwIfSupabaseError());
        }),
        cacheBust(['marketplaceListings', 'marketplaceListingWithId', 'currentUserMarketplaceListings'])
      );
    },

    deletePanelFile: (path: string) => getUserSession$().pipe(
      switchMap(user => {
        if (!user) return throwError(() => new Error('Authentication required'));
        return rxFrom(
          supabase.storage
            .from(DbStoragePaths.module_panels)
            .remove([path])
        );
      }),
      cacheBust(['modules', 'currentUserModules', 'moduleWithId', 'rackWithId'])
    )
  };
  
  return ns;
}

function storageFileByteSize(file: SupabaseStorageFile): number | undefined {
  if (file instanceof Blob) {
    return file.size;
  }
  if (file instanceof ArrayBuffer) {
    return file.byteLength;
  }
  if (ArrayBuffer.isView(file)) {
    return file.byteLength;
  }
  return undefined;
}

function filenameForMarketplaceListingMimeType(
  filename: string,
  mimeType: MarketplaceListingMediaImageMimeType
): string {
  const basename = filename.replace(/\.[^.]+$/u, '');
  const extension = mimeType === 'image/jpeg'
    ? 'jpg'
    : mimeType.slice('image/'.length);
  return `${ basename }.${ extension }`;
}