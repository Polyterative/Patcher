import {
  TestBed,
  fakeAsync,
  tick
} from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  Observable,
  of,
  throwError
} from 'rxjs';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import {
  DeveloperApiKeyCreateResult,
  DeveloperApiKeySlot,
  DeveloperApiKeyUsage
} from 'src/app/features/backend/supabase-api-keys';
import {
  DEFAULT_API_KEY_LABEL,
  DeveloperApiKeysDataService,
  DeveloperApiKeysViewModel
} from './developer-api-keys-data.service';

const ACTIVE_SLOT: DeveloperApiKeySlot = {
  createdAt: '2026-07-01T00:00:00.000Z',
  id: 'key-1',
  keyPrefix: 'pk_live_1234',
  label: 'Server key',
  lastUsedAt: null,
  monthlyQuotaOverride: null,
  perMinuteQuotaOverride: null,
  revokedAt: null,
  rotatedAt: null,
  tierCode: 'free'
};

const PARTNER_SLOT: DeveloperApiKeySlot = {
  ...ACTIVE_SLOT,
  id: 'key-2',
  keyPrefix: 'pk_partner_1234',
  monthlyQuotaOverride: 750_000,
  perMinuteQuotaOverride: 900,
  tierCode: 'partner'
};

const REVOKED_SLOT: DeveloperApiKeySlot = {
  ...ACTIVE_SLOT,
  revokedAt: '2026-07-24T10:00:00.000Z'
};

const USAGE: DeveloperApiKeyUsage = {
  keyId: 'key-1',
  month: '2026-07-01',
  updatedAt: '2026-07-24T12:00:00.000Z',
  used: 1250
};

const CREATED_KEY: DeveloperApiKeyCreateResult = {
  id: 'key-1',
  prefix: 'pk_live_1234',
  rawKey: 'patcher_raw_secret',
  tier: 'free'
};

interface ApiKeysBackendMock {
  getOwnKeySlot: jasmine.Spy<() => Observable<DeveloperApiKeySlot | null>>;
  getOwnUsage: jasmine.Spy<(keyId: string) => Observable<DeveloperApiKeyUsage | null>>;
  createOrRotateOwnKey: jasmine.Spy<(label: string) => Observable<DeveloperApiKeyCreateResult>>;
  revokeOwnKey: jasmine.Spy<(id: string) => Observable<void>>;
}

interface SupabaseServiceMock {
  apiKeys: ApiKeysBackendMock;
}

interface SnackBarMock {
  open: jasmine.Spy<(message: string, action?: string, config?: object) => void>;
}

function createBackendMock(): SupabaseServiceMock {
  return {
    apiKeys: {
      createOrRotateOwnKey: jasmine.createSpy<(label: string) => Observable<DeveloperApiKeyCreateResult>>('createOrRotateOwnKey')
        .and.returnValue(of(CREATED_KEY)),
      getOwnKeySlot: jasmine.createSpy<() => Observable<DeveloperApiKeySlot | null>>('getOwnKeySlot')
        .and.returnValue(of(ACTIVE_SLOT)),
      getOwnUsage: jasmine.createSpy<(keyId: string) => Observable<DeveloperApiKeyUsage | null>>('getOwnUsage')
        .and.returnValue(of(USAGE)),
      revokeOwnKey: jasmine.createSpy<(id: string) => Observable<void>>('revokeOwnKey')
        .and.returnValue(of(void 0))
    }
  };
}

function createSnackBarMock(): SnackBarMock {
  return {
    open: jasmine.createSpy<(message: string, action?: string, config?: object) => void>('open')
  };
}

function setupService() {
  const backend = createBackendMock();
  const snackBar = createSnackBarMock();

  TestBed.configureTestingModule({
    providers: [
      DeveloperApiKeysDataService,
      { provide: SupabaseService, useValue: backend },
      { provide: MatSnackBar, useValue: snackBar }
    ]
  });

  const service = TestBed.inject(DeveloperApiKeysDataService);
  let latestVm: DeveloperApiKeysViewModel | null = null;
  const sub = service.vm$.subscribe(vm => latestVm = vm);

  return {
    backend,
    get vm(): DeveloperApiKeysViewModel {
      if (!latestVm) {
        throw new Error('Developer API keys VM did not emit.');
      }
      return latestVm;
    },
    service,
    snackBar,
    sub
  };
}

