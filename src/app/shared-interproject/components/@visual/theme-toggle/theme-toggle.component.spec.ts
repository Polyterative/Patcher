import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ThemeToggleComponent } from './theme-toggle.component';
import { AppThemeService } from 'src/app/shared-interproject/app-theme.service';

describe('ThemeToggleComponent', () => {
  let fixture: ComponentFixture<ThemeToggleComponent>;
  let theme: AppThemeService;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [ThemeToggleComponent]
    }).compileComponents();
    fixture = TestBed.createComponent(ThemeToggleComponent);
    theme = TestBed.inject(AppThemeService);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('creates with system default', () => {
    expect(fixture.componentInstance).toBeTruthy();
    expect(theme.preference()).toBe('system');
  });

  it('renders a discrete button with an accessible label', () => {
    const button = fixture.nativeElement.querySelector('button.theme-toggle') as HTMLButtonElement;
    expect(button).toBeTruthy();
    expect(button.getAttribute('aria-label')).toContain('Appearance:');
  });

  it('cycles preference on click', () => {
    const button = fixture.nativeElement.querySelector('button.theme-toggle') as HTMLButtonElement;
    button.click();
    expect(theme.preference()).toBe('dark');
  });
});
