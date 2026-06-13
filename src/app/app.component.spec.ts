import {
  Component,
  NO_ERRORS_SCHEMA
} from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import {
  BehaviorSubject,
  Subject
} from 'rxjs';
import {
  NavigationEnd,
  Router
} from '@angular/router';
import { AppComponent } from './app.component';
import { ModuleDetailDataService } from './components/module-parts/module-detail-data.service';
import { PatchDetailDataService } from './components/patch-parts/patch-detail-data.service';
import { RackDetailDataService } from './components/rack-parts/rack-detail-data.service';
import { AppShellLayoutService } from './shared-interproject/app-shell-layout.service';
import { AppViewportService } from './shared-interproject/app-viewport.service';


@Component({
  selector: 'app-mobile-shell-toolbar',
  template: '',
  standalone: true
})
class MobileShellToolbarStubComponent {
}

describe('AppComponent', () => {
  let fixture: ComponentFixture<AppComponent>;
  let wideShell$: BehaviorSubject<boolean>;
  let routerEvents$: Subject<unknown>;
  let routerMock: { events: Subject<unknown>; url: string };

  beforeEach(async () => {
    wideShell$ = new BehaviorSubject(false);
    routerEvents$ = new Subject<unknown>();
    routerMock = {
      events: routerEvents$,
      url: '/home'
    };
    spyOn(window, 'matchMedia').and.returnValue({
      matches: false,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false
    });

    await TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        AppComponent,
      ],
      providers: [
        {
          provide: Router,
          useValue: routerMock
        },
        {
          provide: AppViewportService,
          useValue: {
            initialize: jasmine.createSpy('initialize')
          }
        },
        {
          provide: AppShellLayoutService,
          useValue: {
            wideShell$
          }
        }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    })
    .overrideComponent(AppComponent, {
      set: {
        imports: [MobileShellToolbarStubComponent, AsyncPipe],
        schemas: [NO_ERRORS_SCHEMA],
        // Replace the heavy data-service providers with empty stubs — this
        // spec exercises shell-layout behaviour, not the floating selection
        // panel. The real services are exercised by their own specs and
        // verified at runtime by the regression guard below.
        providers: [
          {provide: PatchDetailDataService, useValue: {}},
          {provide: RackDetailDataService, useValue: {}},
          {provide: ModuleDetailDataService, useValue: {}}
        ]
      }
    })
    .compileComponents();

    fixture = TestBed.createComponent(AppComponent);
  });

  it('keeps the blue Material toolbar for mobile shells', () => {
    fixture.detectChanges();

    const shell = fixture.debugElement.query(By.css('.app-shell')).nativeElement as HTMLElement;
    expect(shell.classList.contains('app-shell--wide')).toBeFalse();
    expect(fixture.debugElement.query(By.directive(MobileShellToolbarStubComponent))).not.toBeNull();
  });

  it('applies the shared wide-shell class and removes the blue Material toolbar on non-mobile shells', () => {
    fixture.detectChanges();

    const shell = fixture.debugElement.query(By.css('.app-shell')).nativeElement as HTMLElement;

    wideShell$.next(true);
    fixture.detectChanges();

    expect(shell.classList.contains('app-shell--wide')).toBeTrue();
    expect(fixture.debugElement.query(By.directive(MobileShellToolbarStubComponent))).toBeNull();
  });

  it('renders the wide-shell toolbar at the app shell level on embedded routes', () => {
    wideShell$.next(true);
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.app-shell__wide-toolbar app-wide-shell-toolbar')).not.toBeNull();
    expect(host.querySelector('.app-shell__wide-toolbar')?.closest('lib-hero-content-card')).toBeNull();
  });

  it('applies route area classes to the app shell', () => {
    routerMock.url = '/modules/browser';
    wideShell$.next(true);
    fixture.detectChanges();

    const shell = fixture.debugElement.query(By.css('.app-shell')).nativeElement as HTMLElement;
    expect(shell.classList.contains('app-shell--area-modules')).toBeTrue();

    routerMock.url = '/racks';
    routerEvents$.next(new NavigationEnd(1, '/modules/browser', '/racks'));
    fixture.detectChanges();

    expect(shell.classList.contains('app-shell--area-racks')).toBeTrue();
    expect(shell.classList.contains('app-shell--area-modules')).toBeFalse();
  });

  it('uses section colors for nested user-area routes', () => {
    routerMock.url = '/user/area/patches';
    wideShell$.next(true);
    fixture.detectChanges();

    const shell = fixture.debugElement.query(By.css('.app-shell')).nativeElement as HTMLElement;
    expect(shell.classList.contains('app-shell--area-patches')).toBeTrue();
    expect(shell.classList.contains('app-shell--area-user')).toBeFalse();
  });

  it('keeps the legacy toolbar when the current route does not provide an embedded shell', () => {
    routerMock.url = '/not-embedded';
    wideShell$.next(true);
    fixture.detectChanges();

    const shell = fixture.debugElement.query(By.css('.app-shell')).nativeElement as HTMLElement;
    expect(shell.classList.contains('app-shell--wide')).toBeFalse();
    expect(fixture.debugElement.query(By.directive(MobileShellToolbarStubComponent))).not.toBeNull();
  });

  it('uses the embedded shell on rack detail routes when wide-shell layout is active', () => {
    routerMock.url = '/racks/details/1114';
    wideShell$.next(true);
    fixture.detectChanges();

    const shell = fixture.debugElement.query(By.css('.app-shell')).nativeElement as HTMLElement;
    expect(shell.classList.contains('app-shell--wide')).toBeTrue();
    expect(fixture.debugElement.query(By.directive(MobileShellToolbarStubComponent))).toBeNull();
  });

  it('uses the embedded shell on auth routes when wide-shell layout is active', () => {
    routerMock.url = '/auth/login';
    wideShell$.next(true);
    fixture.detectChanges();

    const shell = fixture.debugElement.query(By.css('.app-shell')).nativeElement as HTMLElement;
    expect(shell.classList.contains('app-shell--wide')).toBeTrue();
  });

  it('uses the embedded shell on admin routes when wide-shell layout is active', () => {
    routerMock.url = '/admin/flags';
    wideShell$.next(true);
    fixture.detectChanges();

    const shell = fixture.debugElement.query(By.css('.app-shell')).nativeElement as HTMLElement;
    expect(shell.classList.contains('app-shell--wide')).toBeTrue();
  });

  it('uses the embedded shell on /user/area when wide-shell is active', () => {
    routerMock.url = '/user/area';
    wideShell$.next(true);
    fixture.detectChanges();

    const shell = fixture.debugElement.query(By.css('.app-shell')).nativeElement as HTMLElement;
    expect(shell.classList.contains('app-shell--wide')).toBeTrue();
  });
});


