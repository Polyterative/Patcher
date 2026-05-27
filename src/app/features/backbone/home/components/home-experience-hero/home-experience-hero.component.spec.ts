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
  let isAdmin$: BehaviorSubject<boolean>;

  beforeEach(async () => {
    wideShell$ = new BehaviorSubject(false);
    isAdmin$ = new BehaviorSubject(false);

    await TestBed.configureTestingModule({
      imports: [HomeExperienceHeroComponent, RouterTestingModule],
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
            loggedUserFullProfile$: new BehaviorSubject(undefined),
            isAdmin$
          }
        }
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HomeExperienceHeroComponent);
    fixture.componentInstance.content = {
      eyebrow: 'Explore',
      title: 'Patch. Share. Discover.',
      subtitle: 'Make patches.\nBrowse racks.',
      mainVisual: {
        src: '/assets/screenshots/major-area-screenshots/04-patches.jpg',
        alt: 'Example hero visual',
        caption: 'Capture the patch and come back later.'
      },
      floatingVisualA: {
        src: '/assets/screenshots/major-area-screenshots/03-module-details.jpg',
        alt: 'Example floating visual A'
      },
      floatingVisualB: {
        src: '/assets/screenshots/major-area-screenshots/07-rack-details.jpg',
        alt: 'Example floating visual B'
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

  it('renders the admin target in the wide-shell account group for admin users', () => {
    isAdmin$.next(true);
    wideShell$.next(true);
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('Admin');
  });

  it('does not render the admin target in the wide-shell account group for guests or non-admin users', () => {
    wideShell$.next(true);
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.textContent).not.toContain('Admin');
  });

  it('siteTitle is patcher.xyz', () => {
    expect(fixture.componentInstance.siteTitle).toBe('patcher.xyz');
  });

  it('subtitleLines splits content subtitle on newlines', () => {
    expect(fixture.componentInstance.subtitleLines).toEqual([
      'Make patches.',
      'Browse racks.'
    ]);
  });

  it('displays the eyebrow text in the template', () => {
    const host = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('Explore');
  });

  it('wideShellTargets is a non-empty array', () => {
    expect(fixture.componentInstance.wideShellTargets.length).toBeGreaterThan(0);
  });

  it('renders the hero screenshots', () => {
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.visual-main img')?.getAttribute('src')).toContain('/assets/screenshots/major-area-screenshots/04-patches.jpg');
    expect(host.querySelector('.visual-float.visual-a img')?.getAttribute('src')).toContain('/assets/screenshots/major-area-screenshots/03-module-details.jpg');
    expect(host.querySelector('.visual-float.visual-b img')?.getAttribute('src')).toContain('/assets/screenshots/major-area-screenshots/07-rack-details.jpg');
  });
});
