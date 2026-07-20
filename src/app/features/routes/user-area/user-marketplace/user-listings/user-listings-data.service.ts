import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  BehaviorSubject,
  EMPTY,
  forkJoin,
  from as rxFrom,
  Observable,
  of,
  Subject,
  throwError
} from 'rxjs';
import {
  catchError,
  concatMap,
  exhaustMap,
  map,
  switchMap,
  take,
  tap,
  toArray
} from 'rxjs/operators';
import { UserManagementService } from 'src/app/features/backbone/login/user-management.service';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { RichUserModel } from 'src/app/features/backend/supabase.types';
import {
  MarketplaceListing,
  MarketplaceListingDraft,
  MarketplaceListingMedia,
  MarketplaceListingMediaImageMimeType,
  MarketplaceListingStatus,
  normalizeMarketplaceListingMediaDrafts
} from 'src/app/features/marketplace/marketplace-listing.utils';
import { getMarketplaceCurrencyFractionDigits } from 'src/app/features/marketplace/marketplace-money.utils';
import { MinimalModule } from 'src/app/models/module';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';

export type UserListingsStatusFilter = 'all' | 'active' | 'draft' | 'paused' | 'closed';

export interface UserListingsSaveRequest {
  id?: string | null;
  draft: MarketplaceListingDraft;
  files?: File[];
}

export interface UserListingsLifecycleRequest {
  listing: MarketplaceListing;
  status: MarketplaceListingStatus;
}

export interface UserListingsMediaDeleteRequest {
  listing: MarketplaceListing;
  media: MarketplaceListingMedia;
}

export interface UserListingsMediaMoveRequest {
  listing: MarketplaceListing;
  media: MarketplaceListingMedia;
  direction: -1 | 1;
}

export interface UserListingsSaveSucceeded {
  failedFiles: File[];
  listing: MarketplaceListing;
  partialError: string | null;
}

export interface UserListingsViewModel {
  busy: boolean;
  busyLabel: string | null;
  eligibleModules: MinimalModule[];
  listError: string | null;
  listings: MarketplaceListing[];
  loading: boolean;
  mutationError: string | null;
  sellerProfileId: string | null;
  statusMessage: string | null;
}

interface UploadResult {
  failed: number;
  failedFiles: File[];
  message: string | null;
  uploaded: number;
  uploadedMedia: MarketplaceListingMedia[];
}

interface FileUploadResult {
  file: File;
  media: MarketplaceListingMedia | null;
  uploaded: boolean;
}

const EMPTY_VM: UserListingsViewModel = {
  busy: false,
  busyLabel: null,
  eligibleModules: [],
  listError: null,
  listings: [],
  loading: false,
  mutationError: null,
  sellerProfileId: null,
  statusMessage: null
};

@Injectable()
export class UserListingsDataService extends SubManager {
  private readonly _vm$ = new BehaviorSubject<UserListingsViewModel>(EMPTY_VM);

  readonly vm$ = this._vm$.asObservable();
  readonly load$ = new Subject<void>();
  readonly save$ = new Subject<UserListingsSaveRequest>();
  readonly lifecycle$ = new Subject<UserListingsLifecycleRequest>();
  readonly mediaDelete$ = new Subject<UserListingsMediaDeleteRequest>();
  readonly mediaMove$ = new Subject<UserListingsMediaMoveRequest>();
  readonly saveSucceeded$ = new Subject<UserListingsSaveSucceeded>();

  get snapshot(): UserListingsViewModel {
    return this._vm$.value;
  }

  constructor(
    private readonly backend: SupabaseService,
    private readonly userService: UserManagementService,
    private readonly snackBar: MatSnackBar
  ) {
    super();
    this.initializeLoadHandler();
    this.initializeSaveHandler();
    this.initializeLifecycleHandler();
    this.initializeMediaHandlers();
  }

  private initializeLoadHandler(): void {
    this.load$.pipe(
      tap(() => this.patchVm({loading: true, listError: null, mutationError: null, statusMessage: null})),
      switchMap(() => this.loadSellerState().pipe(
        catchError(error => {
          const message = this.errorMessage(error, 'Marketplace listings could not be loaded.');
          SharedConstants.errorCustom(this.snackBar, message);
          return of({
            eligibleModules: this.snapshot.eligibleModules,
            error: message,
            listings: this.snapshot.listings,
            sellerProfileId: this.snapshot.sellerProfileId
          });
        })
      )),
      this.takeUntilDestroyed()
    ).subscribe(result => this.patchVm({
      eligibleModules: result.eligibleModules,
      listError: result.error,
      listings: result.listings,
      loading: false,
      sellerProfileId: result.sellerProfileId
    }));
  }

