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
    expect(host.querySelector('.title-metro-nav')).not.toBeNull();
    expect(host.textContent).toContain('patcher.xyz');
    expect(host.textContent).toContain('Modules');
    expect(host.textContent).toContain('Racks');
    expect(host.textContent).toContain('Log in');
  });
});
