import {
  ComponentFixture,
  TestBed
} from '@angular/core/testing';
import { ModuleTimeRateAnalysisComponent } from './module-time-rate-analysis.component';

describe('ModuleTimeRateAnalysisComponent', () => {
  let fixture: ComponentFixture<ModuleTimeRateAnalysisComponent>;
  let component: ModuleTimeRateAnalysisComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModuleTimeRateAnalysisComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ModuleTimeRateAnalysisComponent);
    component = fixture.componentInstance;
  });

  it('renders chips for detected time and rate features', () => {
    component.description = 'Attack time 5ms with LFO rate up to 20Hz.';
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.moduleTimeRateAnalysis')).toBeTruthy();
    expect(fixture.nativeElement.querySelectorAll('.moduleTimeRateAnalysis__chip').length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('5 ms');
    expect(fixture.nativeElement.textContent).toContain('20 Hz');
  });
});
