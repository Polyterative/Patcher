import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { BehaviorSubject } from 'rxjs';
import { RouterTestingModule } from '@angular/router/testing';
import { UserManagementService } from 'src/app/features/backbone/login/user-management.service';
import { AppStateService } from 'src/app/shared-interproject/app-state.service';
import { AppShellLayoutService } from 'src/app/shared-interproject/app-shell-layout.service';
import { HeroContentCardModule } from './hero-content-card.module';
import { HeroContentCardComponent } from './hero-content-card.component';


describe('HeroContentCardComponent', () => {
  let fixture: ComponentFixture<HeroContentCardComponent>;
  let wideShell$: BehaviorSubject<boolean>;

  beforeEach(async () => {
    wideShell$ = new BehaviorSubject(false);

    await TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        RouterTestingModule,
        HeroContentCardModule
      ],
      providers: [
        {
          provide: AppShellLayoutService,
          useValue: {
            wideShell$
          }
        },
        {
          provide: AppStateService,
          useValue: {
            isDev: false
          }
        },
        {
          provide: UserManagementService,
          useValue: {
            loggedUser$: new BehaviorSubject(undefined),
            loggedUserFullProfile$: new BehaviorSubject(undefined)
          }
        }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(HeroContentCardComponent);
    fixture.componentInstance.titleBig = 'Modules';
    fixture.componentInstance.description = 'Browse the latest additions to the catalog.';
    fixture.componentInstance.showWideShellNav = true;
    fixture.detectChanges();
  });

  it('keeps the integrated metro nav hidden outside the wide shell', () => {
    expect(fixture.debugElement.query(By.css('.title-metro-nav'))).toBeNull();
  });

  it('renders the integrated metro nav inside the existing title area for wide shells', () => {
    wideShell$.next(true);
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.title-metro-nav-origin .title-metro-nav')).not.toBeNull();
    expect(host.querySelector('.title-inline-description')?.textContent).toContain('Browse the latest additions to the catalog.');
    expect(host.textContent).toContain('patcher.xyz');
    expect(host.textContent).toContain('Modules');
    expect(host.textContent).toContain('Racks');
    expect(host.textContent).toContain('Log in');
  });

  it('reveals a compact sticky nav after the integrated nav reaches the toolbar edge', () => {
    wideShell$.next(true);
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const navOrigin = host.querySelector('.title-metro-nav-origin') as HTMLElement;
    spyOn(navOrigin, 'getBoundingClientRect').and.returnValue(createDomRect({top: -12, bottom: 68, height: 80}));

    (fixture.componentInstance as any).syncCompactWideShellNav();
    fixture.detectChanges();

    const floatingNav = host.querySelector('.title-metro-nav--floating');
    expect(host.querySelector('.title-metro-sticky-shell--visible')).not.toBeNull();
    expect(floatingNav).not.toBeNull();
    expect(floatingNav?.textContent).not.toContain('patcher.xyz');
    expect(floatingNav?.textContent).toContain('Home');
    expect(floatingNav?.textContent).toContain('Log in');
  });

  it('stacks the inline description under the title block when titleSub is present', () => {
    wideShell$.next(true);
    fixture.componentInstance.titleSub = 'Polyterative';
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.title-heading-copy--stacked-description')).not.toBeNull();
  });

  function createDomRect(rect: Partial<DOMRect>): DOMRect {
    return {
      x: rect.left ?? 0,
      y: rect.top ?? 0,
      width: rect.width ?? 0,
      height: rect.height ?? 0,
      top: rect.top ?? 0,
      right: rect.right ?? 0,
      bottom: rect.bottom ?? 0,
      left: rect.left ?? 0,
      toJSON: () => ''
    } as DOMRect;
  }
});