  private initializeSaveHandler(): void {
    this.save$.pipe(
      exhaustMap(request => {
        if (this.snapshot.busy) {
          return EMPTY;
        }

        this.patchVm({
          busy: true,
          busyLabel: request.id ? 'Saving listing…' : 'Creating listing…',
          mutationError: null,
          statusMessage: null
        });

        const files = request.files ?? [];
        const saveRequest$ = request.id
          ? this.backend.update.marketplaceListing(request.id, request.draft)
          : this.backend.add.marketplaceListing(request.draft);

        return saveRequest$.pipe(
          switchMap(saved => {
            const existing = request.id
              ? this.snapshot.listings.find(listing => listing.id === request.id)
              : undefined;
            const savedWithExistingMedia = {
              ...existing,
              ...saved,
              media: saved.media.length > 0 ? saved.media : existing?.media ?? []
            };
            return this.uploadFilesForListing(savedWithExistingMedia, files).pipe(
              map(upload => ({
                failedFiles: upload.failedFiles,
                partialError: upload.message,
                saved: {
                  ...savedWithExistingMedia,
                  media: [...savedWithExistingMedia.media, ...upload.uploadedMedia]
                }
              }))
            );
          }),
          switchMap(result => this.refreshListings(result.saved).pipe(
            map(refresh => ({
              ...refresh,
              failedFiles: result.failedFiles,
              partialError: result.partialError,
              saved: this.listingFromRefresh(refresh.listings, result.saved.id) ?? result.saved
            }))
          )),
          catchError(error => {
            const message = this.errorMessage(error, 'Marketplace listing could not be saved.');
            SharedConstants.errorCustom(this.snackBar, message);
            return of({
              error: message,
              failedFiles: files,
              listings: this.snapshot.listings,
              partialError: null,
              saved: null
            });
          })
        );
      }),
      this.takeUntilDestroyed()
    ).subscribe(result => {
      this.patchVm({
        busy: false,
        busyLabel: null,
        listings: result.listings,
        mutationError: result.error,
        statusMessage: result.partialError
      });

      if (result.saved) {
        if (result.partialError) {
          SharedConstants.errorCustom(this.snackBar, result.partialError);
        } else {
          SharedConstants.successSaveShort(this.snackBar);
        }
        this.saveSucceeded$.next({
          failedFiles: result.failedFiles,
          listing: result.saved,
          partialError: result.partialError
        });
      }
    });
  }

  private initializeLifecycleHandler(): void {
    this.lifecycle$.pipe(
      exhaustMap(request => {
        if (this.snapshot.busy) {
          return EMPTY;
        }

        this.patchVm({
          busy: true,
          busyLabel: this.lifecycleBusyLabel(request.status),
          mutationError: null,
          statusMessage: null
        });

        return this.backend.update.marketplaceListing(
          request.listing.id,
          this.draftFromListing(request.listing, request.status)
        ).pipe(
          switchMap(updated => this.refreshListings({
            ...updated,
            media: request.listing.media
          }).pipe(
            map(refresh => ({
              ...refresh,
              changed: this.listingFromRefresh(refresh.listings, updated.id) ?? updated,
              status: request.status
            }))
          )),
          catchError(error => {
            const message = this.errorMessage(error, 'Marketplace listing status could not be changed.');
            SharedConstants.errorCustom(this.snackBar, message);
            return of({
              changed: null,
              error: message,
              listings: this.snapshot.listings,
              status: request.status
            });
          })
        );
      }),
      this.takeUntilDestroyed()
    ).subscribe(result => {
      const statusMessage = this.lifecycleSuccessMessage(result.status);
      this.patchVm({
        busy: false,
        busyLabel: null,
        listings: result.listings,
        mutationError: result.error,
        statusMessage: result.changed ? statusMessage : null
      });

      if (result.changed && statusMessage) {
        SharedConstants.successCustom(this.snackBar, statusMessage);
      }
    });
  }

