import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { CVConnectionEntity } from 'src/app/models/cv';
import { SelectionPanelBridgeService } from '../selection-panel-bridge.service';
import { SelectionPanelOutletComponent } from './selection-panel-outlet.component';
import { minimalModuleFixture } from '../patch-graph/patch-graph-test-fixtures';


function mockBridge(): SelectionPanelBridgeService {
  return new SelectionPanelBridgeService();
}

function makeEntity(cvId: number, moduleId: number, kind: 'in' | 'out'): CVConnectionEntity {
  return {
    kind,
    cv: {
      id: cvId,
      name: kind === 'out' ? 'OUT' : 'IN',
      module: minimalModuleFixture(moduleId),
      instance_id: moduleId * 100
    }
  };
}

describe('SelectionPanelOutletComponent', () => {
  it('creates without error (constructor only)', () => {
    expect(() => new SelectionPanelOutletComponent(mockBridge())).not.toThrow();
  });
  
  it('exposes bridge service', () => {
    const bridge = mockBridge();
    const comp = new SelectionPanelOutletComponent(bridge);
    expect(comp.bridge).toBe(bridge);
  });
});


describe('SelectionPanelOutletComponent — rendered template', () => {
  let bridge: SelectionPanelBridgeService;
  let fixture: ComponentFixture<SelectionPanelOutletComponent>;
  
  beforeEach(async () => {
    bridge = mockBridge();
    // Override the component's imports so we don't need to construct the entire
    // module-minimal / module-cvitem dependency tree. We only care that the
    // panel template renders <app-patch-connection-minimal> when both sides
    // are selected (regression guard for the "header-only panel" bug).
    TestBed.configureTestingModule({
      imports: [NoopAnimationsModule, SelectionPanelOutletComponent],
      providers: [{provide: SelectionPanelBridgeService, useValue: bridge}],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    });
    TestBed.overrideComponent(SelectionPanelOutletComponent, {
      set: {imports: [CommonModule], schemas: [CUSTOM_ELEMENTS_SCHEMA]}
    });
    await TestBed.compileComponents();
    fixture = TestBed.createComponent(SelectionPanelOutletComponent);
    fixture.detectChanges();
  });
  
  it('renders nothing when no CV is selected', () => {
    expect(fixture.nativeElement.querySelector('.panel-card')).toBeNull();
  });
  
  it('shows the panel header and hint when only side A is selected', () => {
    bridge.selectionState$.next({a: makeEntity(7, 1, 'out'), b: null});
    fixture.detectChanges();
    
    const card = fixture.nativeElement.querySelector('.panel-card');
    expect(card).not.toBeNull();
    expect(card.querySelector('.panel-title')?.textContent?.toLowerCase()).toContain('your selection');
    expect(card.querySelector('.panel-hint')).not.toBeNull();
    // No connection-minimal yet — only one side.
    expect(card.querySelector('app-patch-connection-minimal')).toBeNull();
  });
  
  it('renders the patch-connection-minimal preview when both sides are selected', () => {
    bridge.selectionState$.next({
      a: makeEntity(7, 1, 'out'),
      b: makeEntity(42, 2, 'in')
    });
    fixture.detectChanges();
    
    const card = fixture.nativeElement.querySelector('.panel-card');
    expect(card).not.toBeNull();
    
    // The body MUST render the connection-minimal component.
    // Regression guard: if PatchConnectionModule isn't imported (or
    // patch-connection-minimal is broken), the panel header shows but
    // the body is empty — exactly the bug the user is reporting.
    const minimal = card.querySelector('app-patch-connection-minimal');
    expect(minimal)
      .withContext('app-patch-connection-minimal must render when both A and B are selected')
      .not.toBeNull();
  });
});