/**
 * Regression guard for the "CV connection panel body is empty" bug.
 *
 * The floating <app-selection-panel-outlet> lives inside AppComponent.
 * Its inner render chain (patch-connection-minimal → module-minimal →
 * module-cvitem) injects PatchDetailDataService, RackDetailDataService,
 * and ModuleDetailDataService. When PatchModule/RackModule became lazy
 * those services stopped being reachable from app-root scope and the
 * panel silently rendered just its header. The fix declares them as
 * AppComponent-level providers. This test locks that in so a future
 * refactor doesn't quietly delete them.
 */
describe('AppComponent — selection panel provider wiring', () => {
  it('eagerly instantiates PatchDetailDataService at construction time', async () => {
    // The bridge.selectionState$ push in PatchDetailDataService's constructor
    // emits EMPTY on initial subscription. If the AppComponent-scoped instance
    // is created LAZILY (e.g. on first panel render after the user has already
    // clicked) it overwrites the user's live selection. Eager construction
    // forces that EMPTY push to happen at boot, before any patch interaction.
    let constructed = 0;
    class PatchDataStub {
      constructor() { constructed++; }
    }

    spyOn(window, 'matchMedia').and.returnValue({
      matches: false, media: '', onchange: null,
      addListener: () => undefined, removeListener: () => undefined,
      addEventListener: () => undefined, removeEventListener: () => undefined,
      dispatchEvent: () => false
    });

    await TestBed.configureTestingModule({
      imports: [NoopAnimationsModule, AppComponent],
      providers: [
        {provide: Router, useValue: {events: new Subject(), url: '/'}},
        {provide: AppViewportService, useValue: {initialize: () => undefined}},
        {provide: AppShellLayoutService, useValue: {wideShell$: new BehaviorSubject(false)}}
      ],
      schemas: [NO_ERRORS_SCHEMA]
    })
    .overrideComponent(AppComponent, {
      set: {
        imports: [MobileShellToolbarStubComponent, AsyncPipe],
        schemas: [NO_ERRORS_SCHEMA],
        providers: [
          {provide: PatchDetailDataService, useClass: PatchDataStub},
          {provide: RackDetailDataService, useValue: {}},
          {provide: ModuleDetailDataService, useValue: {}}
        ]
      }
    })
    .compileComponents();

    expect(constructed).withContext('PatchDetailDataService must not be constructed before AppComponent').toBe(0);
    TestBed.createComponent(AppComponent);
    expect(constructed)
      .withContext('AppComponent constructor must eagerly inject PatchDetailDataService')
      .toBe(1);
  });
});
