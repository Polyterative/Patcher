import {
  ComponentFixture,
  TestBed
} from '@angular/core/testing';
import { ModuleWaveformPaletteAnalysisComponent } from './module-waveform-palette-analysis.component';

describe('ModuleWaveformPaletteAnalysisComponent', () => {
  let fixture: ComponentFixture<ModuleWaveformPaletteAnalysisComponent>;
  let component: ModuleWaveformPaletteAnalysisComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModuleWaveformPaletteAnalysisComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ModuleWaveformPaletteAnalysisComponent);
    component = fixture.componentInstance;
  });

  it('renders inline waveform glyph tokens', () => {
    component.description = 'Sine, triangle, saw and random voltage waveforms.';
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.moduleWaveformPaletteAnalysis')).toBeTruthy();
    expect(fixture.nativeElement.querySelectorAll('.moduleWaveformPaletteAnalysis__glyph').length).toBe(4);
    expect(fixture.nativeElement.textContent).toContain('Sine');
    expect(fixture.nativeElement.textContent).not.toContain('Waveform palette');
  });

  it('does not render for low-noise compressor prose', () => {
    component.description = 'A feed-forward compressor with a high quality low noise signal path.';
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.moduleWaveformPaletteAnalysis')).toBeNull();
  });
});
