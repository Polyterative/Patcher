import {
  ComponentFixture,
  TestBed
} from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import {
  SSOButtonsComponent,
  SSOProvider
} from './sso-buttons.component';


describe('SSOButtonsComponent', () => {
  let component: SSOButtonsComponent;
  let fixture: ComponentFixture<SSOButtonsComponent>;
  
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SSOButtonsComponent, NoopAnimationsModule]
    }).compileComponents();
    
    fixture = TestBed.createComponent(SSOButtonsComponent);
    component = fixture.componentInstance;
    // Do NOT call detectChanges here — each test sets inputs first, then detects
  });
  
  // ── Defaults ───────────────────────────────────────────────────────────────
  
  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });
  
  it('should default to google provider', () => {
    fixture.detectChanges();
    expect(component.providers).toEqual(['google']);
  });
  
  it('should show divider by default', () => {
    fixture.detectChanges();
    expect(component.showDivider).toBeTrue();
  });
  
  it('should default dividerText to "or"', () => {
    fixture.detectChanges();
    expect(component.dividerText).toBe('or');
  });
  
  // ── Rendering ──────────────────────────────────────────────────────────────
  
  it('renders one button per provider', () => {
    component.providers = ['google', 'github'];
    fixture.detectChanges();
    const buttons = fixture.debugElement.queryAll(By.css('.sso-button'));
    expect(buttons.length).toBe(2);
  });
  
  it('renders the divider when showDivider is true', () => {
    component.showDivider = true;
    fixture.detectChanges();
    const divider = fixture.debugElement.query(By.css('.divider'));
    expect(divider).toBeTruthy();
  });
  
  it('does not render the divider when showDivider is false', () => {
    component.showDivider = false;
    fixture.detectChanges();
    const divider = fixture.debugElement.query(By.css('.divider'));
    expect(divider).toBeFalsy();
  });
  
  // ── getButtonText ──────────────────────────────────────────────────────────
  
  it('getButtonText returns "Continue with Google" for google provider', () => {
    expect(component.getButtonText('google')).toBe('Continue with Google');
  });
  
  it('getButtonText returns "Continue with GitHub" for github provider', () => {
    expect(component.getButtonText('github')).toBe('Continue with GitHub');
  });
  
  // ── getAriaLabel ───────────────────────────────────────────────────────────
  
  it('getAriaLabel returns configured ariaLabel for google', () => {
    expect(component.getAriaLabel('google')).toBe('Continue with Google account');
  });
  
  it('getAriaLabel falls back to "Continue with X" when no ariaLabel configured', () => {
    // Override config to simulate missing ariaLabel
    (component as any).config['google'] = {name: 'Google', icon: '', color: '#DB4437'};
    expect(component.getAriaLabel('google')).toBe('Continue with Google');
  });
  
  // ── selectProvider ─────────────────────────────────────────────────────────
  
  it('emits providerSelected event when selectProvider is called', () => {
    let emitted: SSOProvider | undefined;
    component.providerSelected.subscribe(p => (emitted = p));
    
    component.selectProvider('google');
    
    expect(emitted).toBe('google');
  });
  
  it('sets loadingProvider when selectProvider is called', () => {
    component.providerSelected.subscribe(() => {}); // consume
    component.selectProvider('github');
    expect(component.loadingProvider).toBe('github');
  });
  
  it('does NOT emit when isLoading is true', () => {
    let emitted = false;
    component.providerSelected.subscribe(() => (emitted = true));
    component.isLoading = true;
    
    component.selectProvider('google');
    
    expect(emitted).toBeFalse();
  });
  
  it('does not change loadingProvider when isLoading is true', () => {
    component.isLoading = true;
    component.loadingProvider = null;
    
    component.selectProvider('google');
    
    expect(component.loadingProvider).toBeNull();
  });
  
  // ── @Input providers binding ───────────────────────────────────────────────
  
  it('renders apple and google buttons when providers input is set to both', () => {
    component.providers = ['apple', 'google'];
    fixture.detectChanges();
    const buttons = fixture.debugElement.queryAll(By.css('.sso-button'));
    expect(buttons.length).toBe(2);
  });
  
  it('renders zero buttons when providers input is empty', () => {
    component.providers = [];
    fixture.detectChanges();
    const buttons = fixture.debugElement.queryAll(By.css('.sso-button'));
    expect(buttons.length).toBe(0);
  });
});
