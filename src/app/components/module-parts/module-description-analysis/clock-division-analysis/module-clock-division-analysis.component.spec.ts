import {
  ComponentFixture,
  TestBed
} from '@angular/core/testing';
import { ModuleClockDivisionAnalysisComponent } from './module-clock-division-analysis.component';

describe('ModuleClockDivisionAnalysisComponent', () => {
  let fixture: ComponentFixture<ModuleClockDivisionAnalysisComponent>;
  let component: ModuleClockDivisionAnalysisComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModuleClockDivisionAnalysisComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ModuleClockDivisionAnalysisComponent);
    component = fixture.componentInstance;
  });

  it('renders a ratio ladder for clock features', () => {
    component.description = 'Clock divider with /2, /4, x2 and swing.';
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.moduleClockDivisionAnalysis')).toBeTruthy();
    expect(fixture.nativeElement.querySelectorAll('.moduleClockDivisionAnalysis__mark').length).toBe(4);
    expect(fixture.nativeElement.textContent).toContain('/2');
    expect(fixture.nativeElement.textContent).toContain('Swing');
  });
});
