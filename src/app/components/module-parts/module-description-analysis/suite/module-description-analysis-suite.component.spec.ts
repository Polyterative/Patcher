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

  it('passes the description to independently rendered widgets for full description analysis', async () => {
    component.description = 'High band 5kHz and 20kHz. CV range ±5V. Sine output with logic AND.';
    component.showDescriptionAnalysis = true;

    fixture.detectChanges();
    await renderDeferredWidgets(fixture);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-module-frequency-analysis')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('app-module-voltage-analysis')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('app-module-waveform-palette-analysis')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('app-module-utility-operations-analysis')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Frequency range');
    expect(fixture.nativeElement.textContent).toContain('Voltage');
    expect(fixture.nativeElement.textContent).toContain('Waveform palette');
    expect(fixture.nativeElement.textContent).toContain('Utility operations');
  });

  async function renderDeferredWidgets(fixture: ComponentFixture<ModuleDescriptionAnalysisSuiteComponent>): Promise<void> {
    const deferBlocks = await fixture.getDeferBlocks();

    await Promise.all(deferBlocks.map(deferBlock => deferBlock.render(DeferBlockState.Complete)));
  }
});
