import { NO_ERRORS_SCHEMA } from '@angular/core';
import {
  ComponentFixture,
  TestBed
} from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { MinimalModule } from 'src/app/models/module';
import { Standard } from 'src/app/models/standard';
import { getModuleHeightForStandard } from '../get-module-height-for-standard.pipe';
import {
  ModulePanelWallComponent,
  PANEL_WALL_SCALE
} from './module-panel-wall.component';

const THREE_U_STANDARD: Standard = {id: 0, name: '3U Doepfer'};
const INTELLIJEL_STANDARD: Standard = {id: 1, name: '1U Intellijel'};

function buildModule(overrides: Partial<MinimalModule> = {}): MinimalModule {
  return {
    id: overrides.id ?? 1,
    name: overrides.name ?? 'Maths',
    description: overrides.description ?? 'Function generator',
    hp: overrides.hp ?? 10,
    public: overrides.public ?? true,
    created: overrides.created ?? '2026-01-01T00:00:00.000Z',
    updated: overrides.updated ?? '2026-01-01T00:00:00.000Z',
    manufacturerId: overrides.manufacturerId ?? 1,
    manufacturer: overrides.manufacturer ?? {id: 1, name: 'Make Noise'},
    standard: overrides.standard ?? THREE_U_STANDARD,
    tags: overrides.tags ?? [],
    panels: overrides.panels ?? [{id: 1, moduleid: 1, color: 1, filename: 'maths.png', description: 'Light'}],
  };
}

describe('ModulePanelWallComponent', () => {
  let fixture: ComponentFixture<ModulePanelWallComponent>;
  let component: ModulePanelWallComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ModulePanelWallComponent],
      imports: [RouterTestingModule],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(ModulePanelWallComponent);
    component = fixture.componentInstance;
  });

  it('renders one tile per module', () => {
    component.modules = [
      buildModule({id: 1, name: 'Maths'}),
      buildModule({id: 2, name: 'Rings'})
    ];

    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.module-panel-wall__tile').length).toBe(2);
  });

  it('sizes panels proportionally from HP and standard height', () => {
    component.modules = [
      buildModule({id: 1, hp: 10, standard: THREE_U_STANDARD})
    ];

    fixture.detectChanges();

    const panel = fixture.nativeElement.querySelector('.module-panel-wall__panel') as HTMLElement;
    expectRemValue(panel.style.width, 10 * PANEL_WALL_SCALE);
    expectRemValue(panel.style.height, getModuleHeightForStandard(THREE_U_STANDARD) * PANEL_WALL_SCALE);
  });

  it('uses the selected standard height for 1U modules', () => {
    component.modules = [
      buildModule({id: 1, hp: 14, standard: INTELLIJEL_STANDARD})
    ];

    fixture.detectChanges();

    const panel = fixture.nativeElement.querySelector('.module-panel-wall__panel') as HTMLElement;
    expectRemValue(panel.style.width, 14 * PANEL_WALL_SCALE);
    expectRemValue(panel.style.height, getModuleHeightForStandard(INTELLIJEL_STANDARD) * PANEL_WALL_SCALE);
  });

  it('renders a neutral placeholder for modules without panel images', () => {
    component.modules = [
      buildModule({id: 1, name: 'Panel-less Module', panels: []})
    ];

    fixture.detectChanges();

    const placeholder = fixture.nativeElement.querySelector('.module-panel-wall__placeholder') as HTMLElement;
    expect(placeholder).not.toBeNull();
    expect(placeholder.textContent).toContain('Panel-less Module');
    expect(placeholder.textContent).toContain('10 HP');
  });

  it('renders a caption under each panel', () => {
    component.modules = [
      buildModule({id: 1, name: 'Mimeophon'})
    ];

    fixture.detectChanges();

    const caption = fixture.nativeElement.querySelector('.module-panel-wall__caption') as HTMLElement;
    expect(caption.textContent?.trim()).toBe('Mimeophon');
  });

  it('can render as a nowrap horizontal wall for row strips', () => {
    component.modules = [buildModule()];
    component.wrap = false;

    fixture.detectChanges();

    const wall = fixture.nativeElement.querySelector('.module-panel-wall') as HTMLElement;
    expect(wall.classList).toContain('module-panel-wall--nowrap');
  });

  function expectRemValue(actual: string, expected: number): void {
    expect(actual.endsWith('rem')).toBeTrue();
    expect(parseFloat(actual)).toBeCloseTo(expected, 4);
  }
});
