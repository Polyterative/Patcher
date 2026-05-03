import { ChangeDetectorRef } from '@angular/core';
import { ModulePartImageComponent } from './module-part-image.component';


function buildComponent(): ModulePartImageComponent {
  const cdr = {detectChanges: () => {}} as unknown as ChangeDetectorRef;
  return new ModulePartImageComponent(cdr);
}

const PANEL_DARK = {id: 1, filename: 'dark.png', color: 0, description: 'Dark', moduleid: 10};
const PANEL_LIGHT = {id: 2, filename: 'light.png', color: 1, description: 'Light', moduleid: 10};

function makeModule(panels: any[] = [PANEL_DARK, PANEL_LIGHT]): any {
  return {id: 10, name: 'VCO', panels, manufacturer: {name: 'Make Noise'}, standard: {name: '3U'}};
}

describe('ModulePartImageComponent — panel resolution', () => {

  it('uses panels[0] when selectedPanelId is null', () => {
    const c = buildComponent();
    c.data = makeModule();
    c.selectedPanelId = null;
    c.ngOnChanges();
    expect(c.filename).toBe('dark.png');
  });

  it('resolves filename by selectedPanelId when id matches', () => {
    const c = buildComponent();
    c.data = makeModule();
    c.selectedPanelId = 2;
    c.ngOnChanges();
    expect(c.filename).toBe('light.png');
  });

  it('falls back to panels[0] when selectedPanelId does not match any panel', () => {
    const c = buildComponent();
    c.data = makeModule();
    c.selectedPanelId = 999;
    c.ngOnChanges();
    expect(c.filename).toBe('dark.png');
  });

  it('returns undefined when module has no panels', () => {
    const c = buildComponent();
    c.data = makeModule([]);
    c.selectedPanelId = null;
    c.ngOnChanges();
    expect(c.filename).toBeUndefined();
  });

  it('returns undefined when panels is undefined', () => {
    const c = buildComponent();
    c.data = {id: 10, name: 'VCO', manufacturer: {name: 'Make Noise'}, standard: {name: '3U'}} as any;
    c.selectedPanelId = null;
    c.ngOnChanges();
    expect(c.filename).toBeUndefined();
  });

  it('defaults selectedPanelId to null', () => {
    const c = buildComponent();
    expect(c.selectedPanelId).toBeNull();
  });

  it('preserves legacy jpg filenames without rewriting them', () => {
    const c = buildComponent();
    c.data = makeModule([{...PANEL_DARK, filename: 'legacy-panel.jpg'}]);
    c.ngOnChanges();

    expect(c.filename).toBe('legacy-panel.jpg');
  });

  it('preserves new webp filenames without rewriting them', () => {
    const c = buildComponent();
    c.data = makeModule([{...PANEL_DARK, filename: 'optimized-panel.webp'}]);
    c.ngOnChanges();

    expect(c.filename).toBe('optimized-panel.webp');
  });

  it('prefers an explicit selectedPanelId over preferredPanelColor', () => {
    const c = buildComponent();
    c.data = makeModule();
    c.selectedPanelId = 2;
    c.preferredPanelColor = 0;

    c.ngOnChanges();

    expect(c.filename).toBe('light.png');
  });

  it('falls back to preferredPanelColor when selectedPanelId does not resolve', () => {
    const c = buildComponent();
    c.data = makeModule();
    c.selectedPanelId = 999;
    c.preferredPanelColor = 1;

    c.ngOnChanges();

    expect(c.filename).toBe('light.png');
  });

  it('marks the host as a surface image when containImage is false', () => {
    const c = buildComponent();
    c.containImage = false;

    expect(c.isSurfaceImage).toBeTrue();
  });

  it('does not mark the host as a surface image when containImage is true', () => {
    const c = buildComponent();
    c.containImage = true;

    expect(c.isSurfaceImage).toBeFalse();
  });

  it('keeps enter animations enabled by default', () => {
    const c = buildComponent();

    expect(c.disableEnterAnimation).toBeFalse();
  });

});
