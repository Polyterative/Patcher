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
});
