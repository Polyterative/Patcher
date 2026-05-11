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

  function build() {
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
      ],
      schemas: [NO_ERRORS_SCHEMA],
    });

    fixture = TestBed.createComponent(UserAreaRootComponent);
    const component = fixture.componentInstance;

    component.ignoreSeo = true;
    component.ngOnInit();
    fixture.detectChanges();
  }

  it('renders the owned-content workspace beside the bounded utility rail', () => {
    build();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.profile-layout')).not.toBeNull();
    expect(host.querySelector('.main-content')).not.toBeNull();
    expect(host.querySelector('.sidebar')).not.toBeNull();
    expect(host.querySelectorAll('.block').length).toBe(3);
  });

  it('renders search inside the utility rail instead of as a floating shell', () => {
    build();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.user-area-utility-search')).not.toBeNull();
    expect(host.querySelector('.user-area-utility-search__header')).not.toBeNull();
    expect(host.querySelector('.user-area-floating-search')).toBeNull();
    expect(host.querySelectorAll('.utility-rail-group').length).toBe(2);
  });
});
