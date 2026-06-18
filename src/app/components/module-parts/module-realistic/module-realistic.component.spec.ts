import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModuleRealisticComponent } from './module-realistic.component';
import { RACK_ANALYSIS_MODES } from '../../rack-parts/rack-analysis-mode';
import { MODULE_FORMAT_GEOMETRY } from '../module-format-geometry.constants';
import { RackDetailDataService } from '../../rack-parts/rack-detail-data.service';
import { ModuleDetailDataService } from '../module-detail-data.service';
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



  async function renderInStretchingFlexParent(standardId: number): Promise<{fixture: ComponentFixture<ModuleRealisticComponent>; host: HTMLElement; expectedHeightPx: number}> {
    await TestBed.configureTestingModule({
      declarations: [ModuleRealisticComponent],
      providers: [
        {provide: RackDetailDataService, useValue: {}},
        {provide: ModuleDetailDataService, useValue: {}}
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    const fixture = TestBed.createComponent(ModuleRealisticComponent);
    fixture.componentInstance.data = makeMinimalModule({standard: {id: standardId, name: `Standard ${ standardId }`}});
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const parent = document.createElement('div');
    parent.style.display = 'flex';
    parent.style.alignItems = 'stretch';
    parent.style.height = '50rem';
    host.parentElement?.insertBefore(parent, host);
    parent.appendChild(host);
    fixture.detectChanges();

    const rootFontSize = Number.parseFloat(getComputedStyle(document.documentElement).fontSize || '16');
    return {fixture, host, expectedHeightPx: fixture.componentInstance.hostHeightRem * rootFontSize};
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


  it('keeps rendered host height natural inside a stretching flex parent', async () => {
    for (const standardId of [0, 1, 2]) {
      TestBed.resetTestingModule();
      const {fixture, host, expectedHeightPx} = await renderInStretchingFlexParent(standardId);

      expect(getComputedStyle(host).alignSelf).toBe('flex-start');
      expect(Math.abs(host.getBoundingClientRect().height - expectedHeightPx)).toBeLessThan(1);

      fixture.destroy();
    }
  });

  it('binds the host height to 3U module geometry', () => {
    const component = build();
    component.data = makeMinimalModule({standard: {id: 0, name: 'Eurorack'}});

    expect(component.hostHeightRem).toBe(MODULE_FORMAT_GEOMETRY.EURORACK_3U.heightRem);
  });

  it('binds the host height to Intellijel 1U module geometry', () => {
    const component = build();
    component.data = makeMinimalModule({standard: {id: 1, name: 'Intellijel 1U'}});

    expect(component.hostHeightRem).toBe(MODULE_FORMAT_GEOMETRY.INTELLIJEL_1U.heightRem);
  });

  it('binds the host height to Pulp Logic 1U module geometry', () => {
    const component = build();
    component.data = makeMinimalModule({standard: {id: 2, name: 'Pulp Logic 1U'}});

    expect(component.hostHeightRem).toBe(MODULE_FORMAT_GEOMETRY.PULP_LOGIC_1U.heightRem);
  });

});
