import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  BehaviorSubject,
  Observable,
  of,
  Subject
} from 'rxjs';
import {
  catchError,
  exhaustMap,
  map,
  switchMap,
  tap
} from 'rxjs/operators';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import {
  MarketplaceSavedShippingAddress,
  MarketplaceShippingAddressDraft,
  normalizeMarketplaceDefaultAddressSelection
} from 'src/app/features/marketplace/marketplace-address-book.utils';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';

export interface UserAddressBookSaveRequest {
  id?: string | null;
  draft: MarketplaceShippingAddressDraft;
}

export interface UserAddressBookViewModel {
  addresses: MarketplaceSavedShippingAddress[];
  deletingId: string | null;
  listError: string | null;
  loading: boolean;
  mutationError: string | null;
  saving: boolean;
}

const EMPTY_VM: UserAddressBookViewModel = {
  addresses: [],
  deletingId: null,
  listError: null,
  loading: false,
  mutationError: null,
  saving: false
};

@Injectable()
export class UserAddressBookDataService extends SubManager {
  private readonly _vm$ = new BehaviorSubject<UserAddressBookViewModel>(EMPTY_VM);

  readonly vm$ = this._vm$.asObservable();
  readonly load$ = new Subject<void>();
  readonly save$ = new Subject<UserAddressBookSaveRequest>();
  readonly delete$ = new Subject<MarketplaceSavedShippingAddress>();
  readonly setDefault$ = new Subject<MarketplaceSavedShippingAddress>();
  readonly saveSucceeded$ = new Subject<MarketplaceSavedShippingAddress>();
  readonly deleteSucceeded$ = new Subject<string>();

  get snapshot(): UserAddressBookViewModel {
    return this._vm$.value;
  }

  constructor(
    private readonly backend: SupabaseService,
    private readonly snackBar: MatSnackBar
  ) {
    super();

    this.load$.pipe(
      tap(() => this.patchVm({loading: true, listError: null})),
      switchMap(() => this.loadAddresses().pipe(
        map(addresses => ({addresses, error: null})),
        catchError(() => {
          const error = 'Shipping addresses could not be loaded.';
          SharedConstants.errorCustom(this.snackBar, error);
          return of({addresses: this.snapshot.addresses, error});
        })
      )),
      this.takeUntilDestroyed()
    ).subscribe(result => this.patchVm({
      addresses: result.addresses,
      listError: result.error,
      loading: false
    }));

    this.save$.pipe(
      exhaustMap(request => {
        this.patchVm({mutationError: null, saving: true});
        const draft = this.defaultSafeDraft(request);
        const saveRequest$ = request.id
          ? this.backend.update.shippingAddress(request.id, draft)
          : this.backend.add.shippingAddress(draft);

        return saveRequest$.pipe(
          tap(saved => this.patchVm({addresses: this.addressesAfterSave(saved)})),
          switchMap(saved => this.refreshAddresses(saved.isDefault ? saved.id : undefined).pipe(
            map(refresh => ({...refresh, saved}))
          )),
          catchError(() => {
            const error = 'Shipping address could not be saved.';
            SharedConstants.errorCustom(this.snackBar, error);
            return of({addresses: this.snapshot.addresses, error, saved: null});
          })
        );
      }),
      this.takeUntilDestroyed()
    ).subscribe(result => {
      this.patchVm({
        addresses: result.addresses,
        mutationError: result.error,
        saving: false
      });

      if (result.saved) {
        SharedConstants.successSaveShort(this.snackBar);
        this.saveSucceeded$.next(result.saved);
      }
    });

    this.delete$.pipe(
      exhaustMap(address => {
        this.patchVm({deletingId: address.id, mutationError: null});
        const replacement = this.defaultReplacementForDelete(address);
        const deleteError = 'Shipping address could not be deleted.';
        const deleteRequest$ = replacement
          ? this.backend.update.shippingAddress(replacement.id, {...replacement, isDefault: true}).pipe(
            switchMap(promoted => this.backend.delete.shippingAddress(address.id).pipe(
              map(() => ({
                addresses: this.addressesAfterDelete(address.id, promoted.id),
                deleted: true,
                error: null,
                selectedDefaultId: promoted.id
              })),
              catchError(() => this.loadAddresses(promoted.id).pipe(
                map(addresses => {
                  SharedConstants.errorCustom(this.snackBar, deleteError);
                  return {
                    addresses,
                    deleted: false,
                    error: deleteError,
                    selectedDefaultId: promoted.id
                  };
                }),
                catchError(() => {
                  SharedConstants.errorCustom(this.snackBar, deleteError);
                  return of({
                    addresses: this.addressesAfterSave(promoted),
                    deleted: false,
                    error: deleteError,
                    selectedDefaultId: promoted.id
                  });
                })
              ))
            ))
          )
          : this.backend.delete.shippingAddress(address.id).pipe(
            map(() => ({
              addresses: this.addressesAfterDelete(address.id),
              deleted: true,
              error: null,
              selectedDefaultId: undefined
            }))
          );

        return deleteRequest$.pipe(
          tap(result => this.patchVm({addresses: result.addresses})),
          switchMap(result => result.deleted
            ? this.refreshAddresses(result.selectedDefaultId).pipe(
              map(refresh => ({addressId: address.id, deleted: true, ...refresh}))
            )
            : of({addressId: address.id, ...result})
          ),
          catchError(() => {
            SharedConstants.errorCustom(this.snackBar, deleteError);
            return of({addressId: address.id, addresses: this.snapshot.addresses, deleted: false, error: deleteError});
          })
        );
      }),
      this.takeUntilDestroyed()
    ).subscribe(result => {
      this.patchVm({
        addresses: result.addresses,
        deletingId: null,
        mutationError: result.error
      });

      if (result.deleted) {
        SharedConstants.successDelete(this.snackBar);
        this.deleteSucceeded$.next(result.addressId);
      }
    });

    this.setDefault$.pipe(
      tap(address => {
        if (!address.isDefault) {
          this.save$.next({
            id: address.id,
            draft: {...address, isDefault: true}
          });
        }
      }),
      this.takeUntilDestroyed()
    ).subscribe();
  }

