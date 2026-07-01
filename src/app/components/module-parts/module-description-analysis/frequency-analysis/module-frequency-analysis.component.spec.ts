import {
  ComponentFixture,
  TestBed
} from '@angular/core/testing';
import { ModuleFrequencyAnalysisComponent } from './module-frequency-analysis.component';

describe('ModuleFrequencyAnalysisComponent', () => {
  let fixture: ComponentFixture<ModuleFrequencyAnalysisComponent>;
  let component: ModuleFrequencyAnalysisComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModuleFrequencyAnalysisComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ModuleFrequencyAnalysisComponent);
    component = fixture.componentInstance;
  });

  it('does not render a chart when no frequency band is detected', () => {
    component.description = 'A stereo mixer with mute switches.';

    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.moduleFrequencyAnalysis')).toBeNull();
  });

  it('renders detected bands on a logarithmic 20Hz to 20kHz chart', () => {
    component.description = 'High band between 5kHz and 20kHz. Mid band from 500Hz to 2.2kHz.';

    fixture.detectChanges();

    const chart = fixture.nativeElement.querySelector('svg') as SVGElement;
    const labels = Array.from(fixture.nativeElement.querySelectorAll('.moduleFrequencyAnalysis__legendRow'))
      .map((label: Element) => label.textContent?.trim());

    expect(chart).toBeTruthy();
    expect(fixture.nativeElement.querySelectorAll('.moduleFrequencyAnalysis__rangeRail').length).toBe(2);
    expect(Array.from(fixture.nativeElement.querySelectorAll('.moduleFrequencyAnalysis__tickLabel'))
      .map((label: Element) => label.textContent?.trim())).toEqual(['20 Hz', '200 Hz', '2 kHz', '20 kHz']);
    expect(labels.some(label => label?.includes('High') && label.includes('5 kHz – 20 kHz'))).toBeTrue();
    expect(labels.some(label => label?.includes('Mid') && label.includes('500 Hz – 2.2 kHz'))).toBeTrue();
  });

  it('renders center frequencies as vertical line markers', () => {
    component.description = 'Cutoff at 1kHz.';

    fixture.detectChanges();

    const centerLine = fixture.nativeElement.querySelector('.moduleFrequencyAnalysis__centerLine') as SVGLineElement;
    expect(centerLine).toBeTruthy();
    expect(centerLine.getAttribute('y2')).toBe('56');
    expect(fixture.nativeElement.textContent).toContain('Cutoff');
    expect(fixture.nativeElement.textContent).toContain('1 kHz');
  });
});
