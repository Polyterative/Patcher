import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { BehaviorSubject } from 'rxjs';
import { UserManagementService } from 'src/app/features/backbone/login/user-management.service';
import { AppStateService } from 'src/app/shared-interproject/app-state.service';
import { WideShellToolbarComponent } from './wide-shell-toolbar.component';

describe('WideShellToolbarComponent', () => {
  let fixture: ComponentFixture<WideShellToolbarComponent>;
  let loggedUser$: BehaviorSubject<{id: string} | undefined>;
  let loggedUserFullProfile$: BehaviorSubject<{username: string} | undefined>;
  let isAdmin$: BehaviorSubject<boolean>;

  beforeEach(async () => {
    loggedUser$ = new BehaviorSubject<{id: string} | undefined>(undefined);
    loggedUserFullProfile$ = new BehaviorSubject<{username: string} | undefined>(undefined);
    isAdmin$ = new BehaviorSubject(false);

    await TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        RouterTestingModule,
        WideShellToolbarComponent
      ],
      providers: [
        {
          provide: AppStateService,
          useValue: {
            isDev: false
          }
        },
        {
          provide: UserManagementService,
          useValue: {
            loggedUser$,
            loggedUserFullProfile$,
            isAdmin$
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(WideShellToolbarComponent);
    fixture.detectChanges();
  });

  it('renders one desktop nav and a compact mobile disclosure trigger', () => {
    const host = fixture.nativeElement as HTMLElement;

    expect(host.querySelector('nav.title-metro-targets')).not.toBeNull();
    expect(host.querySelector('.title-metro-menu-trigger')).not.toBeNull();
    expect(host.querySelector('.title-metro-menu-trigger mat-icon')?.textContent?.trim()).toBe('menu');
    expect(host.querySelector('.title-metro-current')).toBeNull();
    expect(host.querySelector('#title-metro-mobile-panel')).not.toBeNull();
  });

  it('opens and closes the mobile disclosure panel', () => {
    const host = fixture.nativeElement as HTMLElement;
    const trigger = host.querySelector<HTMLButtonElement>('.title-metro-menu-trigger')!;

    trigger.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.mobileMenuOpen).toBeTrue();
    expect(host.querySelector('.title-metro-mobile-panel--open')).not.toBeNull();
    expect(host.querySelector('.title-metro-menu-trigger mat-icon')?.textContent?.trim()).toBe('close');

    trigger.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.mobileMenuOpen).toBeFalse();
  });

  it('builds mobile account sections from auth state', () => {
    loggedUser$.next({id: 'u-1'});
    loggedUserFullProfile$.next({username: 'patchmaker'});
    isAdmin$.next(true);
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('Your account');
    expect(host.textContent).toContain('patchmaker');
    expect(host.textContent).toContain('Admin');
  });

  it('does not render support links in the mobile disclosure', () => {
    const host = fixture.nativeElement as HTMLElement;

    expect(host.textContent).not.toContain('Support');
    expect(host.textContent).not.toContain('Patreon');
  });
});
