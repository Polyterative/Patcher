import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { MarketplaceSavedShippingAddress } from 'src/app/features/marketplace/marketplace-address-book.utils';
import { UserAddressBookDataService } from './user-address-book-data.service';

function createAddress(overrides: Partial<MarketplaceSavedShippingAddress> = {}): MarketplaceSavedShippingAddress {
  return {
    city: 'Milan',
    countryCode: 'IT',
    createdAt: '2026-07-17T08:00:00.000Z',
    id: 'address-home',
    isDefault: false,
    label: 'Home',
    line1: 'Via Roma 1',
    line2: null,
    postalCode: '20100',
    profileid: 'profile-1',
    recipientName: 'Ada Lovelace',
    region: 'Lombardy',
    updatedAt: '2026-07-17T08:00:00.000Z',
    ...overrides
  };
}

function snackBarMock(): MatSnackBar {
  return {
    open: jasmine.createSpy('open')
  } as unknown as MatSnackBar;
}

function backendMock(options: {
  addResult?: MarketplaceSavedShippingAddress;
  deleteFails?: boolean;
  loadFails?: boolean;
  loadResults?: MarketplaceSavedShippingAddress[][];
  reloadFailsAfterSave?: boolean;
  updateResult?: MarketplaceSavedShippingAddress;
} = {}): SupabaseService {
  const getSpy = jasmine.createSpy('currentUserShippingAddresses');
  const loadResults = options.loadResults ?? [[]];

  if (options.loadFails) {
    getSpy.and.returnValue(throwError(() => new Error('load failed')));
  } else if (options.reloadFailsAfterSave) {
    getSpy.and.returnValues(
      ...loadResults.map(result => of(result)),
      throwError(() => new Error('reload failed'))
    );
    getSpy.and.returnValue(throwError(() => new Error('reload failed')));
  } else {
    getSpy.and.returnValues(...loadResults.map(result => of(result)));
    getSpy.and.returnValue(of(loadResults[loadResults.length - 1] ?? []));
  }

  return {
    add: {
      shippingAddress: jasmine.createSpy('shippingAddress').and.returnValue(of(options.addResult ?? createAddress()))
    },
    delete: {
      shippingAddress: jasmine.createSpy('shippingAddress').and.returnValue(options.deleteFails
        ? throwError(() => new Error('delete failed'))
        : of([{id: 'deleted'}])
      )
    },
    get: {
      currentUserShippingAddresses: getSpy
    },
    update: {
      shippingAddress: jasmine.createSpy('shippingAddress').and.returnValue(of(options.updateResult ?? createAddress()))
    }
  } as unknown as SupabaseService;
}

