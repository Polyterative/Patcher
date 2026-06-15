import {
  Component,
  NO_ERRORS_SCHEMA,
  ChangeDetectionStrategy
} from '@angular/core';
import {
  ComponentFixture,
  TestBed
} from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { AdminPanelRootComponent } from './admin-panel-root.component';
import { SupabaseService } from '../supabase.service';

@Component({
  selector: 'lib-hero-content-card',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
class HeroContentCardStub {
}

@Component({
  selector: 'app-admin-flags',
  template: '',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
class AdminFlagsStub {
}

describe('AdminPanelRootComponent', () => {
  let mockBackend: any;
  let fixture: ComponentFixture<AdminPanelRootComponent>;

  beforeEach(async () => {
    mockBackend = {};
    await TestBed.configureTestingModule({
      declarations: [
        AdminPanelRootComponent,
        HeroContentCardStub,
        AdminFlagsStub
      ],
      providers: [
        { provide: SupabaseService, useValue: mockBackend }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();
    fixture = TestBed.createComponent(AdminPanelRootComponent);
    fixture.detectChanges();
  });

  it('creates', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders the wide-shell hero card host', () => {
    const card = fixture.debugElement.query(By.directive(HeroContentCardStub));
    expect(card).not.toBeNull();
  });

  it('renders admin-flags inside the hero card', () => {
    const flags = fixture.debugElement.query(By.directive(AdminFlagsStub));
    expect(flags).not.toBeNull();
  });

  it('exposes backend', () => {
    expect(fixture.componentInstance.backend).toBe(mockBackend);
  });
});
