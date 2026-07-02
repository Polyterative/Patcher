import {
  ComponentFixture,
  DeferBlockState,
  TestBed
} from '@angular/core/testing';
import { ModuleDescriptionAnalysisSuiteComponent } from './module-description-analysis-suite.component';

describe('ModuleDescriptionAnalysisSuiteComponent', () => {
  let fixture: ComponentFixture<ModuleDescriptionAnalysisSuiteComponent>;
  let component: ModuleDescriptionAnalysisSuiteComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModuleDescriptionAnalysisSuiteComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ModuleDescriptionAnalysisSuiteComponent);
    component = fixture.componentInstance;
  });

  it('renders only the frequency widget for the legacy frequency flag', async () => {
    component.description = 'High band 5kHz and 20kHz. CV range ±5V. Sine output with logic AND.';
    component.showFrequencyAnalysis = true;

    fixture.detectChanges();
    await renderDeferredWidgets(fixture);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-module-frequency-analysis')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('app-module-voltage-analysis')).toBeNull();
    expect(fixture.nativeElement.querySelector('app-module-waveform-palette-analysis')).toBeNull();
    expect(fixture.nativeElement.querySelector('app-module-utility-operations-analysis')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Frequency range');
    expect(fixture.nativeElement.textContent).not.toContain('Voltage');
  });

  it('passes the description to compact inline signal metadata for full description analysis', async () => {
    component.description = 'High band 5kHz and 20kHz. CV range ±5V. Sine output with logic AND.';
    component.showDescriptionAnalysis = true;

    fixture.detectChanges();
    await renderDeferredWidgets(fixture);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-module-frequency-analysis')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('app-module-voltage-analysis')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.moduleDescriptionAnalysisSuite__signalMetadata')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('app-module-waveform-palette-analysis')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('app-module-utility-operations-analysis')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Frequency range');
    expect(fixture.nativeElement.textContent).toContain('Voltage');
    expect(fixture.nativeElement.textContent).toContain('Sine');
    expect(fixture.nativeElement.textContent).toContain('AND');
    expect(fixture.nativeElement.textContent).not.toContain('Waveform palette');
    expect(fixture.nativeElement.textContent).not.toContain('Utility operations');
  });

  it('does not render low-confidence signal metadata for generic compressor prose', async () => {
    component.description = `Messor is a stereo compressor with lots of tricks up its sleeves.
      From gluing a mix together to squashing drums, sidechaining kicks and sculpting transients.
      It's a VCA based feed-forward compressor with a high quality low noise signal path.`;
    component.showDescriptionAnalysis = true;

    fixture.detectChanges();
    await renderDeferredWidgets(fixture);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.moduleDescriptionAnalysisSuite__signalMetadata')).toBeNull();
    expect(fixture.nativeElement.querySelector('app-module-waveform-palette-analysis')).toBeNull();
    expect(fixture.nativeElement.querySelector('app-module-utility-operations-analysis')).toBeNull();
  });

  it('does not render an orphan signal metadata row for a single obvious utility already present in the title text', async () => {
    component.description = 'VCO / Comparator / Sample & Hold // downsampler & lo-fi';
    component.showDescriptionAnalysis = true;

    fixture.detectChanges();
    await renderDeferredWidgets(fixture);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.moduleDescriptionAnalysisSuite__signalMetadata')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Random');
    expect(fixture.nativeElement.textContent).not.toContain('S&H');
  });

  async function renderDeferredWidgets(fixture: ComponentFixture<ModuleDescriptionAnalysisSuiteComponent>): Promise<void> {
    const deferBlocks = await fixture.getDeferBlocks();

    await Promise.all(deferBlocks.map(deferBlock => deferBlock.render(DeferBlockState.Complete)));
  }
});
