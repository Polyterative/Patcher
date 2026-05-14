import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { BehaviorSubject } from 'rxjs';
import { UserManagementService } from 'src/app/features/backbone/login/user-management.service';
import { AppStateService } from 'src/app/shared-interproject/app-state.service';
import { ToolbarComponent } from './toolbar.component';
import { ToolbarModule } from './toolbar.module';
import { ToolbarService } from './toolbar.service';
import { getRouteClickableLinkKey } from 'src/app/shared-interproject/components/@smart/route-clickable-link/route-clickable-link.component';


function layoutState(overrides: Partial<{
  xs: boolean;
  sm: boolean;
  md: boolean;
  lg: boolean;
  xl: boolean;
  ltsm: boolean;
  ltmd: boolean;
  ltlg: boolean;
  ltxl: boolean;
  gtxs: boolean;
  gtsm: boolean;
  gtmd: boolean;
  gtlg: boolean;
}> = {}) {
  return {
    xs: false,
    sm: false,
    md: false,
    lg: false,
    xl: false,
    ltsm: false,
    ltmd: false,
    ltlg: false,
    ltxl: false,
    gtxs: false,
    gtsm: false,
    gtmd: false,
    gtlg: false,
    ...overrides
  };
}

describe('ToolbarComponent', () => {
  let fixture: ComponentFixture<ToolbarComponent>;
  let loggedUser$: BehaviorSubject<{id: string; email: string} | undefined>;
  let loggedUserFullProfile$: BehaviorSubject<{username: string} | undefined>;
  let isAdmin$: BehaviorSubject<boolean>;

  beforeEach(async () => {
    const layoutFlexWidth$ = new BehaviorSubject(layoutState({gtxs: true, gtsm: true, gtmd: true}));
    loggedUser$ = new BehaviorSubject<{id: string; email: string} | undefined>(undefined);
    loggedUserFullProfile$ = new BehaviorSubject<{username: string} | undefined>(undefined);
    isAdmin$ = new BehaviorSubject(false);

    await TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        RouterTestingModule,
        ToolbarModule
      ],
      providers: [
        ToolbarService,
        {
          provide: AppStateService,
          useValue: {
            isDev: false,
            layoutFlexWidth$
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

    fixture = TestBed.createComponent(ToolbarComponent);
    fixture.detectChanges();
  });

  it('keeps the horizontal top toolbar outside the large-screen breakpoint', () => {
    expect(fixture.nativeElement.querySelector('mat-toolbar.toolbar--top.sticky')).not.toBeNull();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Modules');
  });

  it('keeps the shared top-toolbar navigation readable for large-screen shells too', () => {
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('mat-toolbar.toolbar--top.sticky')).not.toBeNull();
    expect(host.querySelector('.toolbar--side')).toBeNull();
    expect(host.textContent).toContain('Modules');
    expect(host.textContent).toContain('Racks');
  });

  it('starts with isLoggedIn$ = false when no user is present', () => {
    expect(fixture.componentInstance.isLoggedIn$.value).toBeFalse();
  });

  it('sets isLoggedIn$ to true when a user logs in', () => {
    loggedUser$.next({id: 'u-1', email: 'test@example.com'});
    fixture.detectChanges();
    expect(fixture.componentInstance.isLoggedIn$.value).toBeTrue();
  });

  it('resets isLoggedIn$ to false when user logs out', () => {
    loggedUser$.next({id: 'u-1', email: 'test@example.com'});
    fixture.detectChanges();
    loggedUser$.next(undefined);
    fixture.detectChanges();
    expect(fixture.componentInstance.isLoggedIn$.value).toBeFalse();
  });

  it('trackByLink returns the link key', () => {
    const link = {label: 'Modules', route: '/modules', icon: undefined};
    const key = fixture.componentInstance.trackByLink(0, link as any);
    expect(typeof key).toBe('string');
    expect(key.length).toBeGreaterThan(0);
  });

  it('updates mobileSections$ with username from profile when user logs in', () => {
    loggedUser$.next({id: 'u-1', email: 'a@b.com'});
    loggedUserFullProfile$.next({username: 'patchmaker'});
    fixture.detectChanges();

    const sections = fixture.componentInstance.mobileSections$.value;
    const allLabels = sections.map(s => s.links.map((l: any) => l.label)).flat();
    expect(allLabels.some((l: string) => l.toLowerCase().includes('patch') || l.toLowerCase().includes('account'))).toBeTrue();
  });
});