describe('UserAddressBookDataService', () => {
  it('loads private addresses without falling back to empty data on read errors', () => {
    const snackBar = snackBarMock();
    const service = new UserAddressBookDataService(backendMock({loadFails: true}), snackBar);

    service.load$.next();

    expect(service.snapshot.listError).toBe('Shipping addresses could not be loaded.');
    expect(service.snapshot.addresses).toEqual([]);
    expect(snackBar.open).toHaveBeenCalledWith(
      'Shipping addresses could not be loaded.',
      undefined,
      jasmine.objectContaining({panelClass: 'snack-error'})
    );
    service.ngOnDestroy();
  });

  it('creates an address, reloads from the private endpoint, and emits success', () => {
    const saved = createAddress({id: 'address-new', isDefault: true, label: 'Studio'});
    const backend = backendMock({
      addResult: saved,
      loadResults: [[saved]]
    });
    const snackBar = snackBarMock();
    const service = new UserAddressBookDataService(backend, snackBar);
    const saveSucceeded = jasmine.createSpy('saveSucceeded');
    service.saveSucceeded$.subscribe(saveSucceeded);

    service.save$.next({
      draft: {
        city: 'Milan',
        countryCode: 'IT',
        isDefault: true,
        label: 'Studio',
        line1: 'Via Roma 1',
        recipientName: 'Ada Lovelace'
      }
    });

    expect(backend.add.shippingAddress).toHaveBeenCalledOnceWith(jasmine.objectContaining({label: 'Studio'}));
    expect(backend.get.currentUserShippingAddresses).toHaveBeenCalled();
    expect(service.snapshot.addresses).toEqual([saved]);
    expect(saveSucceeded).toHaveBeenCalledOnceWith(saved);
    expect(snackBar.open).toHaveBeenCalledWith('Saved.', undefined, jasmine.objectContaining({panelClass: 'snack-success'}));
    service.ngOnDestroy();
  });

  it('closes the save flow after a persisted write even when refresh fails', () => {
    const saved = createAddress({id: 'address-new', isDefault: true, label: 'Studio'});
    const backend = backendMock({
      addResult: saved,
      loadResults: [[]],
      reloadFailsAfterSave: true
    });
    const snackBar = snackBarMock();
    const service = new UserAddressBookDataService(backend, snackBar);
    const saveSucceeded = jasmine.createSpy('saveSucceeded');
    service.load$.next();
    service.saveSucceeded$.subscribe(saveSucceeded);

    service.save$.next({
      draft: {
        city: 'Milan',
        countryCode: 'IT',
        isDefault: true,
        label: 'Studio',
        line1: 'Via Roma 1',
        recipientName: 'Ada Lovelace'
      }
    });

    expect(service.snapshot.addresses).toEqual([saved]);
    expect(service.snapshot.mutationError).toBe('Shipping addresses changed, but the list could not be refreshed.');
    expect(saveSucceeded).toHaveBeenCalledOnceWith(saved);
    expect(snackBar.open).toHaveBeenCalledWith('Saved.', undefined, jasmine.objectContaining({panelClass: 'snack-success'}));
    service.ngOnDestroy();
  });

  it('switches the default address through the update endpoint and normalizes the local list', () => {
    const home = createAddress({id: 'home', isDefault: true, label: 'Home'});
    const studio = createAddress({id: 'studio', isDefault: false, label: 'Studio'});
    const backend = backendMock({
      loadResults: [[home, studio]],
      updateResult: {...studio, isDefault: true}
    });
    const service = new UserAddressBookDataService(backend, snackBarMock());

    service.setDefault$.next(studio);

    expect(backend.update.shippingAddress).toHaveBeenCalledOnceWith('studio', jasmine.objectContaining({isDefault: true}));
    expect(service.snapshot.addresses.map(address => ({id: address.id, isDefault: address.isDefault}))).toEqual([
      {id: 'home', isDefault: false},
      {id: 'studio', isDefault: true}
    ]);
    service.ngOnDestroy();
  });

  it('keeps the existing default when an edit attempts to unset it', () => {
    const home = createAddress({id: 'home', isDefault: true, label: 'Home'});
    const backend = backendMock({
      loadResults: [[home]],
      updateResult: home
    });
    const service = new UserAddressBookDataService(backend, snackBarMock());
    service.load$.next();

    service.save$.next({
      id: home.id,
      draft: {...home, isDefault: false}
    });

    expect(backend.update.shippingAddress).toHaveBeenCalledOnceWith('home', jasmine.objectContaining({isDefault: true}));
    service.ngOnDestroy();
  });

  it('promotes another address before deleting the current default', () => {
    const home = createAddress({id: 'home', isDefault: true, label: 'Home'});
    const studio = createAddress({id: 'studio', isDefault: false, label: 'Studio'});
    const promotedStudio = {...studio, isDefault: true};
    const backend = backendMock({
      loadResults: [[home, studio], [promotedStudio]],
      updateResult: promotedStudio
    });
    const service = new UserAddressBookDataService(backend, snackBarMock());
    service.load$.next();

    service.delete$.next(home);

    expect(backend.update.shippingAddress).toHaveBeenCalledOnceWith('studio', jasmine.objectContaining({isDefault: true}));
    expect(backend.delete.shippingAddress).toHaveBeenCalledOnceWith('home');
    expect(service.snapshot.addresses).toEqual([promotedStudio]);
    service.ngOnDestroy();
  });

  it('refreshes after a default promotion when the following delete fails', () => {
    const home = createAddress({id: 'home', isDefault: true, label: 'Home'});
    const studio = createAddress({id: 'studio', isDefault: false, label: 'Studio'});
    const promotedStudio = {...studio, isDefault: true};
    const snackBar = snackBarMock();
    const backend = backendMock({
      deleteFails: true,
      loadResults: [[home, studio], [{...home, isDefault: false}, promotedStudio]],
      updateResult: promotedStudio
    });
    const service = new UserAddressBookDataService(backend, snackBar);
    service.load$.next();

    service.delete$.next(home);

    expect(backend.update.shippingAddress).toHaveBeenCalledOnceWith('studio', jasmine.objectContaining({isDefault: true}));
    expect(backend.delete.shippingAddress).toHaveBeenCalledOnceWith('home');
    expect(service.snapshot.addresses.map(address => ({id: address.id, isDefault: address.isDefault}))).toEqual([
      {id: 'home', isDefault: false},
      {id: 'studio', isDefault: true}
    ]);
    expect(service.snapshot.mutationError).toBe('Shipping address could not be deleted.');
    service.ngOnDestroy();
  });

  it('keeps the visible list and reports errors when delete fails', () => {
    const home = createAddress({id: 'home', isDefault: true});
    const snackBar = snackBarMock();
    const service = new UserAddressBookDataService(backendMock({
      deleteFails: true,
      loadResults: [[home]]
    }), snackBar);

    service.load$.next();
    service.delete$.next(home);

    expect(service.snapshot.addresses).toEqual([home]);
    expect(service.snapshot.mutationError).toBe('Shipping address could not be deleted.');
    expect(service.snapshot.deletingId).toBeNull();
    expect(snackBar.open).toHaveBeenCalledWith(
      'Shipping address could not be deleted.',
      undefined,
      jasmine.objectContaining({panelClass: 'snack-error'})
    );
    service.ngOnDestroy();
  });
});
