import { Component } from '@angular/core';
import {
  ComponentFixture,
  TestBed
} from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TimeagoModule } from 'ngx-timeago';
import { provideRouter } from '@angular/router';
import { UserManagementComponent } from './user-management.component';
import { DeveloperApiKeysComponent } from './developer-api-keys/developer-api-keys.component';
import { UserManagementService } from '../login/user-management.service';
import { SeoAndUtilsService } from '../seo-and-utils.service';
import {
  MOCK_RICH_USER,
  MOCK_SIMPLE_USER,
  createMockSeoAndUtilsService,
  createMockUserManagementService
} from './__tests__/test-setup';

@Component({
  selector: 'app-developer-api-keys',
  standalone: true,
  template: '<section class="public-api-stub">Public API stub</section>'
})
class StubDeveloperApiKeysComponent {}

function renderUserManagement(developerApiEnabled: boolean): ComponentFixture<UserManagementComponent> {
  const userManagementService = createMockUserManagementService();
  userManagementService._loggedUser$.next(MOCK_SIMPLE_USER);
  userManagementService._loggedUserFullProfile$.next(MOCK_RICH_USER);
  const seoAndUtilsService = createMockSeoAndUtilsService();

  TestBed.configureTestingModule({
    imports: [
      UserManagementComponent,
      NoopAnimationsModule,
      TimeagoModule.forRoot()
    ],
    providers: [
      provideRouter([]),
      { provide: UserManagementService, useValue: userManagementService },
      { provide: SeoAndUtilsService, useValue: seoAndUtilsService }
    ]
  });
  TestBed.overrideComponent(UserManagementComponent, {
    remove: {
      imports: [DeveloperApiKeysComponent]
    },
    add: {
      imports: [StubDeveloperApiKeysComponent]
    }
  });

  const fixture = TestBed.createComponent(UserManagementComponent);
  fixture.componentInstance.developerApiEnabled = developerApiEnabled;
  fixture.detectChanges();
  return fixture;
}

function elementIndex(parent: Element, child: Element | null): number {
  if (!child) {
    return -1;
  }
  return Array.from(parent.children).indexOf(child);
}

describe('UserManagementComponent Public API placement', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('renders no Public API DOM when the feature flag is disabled', () => {
    const fixture = renderUserManagement(false);

    expect(fixture.nativeElement.querySelector('app-developer-api-keys')).toBeNull();
    expect(fixture.nativeElement.querySelector('.account-section-separator')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Public API stub');
  });

  it('places Public API after Account ID and before Danger Zone when enabled', () => {
    const fixture = renderUserManagement(true);
    const accountSections: Element | null = fixture.nativeElement.querySelector('.account-sections');
    const accountId: Element | null = fixture.nativeElement.querySelector('.section-surface--id');
    const separator: Element | null = fixture.nativeElement.querySelector('.account-section-separator');
    const publicApi: Element | null = fixture.nativeElement.querySelector('app-developer-api-keys');
    const dangerZone: Element | null = fixture.nativeElement.querySelector('.danger-zone');

    if (!accountSections) {
      throw new Error('Account sections were not rendered.');
    }

    expect(publicApi).not.toBeNull();
    expect(separator).not.toBeNull();
    expect(elementIndex(accountSections, separator)).toBeGreaterThan(elementIndex(accountSections, accountId));
    expect(elementIndex(accountSections, publicApi)).toBe(elementIndex(accountSections, separator) + 1);
    expect(dangerZone?.previousElementSibling).toBe(accountSections);
  });
});
