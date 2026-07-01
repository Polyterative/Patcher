import {
  ComponentFixture,
  TestBed
} from '@angular/core/testing';
import { ModuleVoltageAnalysisComponent } from './module-voltage-analysis.component';

describe('ModuleVoltageAnalysisComponent', () => {
  let fixture: ComponentFixture<ModuleVoltageAnalysisComponent>;
  let component: ModuleVoltageAnalysisComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModuleVoltageAnalysisComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ModuleVoltageAnalysisComponent);
    component = fixture.componentInstance;
  });

  it('renders nothing without voltage features', () => {
    component.description = 'A stereo mixer.';
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.moduleVoltageAnalysis')).toBeNull();
  });

  it('renders a voltage ruler with spans and markers', () => {
    component.description = 'CV range ±5V with 5V gate output.';
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.moduleVoltageAnalysis')).toBeTruthy();
    expect(fixture.nativeElement.querySelectorAll('.moduleVoltageAnalysis__span').length).toBe(1);
    expect(fixture.nativeElement.querySelectorAll('.moduleVoltageAnalysis__marker').length).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('±5V');
    expect(fixture.nativeElement.textContent).toContain('Gate +5V');
  });
});
