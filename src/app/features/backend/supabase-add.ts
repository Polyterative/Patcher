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
import { CV } from '../../models/cv';
import { DBManufacturer } from '../../models/manufacturer';
import { DbModule } from '../../models/module';
import { PatchModuleInstance } from '../../models/connection';
import {
  DEFAULT_RACK_MODULE_ORIENTATION,
  RackMinimal,
  RackModuleOrientation
} from '../../models/rack';
import { DbPaths } from './DatabaseStrings';
import {
  cacheBust,
  catchErrors,
  remapErrors,
  throwIfSupabaseError
} from './supabase.cache';
import { SimpleUserModel } from './supabase.types';
import {
  buildModuleCollectionEntries,
  validatePublicModuleCollectionModuleIds
} from './supabase-module-collections';
import {
  responseData,
  type SupabaseTableInsert,
  type SupabaseTableUpdate,
  type SupabaseSingleResponse
} from './supabase-db.types';
import { UserModuleAcquisitionDraft } from 'src/app/models/user-module-acquisition';
import { MarketplaceShippingAddressDraft } from 'src/app/features/marketplace/marketplace-address-book.utils';
import {
  type MarketplaceListingDraft,
  type MarketplaceListingMediaSaveDraft
} from 'src/app/features/marketplace/marketplace-listing.utils';
import {
  REACTION_KIND_COOL,
  REACTION_ROW_COLUMNS,
  type ReactionKind
} from './supabase-reactions';
import {
  buildShippingAddressInsert,
  mapShippingAddressResponse,
  SHIPPING_ADDRESS_COLUMNS,
  type ShippingAddressRow
} from './supabase-shipping-addresses';
import {
  buildListingMediaInsert,
  buildMarketplaceListingInsert,
  LISTING_MEDIA_COLUMNS,
  mapListingMediaResponse,
  mapMarketplaceListingResponse,
  MARKETPLACE_LISTING_COLUMNS,
  type ListingMediaRow,
  type MarketplaceListingRow
} from './supabase-marketplace-listings';


