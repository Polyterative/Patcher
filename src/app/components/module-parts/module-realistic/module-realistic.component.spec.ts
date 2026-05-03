import { ModuleRealisticComponent } from './module-realistic.component';


describe('ModuleRealisticComponent', () => {
  function build(): ModuleRealisticComponent {
    return new ModuleRealisticComponent({} as any, {} as any);
  }

  it('omits HP from the panel image tooltip copy', () => {
    const component = build();

    const tooltip = component.buildPanelTooltip({
      name: 'Belgrad',
      hp: 14,
      manufacturer: {name: 'Xaoc Devices'},
      standard: {name: 'Eurorack'},
      panels: []
    }, null);

    expect(tooltip).toBe('Belgrad (Xaoc Devices, Eurorack)');
    expect(tooltip).not.toContain('14HP');
  });

  it('keeps panel variant context in the tooltip copy', () => {
    const component = build();

    const tooltip = component.buildPanelTooltip({
      name: 'Belgrad',
      manufacturer: {name: 'Xaoc Devices'},
      standard: {name: 'Eurorack'},
      panels: [
        {id: 1, filename: 'light.png', description: 'Light'},
        {id: 2, filename: 'dark.png', description: 'Dark'}
      ]
    }, 2);

    expect(tooltip).toContain('Belgrad (Xaoc Devices, Eurorack)');
    expect(tooltip).toContain('panel: Dark');
    expect(tooltip).not.toContain('panel variants');
  });

  it('keeps the panel image surface available in power analysis mode', () => {
    const component = build();
    component.powerAnalysisMode = true;
    component.showPanelImages = true;

    expect(component.shouldRenderPanelImageSurface()).toBeTrue();
    expect(component.shouldRenderTextSurface()).toBeFalse();
  });

  it('keeps the text surface available in power analysis mode when images are off', () => {
    const component = build();
    component.powerAnalysisMode = true;
    component.showPanelImages = false;

    expect(component.shouldRenderPanelImageSurface()).toBeFalse();
    expect(component.shouldRenderTextSurface()).toBeTrue();
  });

  it('binds the host width to module hp', () => {
    const component = build();
    component.data = {
      hp: 14,
      standard: {id: 0}
    } as any;

    expect(component.hostWidthRem).toBe(14);
  });

  it('binds the host height to module format geometry', () => {
    const component = build();
    component.data = {
      hp: 14,
      standard: {id: 0}
    } as any;

    expect(component.hostHeightRem).toBeGreaterThan(0);
  });

});
