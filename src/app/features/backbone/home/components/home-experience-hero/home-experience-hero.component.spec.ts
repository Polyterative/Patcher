import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { BehaviorSubject } from 'rxjs';
import { UserManagementService } from 'src/app/features/backbone/login/user-management.service';
import { AppShellLayoutService } from 'src/app/shared-interproject/app-shell-layout.service';
import { AppStateService } from 'src/app/shared-interproject/app-state.service';
import { HomeExperienceHeroComponent } from './home-experience-hero.component';


describe('HomeExperienceHeroComponent', () => {
  let fixture: ComponentFixture<HomeExperienceHeroComponent>;
  let wideShell$: BehaviorSubject<boolean>;

  beforeEach(async () => {
    wideShell$ = new BehaviorSubject(false);

    await TestBed.configureTestingModule({
      declarations: [HomeExperienceHeroComponent],
      imports: [RouterTestingModule],
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

    fixture = TestBed.createComponent(HomeExperienceHeroComponent);
    fixture.componentInstance.content = {
      eyebrow: 'Explore',
      title: 'Patch. Share. Discover.',
      subtitle: 'Make patches.\nBrowse racks.',
      mainVisual: {
        src: '',
        alt: ''
      }
    };
    fixture.detectChanges();
  });

  it('keeps the integrated metro nav hidden outside the wide shell', () => {
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.hero-metro-nav')).toBeNull();
  });

  it('renders the integrated metro nav inside the home hero for wide shells', () => {
    wideShell$.next(true);
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.hero-metro-nav')).not.toBeNull();
    expect(host.textContent).toContain('patcher.xyz');
    expect(host.textContent).toContain('Modules');
    expect(host.textContent).toContain('Racks');
    expect(host.textContent).toContain('Log in');
  });
});
