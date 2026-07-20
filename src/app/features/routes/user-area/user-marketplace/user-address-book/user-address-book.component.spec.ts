import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import {
  NEVER,
  of
} from 'rxjs';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { MarketplaceSavedShippingAddress } from 'src/app/features/marketplace/marketplace-address-book.utils';
import { PublicProfileModule } from 'src/app/features/routes/public-profile/public-profile.module';
import { UserAreaModule } from 'src/app/features/routes/user-area/user-area.module';
import { UserAddressBookComponent } from './user-address-book.component';

interface NgModuleDefLike {
  declarations?: unknown[];
  imports?: unknown[];
}

function createAddress(overrides: Partial<MarketplaceSavedShippingAddress> = {}): MarketplaceSavedShippingAddress {
  return {
    city: 'Milan',
    countryCode: 'IT',
    createdAt: '2026-07-17T08:00:00.000Z',
    id: 'address-home',
    isDefault: true,
    label: 'Home',
    line1: 'Via Roma 1',
    line2: 'Floor 2',
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

function backendMock(
  addresses: MarketplaceSavedShippingAddress[] = [createAddress()],
  options: {deleteNever?: boolean; saveNever?: boolean} = {}
): SupabaseService {
  return {
    add: {
      shippingAddress: jasmine.createSpy('shippingAddress').and.returnValue(options.saveNever
        ? NEVER
        : of(createAddress({id: 'created'}))
      )
    },
    delete: {
      shippingAddress: jasmine.createSpy('shippingAddress').and.returnValue(options.deleteNever
        ? NEVER
        : of([{id: 'deleted'}])
      )
    },
    get: {
      currentUserShippingAddresses: jasmine.createSpy('currentUserShippingAddresses').and.returnValue(of(addresses))
    },
    update: {
      shippingAddress: jasmine.createSpy('shippingAddress').and.returnValue(of(createAddress({id: 'updated'})))
    }
  } as unknown as SupabaseService;
}

function moduleDef(moduleType: unknown): NgModuleDefLike {
  return (moduleType as {ɵmod: NgModuleDefLike}).ɵmod;
}

describe('UserAddressBookComponent', () => {
  let fixture: ComponentFixture<UserAddressBookComponent>;
  let backend: SupabaseService;

  function build(
    addresses: MarketplaceSavedShippingAddress[] = [createAddress()],
    options: {deleteNever?: boolean; saveNever?: boolean} = {}
  ): UserAddressBookComponent {
    backend = backendMock(addresses, options);
    TestBed.configureTestingModule({
      imports: [UserAddressBookComponent, NoopAnimationsModule],
      providers: [
        {provide: SupabaseService, useValue: backend},
        {provide: MatSnackBar, useValue: snackBarMock()}
      ]
    });

    fixture = TestBed.createComponent(UserAddressBookComponent);
    fixture.detectChanges();
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('renders collapsed private rows without street, postal, or recipient data', () => {
    build([createAddress()]);

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Home');
    expect(text).toContain('Milan, IT');
    expect(text).not.toContain('Via Roma');
    expect(text).not.toContain('20100');
    expect(text).not.toContain('Ada Lovelace');
  });

  it('accepts postal code as optional while keeping required field validation active', () => {
    const component = build([]);
    component.openCreate();
    component.form.setValue({
      city: 'London',
      countryCode: 'GB',
      isDefault: true,
      label: 'Studio',
      line1: '1 Compiler Way',
      line2: '',
      postalCode: '',
      recipientName: 'Grace Hopper',
      region: ''
    });

    component.save();

    expect(backend.add.shippingAddress).toHaveBeenCalledOnceWith(jasmine.objectContaining({
      countryCode: 'GB',
      label: 'Studio',
      postalCode: ''
    }));
  });

  it('keeps delete confirmation inline and privacy-safe', () => {
    const address = createAddress();
    const component = build([address]);

    component.requestDelete(address);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Delete “Home”?');
    expect(text).not.toContain('Via Roma');
    expect(text).not.toContain('20100');
  });

  it('disables row mutations while a save is pending', () => {
    const component = build([
      createAddress({id: 'home', isDefault: true, label: 'Home'}),
      createAddress({id: 'studio', isDefault: false, label: 'Studio'})
    ], {saveNever: true});

    component.dataService.save$.next({
      draft: {
        city: 'Milan',
        countryCode: 'IT',
        isDefault: false,
        label: 'New',
        line1: 'Via Roma 1',
        recipientName: 'Ada Lovelace'
      }
    });
    fixture.detectChanges();

    const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
    const rowMutationButtons = buttons.filter(button => ['Make default', 'Edit', 'Delete'].includes(button.textContent?.trim() ?? ''));
    expect(rowMutationButtons.length).toBeGreaterThan(0);
    expect(rowMutationButtons.every(button => button.disabled)).toBeTrue();
  });

  it('disables and guards saving while a delete is pending', () => {
    const home = createAddress({id: 'home', isDefault: true, label: 'Home'});
    const studio = createAddress({id: 'studio', isDefault: false, label: 'Studio'});
    const component = build([home, studio], {deleteNever: true});

    component.openEdit(home);
    component.dataService.delete$.next(studio);
    fixture.detectChanges();
    component.save();

    const saveButton = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'))
      .find(button => button.textContent?.includes('Save address'));
    expect(saveButton?.disabled).toBeTrue();
    expect(backend.update.shippingAddress).not.toHaveBeenCalled();
  });

  it('keeps the active editor open when an unrelated row save completes', () => {
    const home = createAddress({id: 'home', isDefault: true, label: 'Home'});
    const studio = createAddress({id: 'studio', isDefault: false, label: 'Studio'});
    const component = build([home, studio]);

    component.openEdit(home);
    component.makeDefault(studio);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('.address-editor')).not.toBeNull();
    expect(component.form.controls.label.value).toBe('Home');
  });

  it('disables row mutations while the inline editor is open', () => {
    const component = build([
      createAddress({id: 'home', isDefault: true, label: 'Home'}),
      createAddress({id: 'studio', isDefault: false, label: 'Studio'})
    ]);

    component.openEdit(createAddress({id: 'home', isDefault: true, label: 'Home'}));
    fixture.detectChanges();

    const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
    const rowMutationButtons = buttons.filter(button => ['Make default', 'Edit', 'Delete'].includes(button.textContent?.trim() ?? ''));
    expect(rowMutationButtons.length).toBeGreaterThan(0);
    expect(rowMutationButtons.every(button => button.disabled)).toBeTrue();
  });

  it('is wired only into the private user-area module, not public profile routes', () => {
    expect(moduleDef(UserAreaModule).imports).toContain(UserAddressBookComponent);
    expect(moduleDef(PublicProfileModule).imports).not.toContain(UserAddressBookComponent);
    expect(moduleDef(PublicProfileModule).declarations).not.toContain(UserAddressBookComponent);
  });
});
