import { ModuleRealisticComponent } from './module-realistic.component';
import { RACK_ANALYSIS_MODES } from '../../rack-parts/rack-analysis-mode';
import {
  MinimalModule,
  ModulePanel
} from 'src/app/models/module';


describe('ModuleRealisticComponent', () => {
  function build(): ModuleRealisticComponent {
    return new ModuleRealisticComponent({} as any, {} as any);
  }

  function makePanel(id: number, description: string, filename: string): ModulePanel {
    return {
      id,
      moduleid: 1,
      color: 0,
      filename,
      description
    };
  }

  function makeMinimalModule(overrides: Partial<MinimalModule> = {}): MinimalModule {
    return {
      id: 1,
      name: 'Belgrad',
      description: '',
      hp: 14,
      public: true,
      manufacturer: {
        id: 1,
        name: 'Xaoc Devices'
      },
      manufacturerId: 1,
      standard: {
        id: 0,
        name: 'Eurorack'
      },
      tags: [],
      panels: [],
      created: '',
      updated: '',
      ...overrides
    };
  }

  it('omits HP from the panel image tooltip copy', () => {
    const component = build();

    const tooltip = component.buildPanelTooltip(makeMinimalModule(), null);

    expect(tooltip).toBe('Belgrad (Xaoc Devices, Eurorack)');
    expect(tooltip).not.toContain('14HP');
  });

  it('keeps panel variant context in the tooltip copy', () => {
    const component = build();

    const tooltip = component.buildPanelTooltip(makeMinimalModule({
      panels: [
        makePanel(1, 'Light', 'light.png'),
        makePanel(2, 'Dark', 'dark.png')
      ]
    }), 2);

    expect(tooltip).toContain('Belgrad (Xaoc Devices, Eurorack)');
    expect(tooltip).toContain('panel: Dark');
    expect(tooltip).not.toContain('panel variants');
  });

  it('falls back to the first panel when no explicit panel is selected', () => {
    const component = build();

    const tooltip = component.buildPanelTooltip(makeMinimalModule({
      panels: [
        makePanel(1, 'Light', 'light.png'),
        makePanel(2, 'Dark', 'dark.png')
      ]
    }), null);

    expect(tooltip).toContain('panel: Light');
  });

  it('keeps the panel image surface available in analysis mode', () => {
    const component = build();
    component.analysisMode = RACK_ANALYSIS_MODES.power;
    component.showPanelImages = true;

    expect(component.renderPanelImageSurface).toBeTrue();
    expect(component.renderTextSurface).toBeFalse();
  });

  it('keeps the text surface available in analysis mode when images are off', () => {
    const component = build();
    component.analysisMode = RACK_ANALYSIS_MODES.function;
    component.showPanelImages = false;

    expect(component.renderPanelImageSurface).toBeFalse();
    expect(component.renderTextSurface).toBeTrue();
  });

  it('identifies power analysis mode separately from function mode', () => {
    const component = build();
    component.analysisMode = RACK_ANALYSIS_MODES.power;

    expect(component.analysisModeActive).toBeTrue();
    expect(component.powerAnalysisMode).toBeTrue();
    expect(component.functionAnalysisMode).toBeFalse();
  });

  it('identifies function analysis mode separately from power mode', () => {
    const component = build();
    component.analysisMode = RACK_ANALYSIS_MODES.function;

    expect(component.analysisModeActive).toBeTrue();
    expect(component.powerAnalysisMode).toBeFalse();
    expect(component.functionAnalysisMode).toBeTrue();
  });

  it('treats the default mode as having no active analysis overlay', () => {
    const component = build();

    expect(component.analysisModeActive).toBeFalse();
    expect(component.powerAnalysisMode).toBeFalse();
    expect(component.functionAnalysisMode).toBeFalse();
  });

  it('binds the host width to module hp', () => {
    const component = build();
    component.data = makeMinimalModule();

    expect(component.hostWidthRem).toBe(14);
  });

  it('binds the host height to module format geometry', () => {
    const component = build();
    component.data = makeMinimalModule();

    expect(component.hostHeightRem).toBeGreaterThan(0);
  });

});