  private loadAddresses(selectedDefaultId?: string) {
    return this.backend.get.currentUserShippingAddresses().pipe(
      map(addresses => normalizeMarketplaceDefaultAddressSelection(addresses, selectedDefaultId))
    );
  }

  private refreshAddresses(selectedDefaultId?: string): Observable<{
    addresses: MarketplaceSavedShippingAddress[];
    error: string | null;
  }> {
    return this.loadAddresses(selectedDefaultId).pipe(
      map(addresses => ({addresses, error: null})),
      catchError(() => {
        const error = 'Shipping addresses changed, but the list could not be refreshed.';
        SharedConstants.errorCustom(this.snackBar, error);
        return of({addresses: this.snapshot.addresses, error});
      })
    );
  }

  private defaultSafeDraft(request: UserAddressBookSaveRequest): MarketplaceShippingAddressDraft {
    if (!request.id && this.snapshot.addresses.length === 0) {
      return {...request.draft, isDefault: true};
    }

    const existing = request.id
      ? this.snapshot.addresses.find(address => address.id === request.id)
      : undefined;

    if (existing?.isDefault && request.draft.isDefault !== true) {
      return {...request.draft, isDefault: true};
    }

    return request.draft;
  }

  private defaultReplacementForDelete(
    address: MarketplaceSavedShippingAddress
  ): MarketplaceSavedShippingAddress | undefined {
    if (!address.isDefault) {
      return undefined;
    }

    return this.snapshot.addresses.find(candidate => candidate.id !== address.id);
  }

  private addressesAfterSave(saved: MarketplaceSavedShippingAddress): MarketplaceSavedShippingAddress[] {
    const existingIndex = this.snapshot.addresses.findIndex(address => address.id === saved.id);
    const nextAddresses = existingIndex >= 0
      ? this.snapshot.addresses.map(address => address.id === saved.id ? saved : address)
      : [saved, ...this.snapshot.addresses];

    return normalizeMarketplaceDefaultAddressSelection(
      nextAddresses,
      saved.isDefault ? saved.id : undefined
    );
  }

  private addressesAfterDelete(deletedId: string, promotedDefaultId?: string): MarketplaceSavedShippingAddress[] {
    return normalizeMarketplaceDefaultAddressSelection(
      this.snapshot.addresses.filter(address => address.id !== deletedId),
      promotedDefaultId
    );
  }

  private patchVm(patch: Partial<UserAddressBookViewModel>): void {
    this._vm$.next({
      ...this.snapshot,
      ...patch
    });
  }
}
