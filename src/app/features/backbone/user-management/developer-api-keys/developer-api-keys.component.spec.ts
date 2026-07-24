import {
  ComponentFixture,
  TestBed
} from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import {
  BehaviorSubject,
  Subject
} from 'rxjs';
import { DeveloperApiKeysComponent } from './developer-api-keys.component';
import {
  DeveloperApiKeysDataService,
  DeveloperApiKeysViewModel
} from './developer-api-keys-data.service';

const BASE_VM: DeveloperApiKeysViewModel = {
  docsUrl: 'https://docs.patcher.xyz/reference/public-open-api',
  errorMessage: null,
  hasLoaded: false,
  isLoading: false,
  isSaving: false,
  reveal: null,
  revokeConfirmId: null,
  rotateConfirmationVisible: false,
  slot: null
};

const LOADED_EMPTY_VM: DeveloperApiKeysViewModel = {
  ...BASE_VM,
  hasLoaded: true
};

const ACTIVE_VM: DeveloperApiKeysViewModel = {
  ...BASE_VM,
  hasLoaded: true,
  slot: {
    active: true,
    createdAt: '2026-07-01T00:00:00.000Z',
    id: 'key-1',
    keyPrefix: 'pk_live_1234',
    label: 'Server key',
    lastUsedAt: null,
    monthlyQuota: 5000,
    perMinuteQuota: 60,
    remainingThisMonth: 4500,
    revokedAt: null,
    rotatedAt: null,
    tierCode: 'free',
    usageMonth: '2026-07-01',
    usageUpdatedAt: '2026-07-24T12:00:00.000Z',
    usedThisMonth: 500
  }
};

const REVOKED_VM: DeveloperApiKeysViewModel = {
  ...ACTIVE_VM,
  slot: {
    ...ACTIVE_VM.slot!,
    active: false,
    revokedAt: '2026-07-24T10:00:00.000Z'
  }
};

type SubjectWithSpy<T> = Subject<T> & {
  next: jasmine.Spy<(value: T) => void>
};

type VoidSubjectWithSpy = Subject<void> & {
  next: jasmine.Spy<() => void>
};

class MockDeveloperApiKeysDataService {
  readonly vmSubject$ = new BehaviorSubject<DeveloperApiKeysViewModel>(BASE_VM);
  readonly vm$ = this.vmSubject$.asObservable();
  readonly load$ = this.voidSubject('load$');
  readonly createOrRotate$ = this.voidSubject('createOrRotate$');
  readonly requestRotateConfirmation$ = this.voidSubject('requestRotateConfirmation$');
  readonly cancelRotateConfirmation$ = this.voidSubject('cancelRotateConfirmation$');
  readonly requestRevokeConfirmation$ = this.subject<string>('requestRevokeConfirmation$');
  readonly cancelRevokeConfirmation$ = this.voidSubject('cancelRevokeConfirmation$');
  readonly revoke$ = this.subject<{ id: string }>('revoke$');
  readonly dismissReveal$ = this.voidSubject('dismissReveal$');
  readonly copyRevealedKey$ = this.voidSubject('copyRevealedKey$');

  setVm(vm: DeveloperApiKeysViewModel): void {
    this.vmSubject$.next(vm);
  }

  private subject<T>(_name: string): SubjectWithSpy<T> {
    const subject = new Subject<T>() as SubjectWithSpy<T>;
    spyOn(subject, 'next').and.callThrough();
    return subject;
  }

  private voidSubject(_name: string): VoidSubjectWithSpy {
    const subject = new Subject<void>() as VoidSubjectWithSpy;
    spyOn(subject, 'next').and.callThrough();
    return subject;
  }
}

function textContent(fixture: ComponentFixture<DeveloperApiKeysComponent>): string {
  return fixture.nativeElement.textContent.replace(/\s+/g, ' ').trim();
}

function submitComponent(
  fixture: ComponentFixture<DeveloperApiKeysComponent>,
  vm: DeveloperApiKeysViewModel
): void {
  fixture.componentInstance.createOrRotate(vm);
  fixture.detectChanges();
}

function buttonByText(fixture: ComponentFixture<DeveloperApiKeysComponent>, text: string): HTMLButtonElement {
  const buttons: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('button'));
  const button = buttons.find(candidate => candidate.textContent?.replace(/\s+/g, ' ').trim().includes(text));
  if (!button) {
    throw new Error(`Button not found: ${ text }`);
  }
  return button;
}

function setupComponent(initialVm = LOADED_EMPTY_VM, enabled = true) {
  const dataService = new MockDeveloperApiKeysDataService();
  dataService.setVm(initialVm);

  TestBed.configureTestingModule({
    imports: [
      DeveloperApiKeysComponent,
      NoopAnimationsModule
    ]
  });
  TestBed.overrideComponent(DeveloperApiKeysComponent, {
    set: {
      providers: [
        { provide: DeveloperApiKeysDataService, useValue: dataService }
      ]
    }
  });

  const fixture = TestBed.createComponent(DeveloperApiKeysComponent);
  fixture.componentInstance.developerApiEnabled = enabled;
  fixture.detectChanges();

  return {
    dataService,
    fixture
  };
}