  private initializeMediaHandlers(): void {
    this.mediaDelete$.pipe(
      exhaustMap(request => {
        if (this.snapshot.busy) {
          return EMPTY;
        }

        this.patchVm({busy: true, busyLabel: 'Deleting image…', mutationError: null, statusMessage: null});
        const optimisticListing = {
          ...request.listing,
          media: request.listing.media.filter(media => media.id !== request.media.id)
        };
        return this.backend.delete.marketplaceListingMedia(request.media.id).pipe(
          switchMap(() => this.refreshListings(optimisticListing)),
          catchError(error => {
            const message = this.errorMessage(error, 'Listing image could not be deleted.');
            SharedConstants.errorCustom(this.snackBar, message);
            return of({error: message, listings: this.snapshot.listings});
          })
        );
      }),
      this.takeUntilDestroyed()
    ).subscribe(result => this.patchVm({
      busy: false,
      busyLabel: null,
      listings: result.listings,
      mutationError: result.error
    }));

    this.mediaMove$.pipe(
      exhaustMap(request => {
        if (this.snapshot.busy) {
          return EMPTY;
        }

        const orderedMediaIds = this.reorderedMediaIds(request);
        if (!orderedMediaIds) {
          return EMPTY;
        }

        this.patchVm({busy: true, busyLabel: 'Reordering images…', mutationError: null, statusMessage: null});
        const optimisticListing = this.listingWithMediaOrder(request.listing, orderedMediaIds);
        return this.backend.update.marketplaceListingMediaOrder(request.listing.id, orderedMediaIds).pipe(
          switchMap(() => this.refreshListings(optimisticListing)),
          catchError(error => {
            const message = this.errorMessage(error, 'Listing images could not be reordered.');
            SharedConstants.errorCustom(this.snackBar, message);
            return of({error: message, listings: this.snapshot.listings});
          })
        );
      }),
      this.takeUntilDestroyed()
    ).subscribe(result => this.patchVm({
      busy: false,
      busyLabel: null,
      listings: result.listings,
      mutationError: result.error
    }));
  }

  private loadSellerState(): Observable<{
    eligibleModules: MinimalModule[];
    error: string | null;
    listings: MarketplaceListing[];
    sellerProfileId: string | null;
  }> {
    return this.userService.loggedUserFullProfile$.pipe(
      take(1),
      switchMap((profile: RichUserModel | undefined) => forkJoin({
        listings: this.backend.get.currentUserMarketplaceListings(),
        modules: this.backend.GET.currentUserModules(false)
      }).pipe(
        map(({listings, modules}) => ({
          eligibleModules: (modules ?? []).filter(module => module.possessionKind === 'SELLS'),
          error: null,
          listings: listings ?? [],
          sellerProfileId: profile?.id ?? this.inferSellerProfileId(listings ?? [])
        }))
      ))
    );
  }

  private refreshListings(fallbackListing?: MarketplaceListing): Observable<{
    error: string | null;
    listings: MarketplaceListing[];
  }> {
    return this.backend.get.currentUserMarketplaceListings().pipe(
      map(listings => ({error: null, listings})),
      catchError(() => {
        const message = 'Listing changed, but the listing list could not be refreshed.';
        SharedConstants.errorCustom(this.snackBar, message);
        const listings = fallbackListing
          ? this.mergeListing(this.snapshot.listings, fallbackListing)
          : this.snapshot.listings;
        return of({error: message, listings});
      })
    );
  }

  private uploadFilesForListing(listing: MarketplaceListing, files: File[]): Observable<UploadResult> {
    if (files.length === 0) {
      return of({failed: 0, failedFiles: [], message: null, uploaded: 0, uploadedMedia: []});
    }

    const normalized = normalizeMarketplaceListingMediaDrafts([
      ...listing.media.map(media => ({
        id: media.id,
        mimeType: media.mimeType,
        position: media.position
      })),
      ...files.map((file, index) => ({
        filename: file.name,
        mimeType: file.type,
        position: listing.media.length + index,
        sizeBytes: file.size
      }))
    ]);

    if (normalized.errors.length > 0 || listing.media.length + files.length > 8) {
      return throwError(() => new Error(
        normalized.errors[0]?.message ?? 'Marketplace listings support at most 8 images'
      ));
    }

    return rxFrom(files).pipe(
      concatMap((file, index) => this.backend.storage.uploadMarketplaceListingImage(
        listing.id,
        file,
        file.name,
        file.type
      ).pipe(
        switchMap(storagePath => this.backend.add.marketplaceListingMedia(listing.id, {
          filename: file.name,
          mimeType: file.type as MarketplaceListingMediaImageMimeType,
          position: listing.media.length + index,
          storagePath
        }).pipe(
          map((media: MarketplaceListingMedia): FileUploadResult => ({file, media, uploaded: true})),
          catchError(error => {
            console.error('Marketplace listing media record creation failed:', error);
            return this.backend.storage.deleteMarketplaceListingImage(storagePath).pipe(
              catchError(cleanupError => {
                console.error('Marketplace listing orphaned image cleanup failed:', cleanupError);
                return of(null);
              }),
              map((): FileUploadResult => ({file, media: null, uploaded: false}))
            );
          })
        )),
        catchError(error => {
          console.error('Marketplace listing media upload failed:', error);
          return of<FileUploadResult>({file, media: null, uploaded: false});
        })
      )),
      toArray(),
      map(results => {
        const failedFiles = results.filter(result => !result.uploaded).map(result => result.file);
        const uploaded = results.length - failedFiles.length;
        const failed = results.length - uploaded;
        return {
          failed,
          failedFiles,
          uploaded,
          uploadedMedia: results.flatMap(result => result.media ? [result.media] : []),
          message: failed > 0
            ? `Listing saved, but ${failed} image${failed === 1 ? '' : 's'} could not be uploaded.`
            : null
        };
      })
    );
  }

