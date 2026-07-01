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

  it('renders waveform glyph tokens', () => {
    component.description = 'Sine, triangle, saw and random waveforms.';
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.moduleWaveformPaletteAnalysis')).toBeTruthy();
    expect(fixture.nativeElement.querySelectorAll('.moduleWaveformPaletteAnalysis__glyph').length).toBe(4);
    expect(fixture.nativeElement.textContent).toContain('Sine');
  });
});