describe('DeveloperApiKeysComponent', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('renders nothing when the developer API flag is disabled', () => {
    const { fixture } = setupComponent(BASE_VM, false);

    expect(fixture.nativeElement.querySelector('#developer-api-title')).toBeNull();
    expect(textContent(fixture)).toBe('');
  });

  it('renders the Public API docs link and empty create state', () => {
    const { dataService, fixture } = setupComponent();

    expect(dataService.load$.next).toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('#developer-api-title')?.textContent).toContain('Public API');
    expect(fixture.nativeElement.querySelector('a[href="https://docs.patcher.xyz/reference/public-open-api"]')).not.toBeNull();
    expect(textContent(fixture)).toContain('No API credential yet.');
  });

  it('renders no credential label form or audit dates', () => {
    const { fixture } = setupComponent(ACTIVE_VM);
    const text = textContent(fixture);

    expect(fixture.nativeElement.querySelector('input')).toBeNull();
    expect(fixture.nativeElement.querySelector('mat-form-field')).toBeNull();
    expect(text).not.toContain('Credential label');
    expect(text).not.toContain('Created');
    expect(text).not.toContain('Rotated');
    expect(text).not.toContain('Last used');
    expect(text).not.toContain('Usage updates within a few minutes.');
  });

  it('emits create without asking for a label', () => {
    const { dataService, fixture } = setupComponent();

    submitComponent(fixture, LOADED_EMPTY_VM);

    expect(dataService.createOrRotate$.next).toHaveBeenCalledOnceWith();
  });

  it('disables and ignores create while the initial slot state is unknown', () => {
    const { dataService, fixture } = setupComponent(BASE_VM);

    expect(buttonByText(fixture, 'Create API key').disabled).toBeTrue();

    submitComponent(fixture, BASE_VM);

    expect(dataService.createOrRotate$.next).not.toHaveBeenCalled();
    expect(textContent(fixture)).not.toContain('No API credential yet.');
  });

  it('requires inline confirmation before rotating an active key', () => {
    const { dataService, fixture } = setupComponent(ACTIVE_VM);

    submitComponent(fixture, ACTIVE_VM);

    expect(dataService.requestRotateConfirmation$.next).toHaveBeenCalled();
    expect(dataService.createOrRotate$.next).not.toHaveBeenCalled();

    dataService.setVm({
      ...ACTIVE_VM,
      rotateConfirmationVisible: true
    });
    fixture.detectChanges();

    expect(textContent(fixture)).toContain('Rotating replaces the current secret. Clients may keep working for up to 60 seconds.');
    submitComponent(fixture, {
      ...ACTIVE_VM,
      rotateConfirmationVisible: true
    });

    expect(dataService.createOrRotate$.next).toHaveBeenCalledOnceWith();
  });

  it('renders one-time reveal with alert semantics and copy/dismiss actions', () => {
    const { dataService, fixture } = setupComponent({
      ...ACTIVE_VM,
      reveal: {
        id: 'key-1',
        prefix: 'pk_live_1234',
        rawKey: 'patcher_raw_secret',
        tier: 'free'
      }
    });

    const reveal = fixture.nativeElement.querySelector('.developer-api__reveal');

    expect(reveal?.getAttribute('role')).toBe('alert');
    expect(textContent(fixture)).toContain('patcher_raw_secret');

    buttonByText(fixture, 'Copy API key').click();
    expect(dataService.copyRevealedKey$.next).toHaveBeenCalled();

    buttonByText(fixture, 'I copied it').click();
    expect(dataService.dismissReveal$.next).toHaveBeenCalled();
  });

  it('does not offer copying when only the stored prefix is available', () => {
    const { fixture } = setupComponent(ACTIVE_VM);
    const buttons: string[] = Array.from(fixture.nativeElement.querySelectorAll('button'))
      .map((button: HTMLButtonElement) => button.textContent?.replace(/\s+/g, ' ').trim() ?? '');
    const text = textContent(fixture);

    expect(text).toContain('Active credential');
    expect(text).toContain('pk_live_1234');
    expect(text).toContain('Free · 500 / 5,000 this month · 60/min');
    expect(text).toContain('Full key not shown. Rotate to get a new copyable key.');
    expect(buttons.some(label => label.includes('Copy API key'))).toBeFalse();
  });

  it('emits revoke request, confirm, and cancel actions', () => {
    const { dataService, fixture } = setupComponent({
      ...ACTIVE_VM,
      revokeConfirmId: 'key-1'
    });

    expect(textContent(fixture)).toContain('Revoking disables this credential. Edge caches may continue accepting it for up to 60 seconds.');

    buttonByText(fixture, 'Revoke').click();
    expect(dataService.requestRevokeConfirmation$.next).toHaveBeenCalledWith('key-1');

    buttonByText(fixture, 'Confirm revoke').click();
    expect(dataService.revoke$.next).toHaveBeenCalledOnceWith({ id: 'key-1' });

    buttonByText(fixture, 'Cancel').click();
    expect(dataService.cancelRevokeConfirmation$.next).toHaveBeenCalled();
  });

  it('renders revoked state without active-key actions', () => {
    const { fixture } = setupComponent(REVOKED_VM);
    const buttons: string[] = Array.from(fixture.nativeElement.querySelectorAll('button'))
      .map((button: HTMLButtonElement) => button.textContent?.replace(/\s+/g, ' ').trim() ?? '');

    expect(textContent(fixture)).toContain('Revoked credential');
    expect(textContent(fixture)).toContain('This credential is revoked.');
    expect(buttons.some(label => label.includes('Revoke'))).toBeFalse();
    expect(buttons.some(label => label.includes('Rotate API key'))).toBeFalse();
    expect(buttons.some(label => label.includes('Create API key'))).toBeTrue();
  });
});