  private draftFromListing(
    listing: MarketplaceListing,
    status: MarketplaceListingStatus
  ): MarketplaceListingDraft {
    return {
      askingPrice: this.minorUnitsToInput(listing.askingPriceAmountMinor, listing.askingPriceCurrency),
      askingPriceCurrency: listing.askingPriceCurrency,
      condition: listing.condition,
      description: listing.description,
      externalLink: listing.externalLink,
      moduleId: String(listing.moduleId),
      openToOffers: listing.openToOffers,
      sellerProfileId: listing.sellerProfileId,
      shippingNotes: listing.shippingNotes,
      shippingOptions: listing.shippingOptions,
      shipsFromCountry: listing.shipsFromCountry,
      status,
      titleOverride: listing.titleOverride
    };
  }

  private minorUnitsToInput(amountMinor: number, currency: string): string {
    const fractionDigits = getMarketplaceCurrencyFractionDigits(currency);
    return (amountMinor / (10 ** fractionDigits)).toFixed(fractionDigits);
  }

  private reorderedMediaIds(request: UserListingsMediaMoveRequest): string[] | null {
    const sorted = [...request.listing.media].sort((first, second) => first.position - second.position);
    const currentIndex = sorted.findIndex(media => media.id === request.media.id);
    const targetIndex = currentIndex + request.direction;

    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= sorted.length) {
      return null;
    }

    [sorted[currentIndex], sorted[targetIndex]] = [sorted[targetIndex], sorted[currentIndex]];
    return sorted.map(media => media.id);
  }

  private mergeListing(listings: MarketplaceListing[], listing: MarketplaceListing): MarketplaceListing[] {
    const existingIndex = listings.findIndex(candidate => candidate.id === listing.id);
    if (existingIndex < 0) {
      return [listing, ...listings];
    }
    return listings.map(candidate => candidate.id === listing.id ? {
      ...candidate,
      ...listing,
      media: listing.media,
      module: listing.module ?? candidate.module,
      seller: listing.seller ?? candidate.seller
    } : candidate);
  }

  private listingFromRefresh(listings: MarketplaceListing[], id: string): MarketplaceListing | undefined {
    return listings.find(listing => listing.id === id);
  }

  private listingWithMediaOrder(listing: MarketplaceListing, orderedMediaIds: string[]): MarketplaceListing {
    const positions = new Map(orderedMediaIds.map((id, position) => [id, position]));
    return {
      ...listing,
      media: listing.media
        .map(media => ({
          ...media,
          position: positions.get(media.id) ?? media.position
        }))
        .sort((first, second) => first.position - second.position)
    };
  }

  private inferSellerProfileId(listings: MarketplaceListing[]): string | null {
    return listings[0]?.sellerProfileId ?? null;
  }

  private lifecycleBusyLabel(status: MarketplaceListingStatus): string {
    switch (status) {
      case 'active':
        return 'Publishing listing…';
      case 'paused':
        return 'Pausing listing…';
      case 'closed_sold':
      case 'closed_unsold':
        return 'Closing listing…';
      default:
        return 'Updating listing…';
    }
  }

  private lifecycleSuccessMessage(status: MarketplaceListingStatus): string | null {
    switch (status) {
      case 'active':
        return 'Listing is active.';
      case 'paused':
        return 'Listing is paused.';
      case 'closed_sold':
        return 'Listing closed as sold. Your module collection state is unchanged.';
      case 'closed_unsold':
        return 'Listing closed as unsold. Your module collection state is unchanged.';
      default:
        return 'Listing updated.';
    }
  }

  private errorMessage(error: unknown, fallback: string): string {
    if (error instanceof Error && error.message.trim()) {
      return error.message;
    }
    return fallback;
  }

  private patchVm(patch: Partial<UserListingsViewModel>): void {
    this._vm$.next({
      ...this.snapshot,
      ...patch
    });
  }
}
