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
  isLoading: false,
  isSaving: false,
  reveal: null,
  revokeConfirmId: null,
  rotateConfirmationVisible: false,
  slot: null
};

const ACTIVE_VM: DeveloperApiKeysViewModel = {
  ...BASE_VM,
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
  readonly createOrRotate$ = this.subject<{ label: string }>('createOrRotate$');
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

function setInputValue(fixture: ComponentFixture<DeveloperApiKeysComponent>, value: string): void {
  const input: HTMLInputElement | null = fixture.nativeElement.querySelector('input');
  if (!input) {
    throw new Error('Credential label input was not rendered.');
  }
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  fixture.detectChanges();
}

function submitComponent(
  fixture: ComponentFixture<DeveloperApiKeysComponent>,
  vm: DeveloperApiKeysViewModel
): void {
  fixture.componentInstance.submitCreateOrRotate(vm);
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

function setupComponent(initialVm = BASE_VM, enabled = true) {
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

  it('emits create with a valid label', () => {
    const { dataService, fixture } = setupComponent();

    setInputValue(fixture, 'Server key');
    submitComponent(fixture, BASE_VM);

    expect(dataService.createOrRotate$.next).toHaveBeenCalledOnceWith({ label: 'Server key' });
  });

  it('requires inline confirmation before rotating an active key', () => {
    const { dataService, fixture } = setupComponent(ACTIVE_VM);

    setInputValue(fixture, 'Server key');
    submitComponent(fixture, ACTIVE_VM);

    expect(dataService.requestRotateConfirmation$.next).toHaveBeenCalled();
    expect(dataService.createOrRotate$.next).not.toHaveBeenCalled();

    dataService.setVm({
      ...ACTIVE_VM,
      rotateConfirmationVisible: true
    });
    fixture.detectChanges();

    expect(textContent(fixture)).toContain('Rotating replaces the current secret. Clients using it may continue for up to 60 seconds, then stop.');
    submitComponent(fixture, {
      ...ACTIVE_VM,
      rotateConfirmationVisible: true
    });

    expect(dataService.createOrRotate$.next).toHaveBeenCalledOnceWith({ label: 'Server key' });
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

    buttonByText(fixture, 'Copy key').click();
    expect(dataService.copyRevealedKey$.next).toHaveBeenCalled();

    buttonByText(fixture, 'I copied it').click();
    expect(dataService.dismissReveal$.next).toHaveBeenCalled();
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
});
