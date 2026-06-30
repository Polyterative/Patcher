import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { UserManagementService } from 'src/app/features/backbone/login/user-management.service';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { SeoAndUtilsService } from 'src/app/features/backbone/seo-and-utils.service';
import { UrlCreatorService } from 'src/app/features/backend/url-creator.service';
import { UserAreaDataService } from 'src/app/features/routes/user-area/user-area-data.service';
import { UserAreaRootComponent } from '../user-area-root/user-area-root.component';
import { COOL_REACTIONS_ENABLED } from 'src/app/components/shared-atoms/cool-button/cool-button-feature.token';
import {
  createMockSeoAndUtilsService,
  createMockSupabaseService,
  createMockUserAreaDataService,
  createMockUserManagementService,
  createMockUrlCreatorService,
  MOCK_USER_PROFILE,
} from './test-setup';

describe('UserAreaRootComponent - Layout Shell', () => {
  let fixture: ComponentFixture<UserAreaRootComponent>;

  function build(coolReactionsEnabled = false) {
    const mockUserService = createMockUserManagementService();
    const mockDataService = createMockUserAreaDataService();
    const mockSeoService = createMockSeoAndUtilsService();
    const mockBackend = createMockSupabaseService();

    mockUserService._loggedUserFullProfile$.next(MOCK_USER_PROFILE);

    TestBed.configureTestingModule({
      declarations: [UserAreaRootComponent],
      imports: [CommonModule, NoopAnimationsModule],
      providers: [
        { provide: UserManagementService, useValue: mockUserService },
        { provide: UserAreaDataService, useValue: mockDataService },
        { provide: SeoAndUtilsService, useValue: mockSeoService },
        { provide: SupabaseService, useValue: mockBackend },
        { provide: UrlCreatorService, useValue: createMockUrlCreatorService() },
        { provide: COOL_REACTIONS_ENABLED, useValue: coolReactionsEnabled },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    });

    fixture = TestBed.createComponent(UserAreaRootComponent);
    const component = fixture.componentInstance;

    component.ignoreSeo = true;
    component.ngOnInit();
    fixture.detectChanges();
  }

  it('renders the owned-content workspace beside the sticky stats sidebar', () => {
    build();

    const host = fixture.nativeElement as HTMLElement;
    const sidebar = host.querySelector('.sidebar') as HTMLElement | null;
    expect(host.querySelector('.profile-layout')).not.toBeNull();
    expect(host.querySelector('.main-content')).not.toBeNull();
    expect(sidebar).not.toBeNull();
    expect(host.querySelectorAll('.block').length).toBe(5);
  });

  it('offsets the sticky sidebar below the app toolbar', () => {
    build();

    const host = fixture.nativeElement as HTMLElement;
    const sidebar = host.querySelector('.sidebar') as HTMLElement;
    const stickyTop = Number.parseFloat(getComputedStyle(sidebar).top);

    expect(stickyTop).toBeGreaterThan(16);
  });

  it('renders search inside the sidebar instead of as a floating shell', () => {
    build();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.user-area-utility-search')).not.toBeNull();
    expect(host.querySelector('.user-area-utility-search__header')).not.toBeNull();
    expect(host.querySelector('.user-area-floating-search')).toBeNull();
    expect(host.querySelectorAll('.utility-rail-group').length).toBe(1);
  });

  it('wires Cool collections into modules, racks, and patches when enabled', () => {
    build(true);

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelectorAll('app-user-cool-collection').length).toBe(3);
    expect(host.querySelector('app-user-modules app-user-cool-collection[modulecooltabcontent]')).not.toBeNull();
    expect(host.querySelector('app-user-racks app-user-cool-collection[rackcooltabcontent]')).not.toBeNull();
    expect(host.querySelector('app-user-patches app-user-cool-collection[patchcooltabcontent]')).not.toBeNull();
  });
});
