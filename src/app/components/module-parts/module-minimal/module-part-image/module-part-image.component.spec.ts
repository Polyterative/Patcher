import {
  Component,
  ChangeDetectorRef,
  ElementRef,
  ChangeDetectionStrategy
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { AppViewportService } from 'src/app/shared-interproject/app-viewport.service';
import { GetModuleHeightForStandardPipe } from '../../get-module-height-for-standard.pipe';
import { MODULE_FORMAT_GEOMETRY } from '../../module-format-geometry.constants';
import {
  MinimalModule,
  ModulePanel
} from 'src/app/models/module';
import {
  ModulePartImageComponent,
  resolveSurfaceTooltipPosition
} from './module-part-image.component';
import { ModulePartImageDataService } from './module-part-image-data.service';
import { environment } from 'src/environments/environment';


const TEST_SUPABASE_URL = 'https://sozmatmywjpstwidzlss.supabase.co';

function buildComponent(options: {
  hostRect?: {left: number; right: number};
  viewportWidth?: number;
  viewportOffsetLeft?: number;
} = {}): ModulePartImageComponent {
  const cdr = jasmine.createSpyObj<ChangeDetectorRef>('ChangeDetectorRef', ['detectChanges']);
  const hostRect = options.hostRect ?? {left: 120, right: 180};
  const elementRef = {
    nativeElement: {
      getBoundingClientRect: () => hostRect
    }
  } as unknown as ElementRef<HTMLElement>;
  const viewportService = {
    currentViewport: () => ({
      width: options.viewportWidth ?? 1280,
      height: 720,
      stableHeight: 720,
      offsetTop: 0,
      offsetLeft: options.viewportOffsetLeft ?? 0,
      keyboardInsetBottom: 0
    })
  } as AppViewportService;
  const dataService = new ModulePartImageDataService();
  return new ModulePartImageComponent(cdr, dataService, elementRef, viewportService);
}

const PANEL_DARK: ModulePanel = {id: 1, filename: 'dark.png', color: 0, description: 'Dark', moduleid: 10};
const PANEL_LIGHT: ModulePanel = {id: 2, filename: 'light.png', color: 1, description: 'Light', moduleid: 10};

type MinimalModuleWithOptionalPanels = Omit<MinimalModule, 'panels'> & {
  panels?: MinimalModule['panels'];
};

function makeModule(
  panels: ModulePanel[] = [PANEL_DARK, PANEL_LIGHT],
  standard: MinimalModule['standard'] = {id: 0, name: '3U'},
  hp = 10
): MinimalModule {
  return {
    id: 10,
    created: '',
    updated: '',
    name: 'VCO',
    description: '',
    hp,
    public: true,
    manufacturer: {id: 1, name: 'Make Noise'},
    manufacturerId: 1,
    standard,
    tags: [],
    panels
  };
}

function makeModuleWithoutPanels(): MinimalModule {
  const module: MinimalModuleWithOptionalPanels = makeModule();
  delete module.panels;

  return module as MinimalModule;
}

@Component({
  template: `
    <app-module-part-image
      [data]="data"
      [fixedHeight]="fixedHeight"
      [disableEnterAnimation]="true"
    ></app-module-part-image>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
class HostComponent {
  data = makeModule([], {id: 1, name: 'Intellijel 1U'}, 10);
  fixedHeight = false;
}

describe('ModulePartImageComponent — panel resolution', () => {
  let previousSupabaseUrl: string;

  beforeAll(() => {
    previousSupabaseUrl = environment.supabase.url;
    environment.supabase.url = TEST_SUPABASE_URL;
  });

  afterAll(() => {
    environment.supabase.url = previousSupabaseUrl;
  });

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
    c.data = makeModuleWithoutPanels();
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

  it('uses the Cloudflare proxy image URL before any load failure', () => {
    const c = buildComponent();
    c.data = makeModule([{...PANEL_DARK, filename: 'panel.png'}]);
    c.ngOnChanges();

    expect(c.imageSrc).toBe('https://images.patcher.xyz/module-panels/panel.png');
  });

  it('falls back to the direct Supabase storage URL after a proxy image load failure', () => {
    const c = buildComponent();
    c.data = makeModule([{...PANEL_DARK, filename: 'panel.png'}]);
    c.ngOnChanges();

    c.onImageLoadError();

    expect(c.useDirectStorageFallback).toBeTrue();
    expect(c.imageSrc).toBe('https://sozmatmywjpstwidzlss.supabase.co/storage/v1/object/public/module-panels/panel.png');
  });

  it('resets the direct storage fallback when the resolved panel filename changes', () => {
    const c = buildComponent();
    c.data = makeModule([{...PANEL_DARK, filename: 'old-panel.png'}]);
    c.ngOnChanges();
    c.onImageLoadError();

    c.data = makeModule([{...PANEL_DARK, filename: 'new-panel.png'}]);
    c.ngOnChanges();

    expect(c.useDirectStorageFallback).toBeFalse();
    expect(c.imageSrc).toBe('https://images.patcher.xyz/module-panels/new-panel.png');
  });

  it('marks the panel image as failed after a second load error once direct fallback is already active (AT-I2)', () => {
    const c = buildComponent();
    c.data = makeModule([{...PANEL_DARK, filename: 'panel.png'}]);
    c.ngOnChanges();
    c.onImageLoadError();
    (c.changeDetection.detectChanges as jasmine.Spy).calls.reset();

    c.onImageLoadError();

    expect(c.loadFailed).toBeTrue();
    expect(c.changeDetection.detectChanges).toHaveBeenCalled();
  });

  it('does not mark the panel as failed on a lone first load error (AT-I1 preservation)', () => {
    const c = buildComponent();
    c.data = makeModule([{...PANEL_DARK, filename: 'panel.png'}]);
    c.ngOnChanges();

    c.onImageLoadError();

    expect(c.loadFailed).toBeFalse();
  });

  it('resets the failed state when the resolved panel filename changes (AT-I3)', () => {
    const c = buildComponent();
    c.data = makeModule([{...PANEL_DARK, filename: 'old-panel.png'}]);
    c.ngOnChanges();
    c.onImageLoadError();
    c.onImageLoadError();
    expect(c.loadFailed).toBeTrue();

    c.data = makeModule([{...PANEL_DARK, filename: 'new-panel.png'}]);
    c.ngOnChanges();

    expect(c.loadFailed).toBeFalse();
    expect(c.useDirectStorageFallback).toBeFalse();
    expect(c.imageSrc).toBe('https://images.patcher.xyz/module-panels/new-panel.png');
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

  it('loads surface panel images eagerly', () => {
    const c = buildComponent();
    c.containImage = false;

    expect(c.imageLoadingMode).toBe('eager');
    expect(c.imageDecodingMode).toBe('sync');
  });

  it('keeps contained panel images lazy-loaded', () => {
    const c = buildComponent();
    c.containImage = true;

    expect(c.imageLoadingMode).toBe('lazy');
    expect(c.imageDecodingMode).toBe('async');
  });

  it('updates tooltipPosition from the current viewport before showing the tooltip', () => {
    const c = buildComponent({
      hostRect: {left: 1040, right: 1100}
    });

    c.updateTooltipPosition();

    expect(c.tooltipPosition).toBe('before');
  });
 
});

describe('resolveSurfaceTooltipPosition', () => {
  it('opens the tooltip before the module when there is more space on the left', () => {
    expect(resolveSurfaceTooltipPosition({
      left: 1040,
      right: 1100
    } as DOMRect, 1280)).toBe('before');
  });

  it('opens the tooltip after the module when there is more space on the right', () => {
    expect(resolveSurfaceTooltipPosition({
      left: 120,
      right: 180
    } as DOMRect, 1280)).toBe('after');
  });

  it('accounts for the visual viewport offset when choosing a side', () => {
    expect(resolveSurfaceTooltipPosition({
      left: 390,
      right: 450
    } as DOMRect, 420, 200)).toBe('before');
  });
});

describe('ModulePartImageComponent — placeholder proportions', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        HostComponent,
        ModulePartImageComponent,
        GetModuleHeightForStandardPipe
      ],
      imports: [
        MatIconModule,
        MatTooltipModule,
        NoopAnimationsModule,
        RouterTestingModule
      ]
    }).compileComponents();
  });

  it('renders missing-panel Intellijel 1U placeholders as a wide slab', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();

    const placeholder = fixture.nativeElement.querySelector('.preview') as HTMLElement;

    expectRemValue(placeholder.style.width, 10 / 2.7 / 2);
    expectRemValue(placeholder.style.height, MODULE_FORMAT_GEOMETRY.INTELLIJEL_1U.heightRem / 2.7 / 2);
    expect(parseFloat(placeholder.style.width)).toBeGreaterThan(parseFloat(placeholder.style.height));
  });

  it('does not send page referrers with proxied panel image requests', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.data = makeModule([{...PANEL_DARK, filename: 'panel.jpg'}]);
    fixture.detectChanges();

    const image = fixture.nativeElement.querySelector('img') as HTMLImageElement;

    expect(image.referrerPolicy).toBe('no-referrer');
  });

  it('uses Pulp Logic 1U height when sizing missing-panel placeholders', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.data = makeModule([], {id: 2, name: 'Pulp Logic 1U'}, 10);
    fixture.detectChanges();

    const placeholder = fixture.nativeElement.querySelector('.preview') as HTMLElement;

    expectRemValue(placeholder.style.width, 10 / 2.7 / 2);
    expectRemValue(placeholder.style.height, MODULE_FORMAT_GEOMETRY.PULP_LOGIC_1U.heightRem / 2.7 / 2);
    expect(parseFloat(placeholder.style.width)).toBeGreaterThan(parseFloat(placeholder.style.height));
  });

  it('keeps fixed-height 1U placeholder width derived from HP and format height', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.fixedHeight = true;
    fixture.detectChanges();

    const placeholder = fixture.nativeElement.querySelector('.preview') as HTMLElement;

    expectRemValue(placeholder.style.width, 10 * 8 / MODULE_FORMAT_GEOMETRY.INTELLIJEL_1U.heightRem);
    expect(placeholder.style.height).toBe('');
    expect(placeholder.classList).toContain('preview--fixed-height');
  });

  it('renders an accessible failed state after a double load error, hiding the broken image (AT-I2, AT-I4)', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.data = makeModule([{...PANEL_DARK, filename: 'panel.png'}], {id: 1, name: 'Intellijel 1U'}, 10);
    fixture.detectChanges();

    const image = fixture.nativeElement.querySelector('img') as HTMLImageElement;
    image.dispatchEvent(new Event('error'));
    fixture.detectChanges();
    image.dispatchEvent(new Event('error'));
    fixture.detectChanges();

    const failed = fixture.nativeElement.querySelector('[data-testid="module-image-load-failed"]') as HTMLElement;
    expect(failed).withContext('the load-failed fallback should render').toBeTruthy();
    expect(failed.getAttribute('title')).toBe('Panel image failed to load for VCO');
    expect(failed.textContent).toContain('Image failed to load');
    expect(fixture.nativeElement.querySelector('img')).withContext('the broken <img> must not remain in the DOM').toBeNull();

    // Layout stability: the failed-state box must reserve the exact same footprint as the
    // existing empty-state box (same sizing rule as the Intellijel 1U case above).
    expectRemValue(failed.style.width, 10 / 2.7 / 2);
    expectRemValue(failed.style.height, MODULE_FORMAT_GEOMETRY.INTELLIJEL_1U.heightRem / 2.7 / 2);
  });

  function expectRemValue(actual: string, expected: number): void {
    expect(actual.endsWith('rem')).toBeTrue();
    expect(parseFloat(actual)).toBeCloseTo(expected, 4);
  }
});