export function createAddNamespace(
  supabase: SupabaseClient<Database>,
  snackBar: MatSnackBar,
  getUserSession$: () => Observable<SimpleUserModel | null>
) {
  return {
    moduleFlag: (data: {
      module_id: number;
      category: string;
      note?: string | null;
    }) => getUserSession$()
      .pipe(
        switchMap(user => {
          if (!user) return throwError(() => new Error('Authentication required'));
          return rxFrom(
            supabase
              .from(DbPaths.module_flags)
              .insert({
                module_id: data.module_id,
                category: data.category,
                note: data.note ?? null,
                user_id: user.id
              })
          );
        }),
        throwIfSupabaseError(),
        remapErrors()
      ),

    reaction: (
      entityType: number,
      entityId: number,
      kind: ReactionKind = REACTION_KIND_COOL
    ) => getUserSession$()
      .pipe(
        switchMap(user => {
          if (!user) return throwError(() => new Error('Authentication required'));
          const insertData: SupabaseTableInsert<'reactions'> = {
            user_id: user.id,
            entity_type: entityType,
            entity_id: entityId,
            kind
          };
          return rxFrom(
            supabase
              .from(DbPaths.reactions)
              .upsert(insertData, {
                onConflict: 'user_id,entity_type,entity_id,kind',
                ignoreDuplicates: true
              })
              .select(REACTION_ROW_COLUMNS)
              .maybeSingle()
          );
        }),
        throwIfSupabaseError(),
        cacheBust(['currentUserReactions', 'reactionCounts', 'reactionDiscovery']),
        remapErrors()
      ),

    comment: (data: {
      entityId: number,
      entityType: number,
      content: string,
    }) => getUserSession$()
      .pipe(
        switchMap(user => rxFrom(
          supabase
            .from(DbPaths.comments)
            .insert({
              entityId: data.entityId,
              entityType: data.entityType,
              content: data.content,
              authorId: user.id
            })
        )),
        cacheBust(['comments', 'currentUserComments']),
        remapErrors()
      ),
    
    module_tags: (data: Database['public']['Tables']['module_tags']['Insert'][]) => rxFrom(
      supabase
        .from(DbPaths.module_tags)
        .upsert(data)
    )
      .pipe(remapErrors()),
    
    userModule: (moduleId: number) => getUserSession$()
      .pipe(
        switchMap(user => rxFrom(
          supabase
            .from(DbPaths.user_modules)
            .insert({
              moduleid: moduleId,
              profileid: user.id
            })
        )),
        cacheBust(['currentUserModules', 'modulePossessionCounts']),
        remapErrors()
      ),

    userModuleAcquisition: (moduleId: number, data: UserModuleAcquisitionDraft) => getUserSession$()
      .pipe(
        switchMap(user => {
          if (!user) return throwError(() => new Error('Authentication required'));
          const insertData: SupabaseTableInsert<'user_module_acquisitions'> = {
            moduleid: moduleId,
            profileid: user.id,
            acquired_at: data.acquired_at,
            price_amount_minor: data.price_amount_minor ?? null,
            currency: data.price_amount_minor == null ? null : data.currency,
            source: data.source ?? 'unknown',
            note: data.note?.trim() || null
          };
          return rxFrom(
            supabase
              .from(DbPaths.user_module_acquisitions)
              .insert(insertData)
              .select('id,profileid,moduleid,acquired_at,price_amount_minor,currency,source,note,created_at,updated_at')
              .single()
          );
        }),
        throwIfSupabaseError(),
        cacheBust(['userModuleAcquisitions']),
        remapErrors()
      ),

    shippingAddress: (data: MarketplaceShippingAddressDraft) => getUserSession$()
      .pipe(
        switchMap(user => {
          if (!user) return throwError(() => new Error('Authentication required'));
          const insertData = buildShippingAddressInsert(user.id, data);
          return rxFrom(
            supabase
              .from(DbPaths.shipping_addresses)
              .insert(insertData)
              .select(SHIPPING_ADDRESS_COLUMNS)
              .single()
          );
        }),
        throwIfSupabaseError<SupabaseSingleResponse<ShippingAddressRow>>(),
        map(response => mapShippingAddressResponse(response)),
        cacheBust(['shippingAddresses']),
        remapErrors()
      ),

    marketplaceListing: (data: MarketplaceListingDraft) => getUserSession$()
      .pipe(
        switchMap(user => {
          if (!user) return throwError(() => new Error('Authentication required'));
          return rxFrom(
            supabase
              .from(DbPaths.marketplace_listings)
              .insert(buildMarketplaceListingInsert(user.id, data))
              .select(MARKETPLACE_LISTING_COLUMNS)
              .single()
          );
        }),
        throwIfSupabaseError<SupabaseSingleResponse<MarketplaceListingRow>>(),
        map(mapMarketplaceListingResponse),
        cacheBust(['marketplaceListings', 'marketplaceListingWithId', 'currentUserMarketplaceListings']),
        remapErrors()
      ),

    marketplaceListingMedia: (listingId: string, data: MarketplaceListingMediaSaveDraft) => getUserSession$()
      .pipe(
        switchMap(user => {
          if (!user) return throwError(() => new Error('Authentication required'));
          const insertData = buildListingMediaInsert(listingId, data);
          return rxFrom(
            supabase
              .from(DbPaths.listing_media)
              .select('id', {count: 'exact', head: true})
              .eq('listing_id', listingId)
          ).pipe(
            throwIfSupabaseError<SupabaseSingleResponse<{id: string}[]>>(),
            switchMap(response => {
              if ((response.count ?? 0) >= 8) {
                return throwError(() => new Error('Marketplace listings support at most 8 images'));
              }

              return rxFrom(
                supabase
                  .from(DbPaths.listing_media)
                  .insert(insertData)
                  .select(LISTING_MEDIA_COLUMNS)
                  .single()
              );
            })
          );
        }),
        throwIfSupabaseError<SupabaseSingleResponse<ListingMediaRow>>(),
        map(mapListingMediaResponse),
        cacheBust(['marketplaceListings', 'marketplaceListingWithId', 'currentUserMarketplaceListings']),
        remapErrors()
      ),
    
    userModuleTag: (moduleTagId: number) => getUserSession$().pipe(
      switchMap(user => rxFrom(
        supabase
          .from(DbPaths.user_module_tags)
          .insert({moduletagid: moduleTagId, authorid: user.id})
      )),
      cacheBust(['userModuleTags']),
      remapErrors()
    ),
    
    moduleTagLink: (moduleId: number, tagId: number) => getUserSession$().pipe(
      switchMap(() => rxFrom(
        supabase
          .from(DbPaths.module_tags)
          .insert({moduleid: moduleId, tagid: tagId})
          .select('id')
          .single()
      )),
      cacheBust(['modules', 'moduleWithId']),
      remapErrors(),
      map(x => ({id: responseData(x as SupabaseSingleResponse<{id: number}>)?.id as number}))
    ),
    
    rackModule: (
      moduleId: number,
      rackid: number,
      row?: number,
      column?: number,
      orientation: RackModuleOrientation = DEFAULT_RACK_MODULE_ORIENTATION
    ) => getUserSession$().pipe(
      switchMap(user => {
        if (!user) return throwError(() => new Error('Authentication required'));
        return rxFrom(
          supabase
            .from(DbPaths.rack_modules)
            .insert({
              moduleid: moduleId,
              rackid,
              row,
              column,
              orientation
            })
            .select('id,moduleid,rackid,row,column,selected_panel_id,orientation')
        );
      }),
      cacheBust(['rackWithId']),
      remapErrors()
    ),

    rack: (data: Omit<RackMinimal, 'author' | 'created' | 'updated' | 'id'>) => getUserSession$().pipe(
      switchMap(user => {
        if (!user) return throwError(() => new Error('Authentication required'));
        return rxFrom(
          supabase
            .from(DbPaths.racks)
            .insert({...data, authorid: user.id})
            .select('id, public_id')
        );
      }),
      cacheBust(['rackWithId', 'racksMinimal']),
      remapErrors()
    ),
    
    patch: (data: {
      name: string;
      public?: boolean;
      linked_rack_id?: number | null;
    }) => {
      return getUserSession$().pipe(
        switchMap(user => {
          if (!user) return throwError(() => new Error('Authentication required'));
          return rxFrom(
            supabase
              .from(DbPaths.patches)
              .insert({
                name: data.name,
                authorid: user.id,
                public: data.public ?? true,
                ...(data.linked_rack_id === undefined ? {} : {linked_rack_id: data.linked_rack_id})
              })
              .select('id, public_id')
          );
        }),
        throwIfSupabaseError<SupabaseSingleResponse<{id: number}>>(),
        cacheBust(['patches']),
        remapErrors());
    },
    
    modules: (data: DbModule[]) => {
      return getUserSession$().pipe(
        map(user =>
          data
            .map(x => ({
              ...x,
              submitter: user.id
            }))
            .map(x => {
              const dbData: Record<string, unknown> = {...x};
              const standard = dbData['standard'];
              if (standard && typeof standard === 'object' && 'id' in standard) {
                dbData['standard'] = standard.id;
              }
              const manufacturer = dbData['manufacturer'];
              if (manufacturer && typeof manufacturer === 'object' && 'id' in manufacturer) {
                dbData['manufacturerId'] = manufacturer.id;
                delete dbData['manufacturer'];
              }
              delete dbData['ins'];
              delete dbData['outs'];
              delete dbData['switches'];
              delete dbData['panels'];
              delete dbData['tags'];
              
              if (!x.id) {
                return rxFrom(
                  supabase
                    .from(DbPaths.modules)
                    .insert(dbData as SupabaseTableInsert<'modules'>)
                );
              } else {
                return rxFrom(
                  supabase
                    .from(DbPaths.modules)
                    .update(dbData as SupabaseTableUpdate<'modules'>)
                    .eq('id', x.id)
                );
              }
            })
        ),
        switchMap((x) => forkJoin(x)),
        cacheBust(['modules', 'currentUserModules', 'moduleWithId']),
        catchErrors(snackBar)
      );
    },
    
    moduleINs: (data: CV[], moduleid: number) => rxFrom(
      supabase
        .from(DbPaths.moduleINs)
        .insert(data.map(x => ({
          ...x,
          moduleid
        })))
    )
      .pipe(remapErrors()),
    
    moduleOUTs: (data: CV[], moduleid: number) => rxFrom(
      supabase
        .from(DbPaths.moduleOUTs)
        .insert(data.map(x => ({
          ...x,
          moduleid
        })))
    )
      .pipe(remapErrors()),
    
    manufacturers: (data: Partial<DBManufacturer>[]) => rxFrom(
      supabase
        .from(DbPaths.manufacturers)
        .insert(data)
        .select('id,name')
    )
      .pipe(
        remapErrors(),
        cacheBust(['manufacturers'])
      ),

    moduleCollection: (data: {
      name: string;
      description?: string | null;
      public?: boolean;
      image?: string | null;
      moduleIds?: number[];
    }) => getUserSession$().pipe(
      switchMap(user => {
        if (!user) return throwError(() => new Error('Authentication required'));
        return validatePublicModuleCollectionModuleIds(supabase, data.moduleIds ?? []).pipe(
          switchMap(moduleIds => rxFrom(
            supabase
              .from(DbPaths.module_collections)
              .insert({
                authorid: user.id,
                name: data.name,
                description: data.description ?? null,
                public: data.public ?? false,
                image: data.image ?? null
              })
              .select('id')
              .single()
          ).pipe(
            throwIfSupabaseError(),
            switchMap((response) => {
              const collectionId = responseData(response as SupabaseSingleResponse<{id: number}>)?.id;
              if (!collectionId) {
                return throwError(() => new Error('Created collection response did not include an id.'));
              }

              const entries = buildModuleCollectionEntries(collectionId, moduleIds);

              return entries.length > 0
                ? rxFrom(supabase.from(DbPaths.module_collection_entries).insert(entries)).pipe(
                  throwIfSupabaseError(),
                  map(() => collectionId)
                )
                : of(collectionId);
            })
          ))
        );
      }),
      cacheBust(['moduleCollections', 'moduleCollectionWithId', 'moduleCollectionsByModule']),
    ),
    
    panel: (data: Database['public']['Tables']['module_panels']['Insert'][]) => rxFrom(
      supabase
        .from(DbPaths.module_panels)
        .insert(data)
    )
      .pipe(
        cacheBust(['modules', 'moduleWithId']),
        remapErrors()
      ),
    
    patchModuleInstance: (patch_id: number, module_id: number, instance_label?: string) => getUserSession$().pipe(
      switchMap(user => {
        if (!user) return throwError(() => new Error('Authentication required'));
        return rxFrom(
          supabase
            .from(DbPaths.patch_module_instances)
            .insert({patch_id, module_id, instance_label: instance_label ?? null})
            .select('id,patch_id,module_id,instance_label')
            .single()
        );
      }),
      remapErrors(),
      map(x => responseData(x as SupabaseSingleResponse<PatchModuleInstance>) as PatchModuleInstance),
      cacheBust(['patchConnections', 'patchModuleInstances'])
    ),

    /** Batch insert multiple patch module instances in a single DB call */
    patchModuleInstances: (rows: {
      patch_id: number;
      module_id: number;
      instance_label: string | null
    }[]) => getUserSession$().pipe(
      switchMap(user => {
        if (!user) return throwError(() => new Error('Authentication required'));
        return rxFrom(
          supabase
            .from(DbPaths.patch_module_instances)
            .insert(rows)
            .select('id,patch_id,module_id,instance_label')
        );
      }),
      remapErrors(),
      map(x => responseData(x as SupabaseSingleResponse<PatchModuleInstance[]>) ?? []),
      cacheBust(['patchConnections', 'patchModuleInstances'])
    )
  };
}
