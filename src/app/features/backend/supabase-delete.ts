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
  switchMap,
  take
} from 'rxjs/operators';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from 'src/backend/database.types';
import { ModulePanel } from '../../models/module';
import { DbPaths } from './DatabaseStrings';
import {
  cacheBust,
  catchErrors,
  remapErrors,
  throwIfSupabaseError
} from './supabase.cache';
import { SimpleUserModel } from './supabase.types';
import { deleteAllUserData } from './supabase-delete-account-reset';
import {
  CommentableEntityTypes,
  deleteCommentRowsForEntity
} from './supabase-comments';
import {
  REACTION_KIND_COOL,
  REACTION_ROW_COLUMNS,
  type ReactionKind
} from './supabase-reactions';
import { responseData, responseList, type SupabaseSingleResponse } from './supabase-db.types';

type ListingMediaStorageRow = {
  id: string;
  storage_path: string;
};

type ListingWithMediaStorageRows = {
  id: string;
  media: Pick<ListingMediaStorageRow, 'storage_path'>[] | null;
};

function deleteMarketplaceListingImagePaths(
  storagePaths: string[],
  deleteMarketplaceListingImageFn: (storagePath: string) => Observable<unknown>
): Observable<unknown> {
  const uniquePaths = Array.from(new Set(storagePaths.map(path => path.trim()).filter(Boolean)));
  return uniquePaths.length > 0
    ? forkJoin(uniquePaths.map(deleteMarketplaceListingImageFn))
    : of(null);
}