describe('DeveloperApiKeysDataService', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('loads the active slot and merges current-month usage', fakeAsync(() => {
    const setup = setupService();

    setup.service.load$.next();
    tick();

    expect(setup.backend.apiKeys.getOwnKeySlot).toHaveBeenCalled();
    expect(setup.backend.apiKeys.getOwnUsage).toHaveBeenCalledOnceWith('key-1');
    expect(setup.vm.hasLoaded).toBeTrue();
    expect(setup.vm.slot?.keyPrefix).toBe('pk_live_1234');
    expect(setup.vm.slot?.usedThisMonth).toBe(1250);
    expect(setup.vm.slot?.remainingThisMonth).toBe(3750);
    expect(setup.vm.slot?.perMinuteQuota).toBe(60);
    setup.sub.unsubscribe();
  }));

  it('uses persisted quota overrides before tier constants', fakeAsync(() => {
    const setup = setupService();
    setup.backend.apiKeys.getOwnKeySlot.and.returnValue(of(PARTNER_SLOT));
    setup.backend.apiKeys.getOwnUsage.and.returnValue(of({
      ...USAGE,
      keyId: 'key-2',
      used: 2500
    }));

    setup.service.load$.next();
    tick();

    expect(setup.vm.slot?.monthlyQuota).toBe(750_000);
    expect(setup.vm.slot?.perMinuteQuota).toBe(900);
    expect(setup.vm.slot?.remainingThisMonth).toBe(747_500);
    setup.sub.unsubscribe();
  }));

  it('loads an empty slot without requesting usage', fakeAsync(() => {
    const setup = setupService();
    setup.backend.apiKeys.getOwnKeySlot.and.returnValue(of(null));

    setup.service.load$.next();
    tick();

    expect(setup.backend.apiKeys.getOwnUsage).not.toHaveBeenCalled();
    expect(setup.vm.hasLoaded).toBeTrue();
    expect(setup.vm.slot).toBeNull();
    expect(setup.vm.errorMessage).toBeNull();
    setup.sub.unsubscribe();
  }));

  it('preserves stale rows when a refresh fails', fakeAsync(() => {
    const setup = setupService();
    spyOn(console, 'error');

    setup.service.load$.next();
    tick();
    expect(setup.vm.slot?.id).toBe('key-1');

    setup.backend.apiKeys.getOwnKeySlot.and.returnValue(throwError(() => ({
      code: '42501',
      message: 'denied'
    })));
    setup.service.load$.next();
    tick();

    expect(setup.vm.slot?.id).toBe('key-1');
    expect(setup.vm.hasLoaded).toBeTrue();
    expect(setup.vm.errorMessage).toBe('This account is not allowed to manage Public API credentials.');
    setup.sub.unsubscribe();
  }));

  it('does not create or rotate before the slot state has loaded successfully', fakeAsync(() => {
    const setup = setupService();

    setup.service.createOrRotate$.next();
    tick();

    expect(setup.backend.apiKeys.createOrRotateOwnKey).not.toHaveBeenCalled();
    expect(setup.vm.hasLoaded).toBeFalse();
    expect(setup.vm.errorMessage).toBe('Public API credential status must load before creating or rotating a key. Use Retry if loading failed.');

    setup.service.load$.next();
    tick();
    setup.service.requestRotateConfirmation$.next();
    setup.service.createOrRotate$.next();
    tick();

    expect(setup.backend.apiKeys.createOrRotateOwnKey).toHaveBeenCalledOnceWith(DEFAULT_API_KEY_LABEL);
    setup.sub.unsubscribe();
  }));

  it('creates a one-time reveal and discards it on dismiss', fakeAsync(() => {
    const setup = setupService();
    setup.backend.apiKeys.getOwnKeySlot.and.returnValue(of(ACTIVE_SLOT));

    setup.service.load$.next();
    tick();
    setup.service.requestRotateConfirmation$.next();
    setup.service.createOrRotate$.next();
    tick();

    expect(setup.backend.apiKeys.createOrRotateOwnKey).toHaveBeenCalledOnceWith(DEFAULT_API_KEY_LABEL);
    expect(setup.vm.reveal?.rawKey).toBe('patcher_raw_secret');
    expect(setup.vm.slot?.id).toBe('key-1');

    setup.service.dismissReveal$.next();
    tick();

    expect(setup.vm.reveal).toBeNull();
    setup.sub.unsubscribe();
  }));

  it('does not bypass rotate confirmation when an active slot is loaded', fakeAsync(() => {
    const setup = setupService();

    setup.service.load$.next();
    tick();
    setup.service.createOrRotate$.next();
    tick();

    expect(setup.vm.rotateConfirmationVisible).toBeTrue();
    expect(setup.backend.apiKeys.createOrRotateOwnKey).not.toHaveBeenCalled();

    setup.service.createOrRotate$.next();
    tick();

    expect(setup.backend.apiKeys.createOrRotateOwnKey).toHaveBeenCalledOnceWith(DEFAULT_API_KEY_LABEL);
    setup.sub.unsubscribe();
  }));

  it('keeps the raw reveal when create succeeds but the account refresh fails', fakeAsync(() => {
    const setup = setupService();
    spyOn(console, 'error');
    const partialMessage = 'API key was created and must be copied now, but account details could not refresh. Retry will keep this key visible.';
    setup.backend.apiKeys.getOwnKeySlot.and.returnValue(of(null));

    setup.service.load$.next();
    tick();
    expect(setup.vm.hasLoaded).toBeTrue();

    setup.backend.apiKeys.getOwnKeySlot.and.returnValue(throwError(() => new Error('refresh failed')));
    setup.service.createOrRotate$.next();
    tick();

    expect(setup.backend.apiKeys.createOrRotateOwnKey).toHaveBeenCalledOnceWith(DEFAULT_API_KEY_LABEL);
    expect(setup.vm.reveal?.rawKey).toBe('patcher_raw_secret');
    expect(setup.vm.errorMessage).toBe(partialMessage);
    expect(setup.snackBar.open).toHaveBeenCalledWith(partialMessage, undefined, jasmine.objectContaining({
      panelClass: 'snack-error'
    }));

    setup.service.load$.next();
    tick();

    expect(setup.vm.reveal?.rawKey).toBe('patcher_raw_secret');
    setup.sub.unsubscribe();
  }));

  it('tracks rotate confirmation separately from mutation', fakeAsync(() => {
    const setup = setupService();

    setup.service.requestRotateConfirmation$.next();
    tick();

    expect(setup.vm.rotateConfirmationVisible).toBeTrue();
    expect(setup.backend.apiKeys.createOrRotateOwnKey).not.toHaveBeenCalled();

    setup.service.cancelRotateConfirmation$.next();
    tick();

    expect(setup.vm.rotateConfirmationVisible).toBeFalse();
    setup.sub.unsubscribe();
  }));

  it('shows a revoked local state when revoke succeeds but the account refresh fails', fakeAsync(() => {
    const setup = setupService();
    spyOn(console, 'error');
    const partialMessage = 'API key was revoked, but account details could not refresh. Retry to verify the latest state.';

    setup.service.load$.next();
    tick();
    expect(setup.vm.slot?.active).toBeTrue();

    setup.backend.apiKeys.getOwnKeySlot.and.returnValue(throwError(() => new Error('refresh failed')));
    setup.service.requestRevokeConfirmation$.next('key-1');
    setup.service.revoke$.next({ id: 'key-1' });
    tick();

    expect(setup.backend.apiKeys.revokeOwnKey).toHaveBeenCalledOnceWith('key-1');
    expect(setup.vm.slot?.active).toBeFalse();
    expect(setup.vm.revokeConfirmId).toBeNull();
    expect(setup.vm.errorMessage).toBe(partialMessage);
    setup.sub.unsubscribe();
  }));

  it('revokes after confirmation and can cancel confirmation', fakeAsync(() => {
    const setup = setupService();
    setup.backend.apiKeys.getOwnKeySlot.and.returnValue(of(REVOKED_SLOT));

    setup.service.requestRevokeConfirmation$.next('key-1');
    tick();

    expect(setup.vm.revokeConfirmId).toBe('key-1');

    setup.service.cancelRevokeConfirmation$.next();
    tick();
    expect(setup.vm.revokeConfirmId).toBeNull();

    setup.service.requestRevokeConfirmation$.next('key-1');
    setup.service.revoke$.next({ id: 'key-1' });
    tick();

    expect(setup.backend.apiKeys.revokeOwnKey).toHaveBeenCalledOnceWith('key-1');
    expect(setup.vm.slot?.active).toBeFalse();
    expect(setup.vm.revokeConfirmId).toBeNull();
    setup.sub.unsubscribe();
  }));

  it('surfaces clipboard success and failure', fakeAsync(() => {
    const setup = setupService();
    spyOn(console, 'error');
    const writeText = spyOn(navigator.clipboard, 'writeText').and.returnValue(Promise.resolve());

    setup.service.load$.next();
    tick();
    setup.service.requestRotateConfirmation$.next();
    setup.service.createOrRotate$.next();
    tick();
    setup.service.copyRevealedKey$.next();
    tick();

    expect(writeText).toHaveBeenCalledOnceWith('patcher_raw_secret');
    expect(setup.snackBar.open).toHaveBeenCalledWith('API key copied.', undefined, jasmine.objectContaining({
      panelClass: 'snack-success'
    }));

    writeText.and.returnValue(Promise.reject(new Error('blocked')));
    setup.service.copyRevealedKey$.next();
    tick();

    expect(setup.snackBar.open).toHaveBeenCalledWith('blocked', undefined, jasmine.objectContaining({
      panelClass: 'snack-error'
    }));
    setup.sub.unsubscribe();
  }));
});
