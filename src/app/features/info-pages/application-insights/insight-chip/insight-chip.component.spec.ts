import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatIconModule } from '@angular/material/icon';
import { InsightChipComponent } from './insight-chip.component';

describe('InsightChipComponent', () => {
  let fixture: ComponentFixture<InsightChipComponent>;
  let comp: InsightChipComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MatIconModule],
      declarations: [InsightChipComponent]
    }).compileComponents();
    fixture = TestBed.createComponent(InsightChipComponent);
    comp = fixture.componentInstance;
  });

  it('creates without error', () => {
    expect(comp).toBeTruthy();
  });

  it('icon defaults to empty string', () => {
    expect(comp.icon).toBe('');
  });

  it('label defaults to empty string', () => {
    expect(comp.label).toBe('');
  });

  it('compact defaults to false', () => {
    expect(comp.compact).toBeFalse();
  });

  it('featured defaults to false', () => {
    expect(comp.featured).toBeFalse();
  });

  it('exposes label and text value through an aria-label (no tone-only encoding)', () => {
    comp.icon = 'view_module';
    comp.label = 'Modules (last 30 days)';
    comp.value = '64';
    fixture.detectChanges();

    const chip = fixture.nativeElement.querySelector('.insight-chip') as HTMLElement;
    expect(chip.getAttribute('aria-label')).toBe('Modules (last 30 days): 64');
    expect(chip.textContent).toContain('Modules (last 30 days)');
    expect(chip.textContent).toContain('64');
  });

  it('hides the decorative icon from assistive technology', () => {
    comp.icon = 'view_module';
    comp.label = 'Modules';
    comp.value = '64';
    fixture.detectChanges();

    const icon = fixture.nativeElement.querySelector('mat-icon') as HTMLElement;
    expect(icon.getAttribute('aria-hidden')).toBe('true');
  });
});