export function createDeleteNamespace(
  supabase: SupabaseClient<Database>,
  snackBar: MatSnackBar,
  getUserSession$: () => Observable<SimpleUserModel | null>,
  deletePanelFileFn: (filename: string) => Observable<unknown>,
  defaultPag: number,
  hasAdminRole$: () => Observable<boolean> = () => rxFrom(Promise.resolve(false)),
  deleteMarketplaceListingImageFn: (storagePath: string) => Observable<unknown> = () =>
    throwError(() => new Error('Marketplace listing image deletion is unavailable'))
) {
  return {
    reaction: (
      entityType: number,
      entityId: number,
      kind: ReactionKind = REACTION_KIND_COOL
    ) => getUserSession$().pipe(
      switchMap(user => {
        if (!user) return throwError(() => new Error('Authentication required'));
        return rxFrom(
          supabase.from(DbPaths.reactions)
            .delete()
            .filter('user_id', 'eq', user.id)
            .filter('entity_type', 'eq', entityType)
            .filter('entity_id', 'eq', entityId)
            .filter('kind', 'eq', kind)
            .select(REACTION_ROW_COLUMNS)
        );
      }),
      cacheBust(['currentUserReactions', 'reactionCounts', 'reactionDiscovery']),
      remapErrors()
    ),

    comment: (id: number) => getUserSession$().pipe(
      switchMap(user => {
        if (!user) return throwError(() => new Error('Authentication required'));
        return rxFrom(
          supabase.from(DbPaths.comments)
            .delete()
            .filter('id', 'eq', id)
            .filter('authorId', 'eq', user.id)
        );
      }),
      cacheBust(['comments', 'currentUserComments']),
      remapErrors()
    ),

    commentsForRack: (id: number) => getUserSession$().pipe(
      switchMap(user => {
        if (!user) return throwError(() => new Error('Authentication required'));
        return rxFrom(deleteCommentRowsForEntity(supabase, id, CommentableEntityTypes.RACK));
      }),
      cacheBust(['comments', 'currentUserComments']),
      remapErrors()
    ),
    
    module: (id: number) => getUserSession$().pipe(
      switchMap(user => {
        if (!user) return throwError(() => new Error('Authentication required'));
        return hasAdminRole$().pipe(
          take(1),
          switchMap(isAdmin => {
            const deleteAllComments$ = rxFrom(
              deleteCommentRowsForEntity(supabase, id, CommentableEntityTypes.MODULE)
            );
            // Admins can delete any module; regular users can only delete their own submissions.
            const deleteModule$ = isAdmin
              ? rxFrom(supabase.from(DbPaths.modules).delete().filter('id', 'eq', id).select('id'))
              : rxFrom(supabase.from(DbPaths.modules).delete().filter('id', 'eq', id).filter('submitter', 'eq', user.id).select('id'));
            return deleteAllComments$.pipe(switchMap(() => deleteModule$));
          })
        );
      }),
      remapErrors(),
      cacheBust(['modules', 'currentUserModules', 'modulePossessionCounts', 'moduleWithId', 'currentUserComments', 'reactionCounts']),
      catchErrors(snackBar)
    ),
    
    userModule: (id: number) => getUserSession$().pipe(
      switchMap(user => rxFrom(
        supabase.from(DbPaths.user_modules)
          .delete()
          .filter('profileid', 'eq', user.id)
          .filter('moduleid', 'eq', id)
      )),
      switchMap(() => rxFrom(deleteCommentRowsForEntity(supabase, id, CommentableEntityTypes.MODULE))),
      cacheBust(['currentUserModules', 'modulePossessionCounts', 'currentUserComments']),
      remapErrors()
    ),
    
    userModuleTag: (moduleTagId: number) => getUserSession$().pipe(
      switchMap(user => rxFrom(
        supabase.from(DbPaths.user_module_tags)
          .delete()
          .filter('authorid', 'eq', user.id)
          .filter('moduletagid', 'eq', moduleTagId)
      )),
      cacheBust(['userModuleTags']),
      remapErrors()
    ),

    userModuleAcquisition: (id: number) => getUserSession$().pipe(
      switchMap(user => {
        if (!user) return throwError(() => new Error('Authentication required'));
        return rxFrom(
          supabase.from(DbPaths.user_module_acquisitions)
            .delete()
            .filter('id', 'eq', id)
            .filter('profileid', 'eq', user.id)
        );
      }),
      cacheBust(['userModuleAcquisitions']),
      remapErrors()
    ),

    shippingAddress: (id: string) => getUserSession$().pipe(
      switchMap(user => {
        if (!user) return throwError(() => new Error('Authentication required'));
        return rxFrom(
          supabase.from(DbPaths.shipping_addresses)
            .delete()
            .filter('id', 'eq', id)
            .filter('profileid', 'eq', user.id)
            .select('id')
        );
      }),
      throwIfSupabaseError(),
      cacheBust(['shippingAddresses']),
      remapErrors()
    ),

    marketplaceListing: (id: string) => getUserSession$().pipe(
      switchMap(user => {
        if (!user) return throwError(() => new Error('Authentication required'));
        return rxFrom(
          supabase.from(DbPaths.marketplace_listings)
            .select('id,media:listing_media(storage_path)')
            .eq('id', id)
            .eq('seller_profileid', user.id)
            .maybeSingle()
        ).pipe(
          throwIfSupabaseError<SupabaseSingleResponse<ListingWithMediaStorageRows | null>>(),
          switchMap(response => {
            const listing = responseData(response);
            if (!listing) {
              return throwError(() => new Error('Marketplace listing not found or not owned by current user'));
            }
            return deleteMarketplaceListingImagePaths(
              listing.media?.map(media => media.storage_path) ?? [],
              deleteMarketplaceListingImageFn
            );
          }),
          switchMap(() => rxFrom(
            supabase.from(DbPaths.marketplace_listings)
              .delete()
              .eq('id', id)
              .eq('seller_profileid', user.id)
              .select('id')
          ))
        );
      }),
      throwIfSupabaseError<SupabaseSingleResponse<{id: string}[]>>(),
      map(response => {
        if (responseList(response).length !== 1) {
          throw new Error('Marketplace listing was not deleted');
        }
        return undefined;
      }),
      cacheBust(['marketplaceListings', 'marketplaceListingWithId', 'currentUserMarketplaceListings']),
      remapErrors()
    ),

    marketplaceListingMedia: (id: string) => getUserSession$().pipe(
      switchMap(user => {
        if (!user) return throwError(() => new Error('Authentication required'));
        return rxFrom(
          supabase.from(DbPaths.listing_media)
            .select('id,storage_path')
            .eq('id', id)
            .maybeSingle()
        ).pipe(
          throwIfSupabaseError<SupabaseSingleResponse<ListingMediaStorageRow | null>>(),
          switchMap(response => {
            const media = responseData(response);
            if (!media) {
              return throwError(() => new Error('Listing media not found or not owned by current user'));
            }
            return deleteMarketplaceListingImageFn(media.storage_path);
          }),
          switchMap(() => rxFrom(
            supabase.from(DbPaths.listing_media)
              .delete()
              .eq('id', id)
              .select('id')
          ))
        );
      }),
      throwIfSupabaseError<SupabaseSingleResponse<{id: string}[]>>(),
      map(response => {
        if (responseList(response).length !== 1) {
          throw new Error('Listing media was not deleted');
        }
        return undefined;
      }),
      cacheBust(['marketplaceListings', 'marketplaceListingWithId', 'currentUserMarketplaceListings']),
      remapErrors()
    ),
    
    rackedModule: (id: number) => getUserSession$().pipe(
      switchMap(user => {
        if (!user) return throwError(() => new Error('Authentication required'));
        return rxFrom(
          supabase.from(DbPaths.rack_modules)
            .delete()
            .filter('id', 'eq', id)
        );
      }),
      cacheBust(['rackWithId']),
      remapErrors()
    ),

    rackedModules: (ids: number[]) => {
      if (ids.length === 0) return of({data: null, error: null});

      return getUserSession$().pipe(
        switchMap(user => {
          if (!user) return throwError(() => new Error('Authentication required'));
          return rxFrom(
            supabase.from(DbPaths.rack_modules)
              .delete()
              .in('id', ids)
          );
        }),
        cacheBust(['rackWithId']),
        remapErrors()
      );
    },

    modulesOfRack: (rackId: number) => getUserSession$().pipe(
      switchMap(user => {
        if (!user) return throwError(() => new Error('Authentication required'));
        return rxFrom(
          supabase.from(DbPaths.rack_modules)
            .delete()
            .filter('rackid', 'eq', rackId)
        );
      }),
      cacheBust(['rackWithId']),
      remapErrors()
    ),
    
    patch: (id: number) => getUserSession$().pipe(
      switchMap(user => {
        if (!user) return throwError(() => new Error('Authentication required'));
        return rxFrom(
          supabase.from(DbPaths.patch_module_instances)
            .delete()
            .filter('patch_id', 'eq', id)
        ).pipe(
          switchMap(() => rxFrom(
            supabase.from(DbPaths.patches)
              .delete()
              .filter('id', 'eq', id)
          )),
          switchMap(() => rxFrom(deleteCommentRowsForEntity(supabase, id, CommentableEntityTypes.PATCH)))
        );
      }),
      remapErrors(),
      cacheBust(['patches', 'patchConnections', 'patchModuleInstances'])
    ),

    patchConnectionsForPatch: (id: number) => getUserSession$().pipe(
      switchMap(user => {
        if (!user) return throwError(() => new Error('Authentication required'));
        return rxFrom(
          supabase.from(DbPaths.patch_connections)
            .delete()
            .filter('patchid', 'eq', id)
        );
      }),
      remapErrors(),
      cacheBust(['patchConnections', 'patches'])
    ),

    patchModuleInstance: (id: number) => getUserSession$().pipe(
      switchMap(user => {
        if (!user) return throwError(() => new Error('Authentication required'));
        return rxFrom(
          supabase.from(DbPaths.patch_module_instances)
            .delete()
            .filter('id', 'eq', id)
        );
      }),
      remapErrors(),
      cacheBust(['patchConnections', 'patchModuleInstances'])
    ),

    patchModuleInstancesForPatch: (patch_id: number) => getUserSession$().pipe(
      switchMap(user => {
        if (!user) return throwError(() => new Error('Authentication required'));
        return rxFrom(
          supabase.from(DbPaths.patch_module_instances)
            .delete()
            .filter('patch_id', 'eq', patch_id)
        );
      }),
      remapErrors(),
      cacheBust(['patchConnections', 'patchModuleInstances'])
    ),
    
    userPatch: (id: number) => getUserSession$()
      .pipe(
        switchMap(user => rxFrom(
          supabase.from(DbPaths.patch_module_instances)
            .delete()
            .filter('patch_id', 'eq', id)
        ).pipe(map(() => user))),
        switchMap(user => rxFrom(
          supabase.from(DbPaths.patches)
            .delete()
            .filter('authorid', 'eq', user.id)
            .filter('id', 'eq', id)
        )),
        switchMap(() => rxFrom(deleteCommentRowsForEntity(supabase, id, CommentableEntityTypes.PATCH))),
        remapErrors(),
        cacheBust(['patches', 'patchConnections', 'patchModuleInstances'])
      ),
    
    userRack: (id: number) => getUserSession$()
      .pipe(
        switchMap(user => rxFrom(
          supabase.from(DbPaths.racks)
            .delete()
            .filter('authorid', 'eq', user.id)
            .filter('id', 'eq', id)
        )),
        remapErrors(),
        cacheBust(['rackWithId', 'racksMinimal', 'reactionCounts'])
      ),

    moduleCollection: (id: number) => getUserSession$().pipe(
      switchMap(user => {
        if (!user) return throwError(() => new Error('Authentication required'));
        return rxFrom(
          supabase
            .from(DbPaths.module_collections)
            .delete()
            .filter('authorid', 'eq', user.id)
            .filter('id', 'eq', id)
        );
      }),
      remapErrors(),
      cacheBust(['moduleCollections', 'moduleCollectionWithId', 'moduleCollectionsByModule'])
    ),

    modules: (from = 0, to: number = defaultPag) => getUserSession$().pipe(
      switchMap(user => {
        if (!user) return throwError(() => new Error('Authentication required'));
        return rxFrom(
          supabase.from(DbPaths.modules)
            .delete()
            .range(from, to)
        );
      }),
      remapErrors(),
      cacheBust(['modules', 'currentUserModules', 'moduleWithId', 'reactionCounts'])
    ),

    manufacturers: (from = 0, to = defaultPag) => getUserSession$().pipe(
      switchMap(user => {
        if (!user) return throwError(() => new Error('Authentication required'));
        return rxFrom(
          supabase.from(DbPaths.manufacturers)
            .delete()
            .range(from, to)
        );
      }),
      cacheBust(['manufacturers']),
      remapErrors()
    ),

    manufacturer: (id: number) => getUserSession$().pipe(
      switchMap(user => {
        if (!user) return throwError(() => new Error('Authentication required'));
        return hasAdminRole$().pipe(
          take(1),
          switchMap(isAdmin => {
            if (!isAdmin) {
              return throwError(() => new Error('Admin access required'));
            }
            return rxFrom(
              supabase.from(DbPaths.manufacturers)
                .delete()
                .filter('id', 'eq', id)
                .select('id')
            );
          })
        );
      }),
      cacheBust(['manufacturers']),
      remapErrors()
    ),

    moduleFlag: (id: number) => rxFrom(
      supabase.from(DbPaths.module_flags).delete().eq('id', id)
    ).pipe(
      map(({error}) => { if (error) throw error; }),
      remapErrors()
    ),

    modulePanel: (data: ModulePanel) => getUserSession$().pipe(
      switchMap(user => {
        if (!user) return throwError(() => new Error('Authentication required'));
        const deletePanelFile$ = deletePanelFileFn(data.filename);
        const deleteDatabaseEntry$ = rxFrom(
          supabase.from(DbPaths.module_panels)
            .delete()
            .filter('id', 'eq', data.id)
        );
        return deletePanelFile$.pipe(switchMap(() => deleteDatabaseEntry$));
      }),
      cacheBust(['modules', 'moduleWithId']),
      remapErrors()
    ),
    
   allUserData: () => deleteAllUserData(supabase, getUserSession$)
   };
}
