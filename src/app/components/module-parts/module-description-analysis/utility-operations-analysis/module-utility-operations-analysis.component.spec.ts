import {
  ComponentFixture,
  TestBed
} from '@angular/core/testing';
import { ModuleUtilityOperationsAnalysisComponent } from './module-utility-operations-analysis.component';

describe('ModuleUtilityOperationsAnalysisComponent', () => {
  let fixture: ComponentFixture<ModuleUtilityOperationsAnalysisComponent>;
  let component: ModuleUtilityOperationsAnalysisComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModuleUtilityOperationsAnalysisComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ModuleUtilityOperationsAnalysisComponent);
    component = fixture.componentInstance;
  });

  it('renders plain inline operation tokens', () => {
    component.description = 'Logic AND plus slew and offset utilities.';
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.moduleUtilityOperationsAnalysis')).toBeTruthy();
    expect(fixture.nativeElement.querySelectorAll('.moduleUtilityOperationsAnalysis__token').length).toBe(3);
    expect(fixture.nativeElement.textContent).toContain('AND');
    expect(fixture.nativeElement.textContent).toContain('Slew');
    expect(fixture.nativeElement.textContent).not.toContain('Utility operations');
    expect(fixture.nativeElement.textContent).not.toContain('logic');
  });

  it('does not render for low-confidence compressor prose', () => {
    component.description = 'From gluing a mix together to squashing drums, this low noise feed-forward compressor shapes dynamics.';
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.moduleUtilityOperationsAnalysis')).toBeNull();
  });
});
