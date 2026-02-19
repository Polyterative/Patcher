import {
  UntypedFormControl,
  Validators
} from '@angular/forms';
import {
  BehaviorSubject,
  combineLatest
} from 'rxjs';
import { startWith } from 'rxjs/operators';
import { ModulePanel } from 'src/app/models/module';


/**
 * Pure-logic tests for the duplicate panel detection feature.
 *
 * The component uses:
 *   - _existingPanelColors$: BehaviorSubject<Set<number>> — populated from data.panels
 *   - panelType.control.valueChanges — the selected panel type { name, value, id }
 *   - panelTypeAlreadyExists$: BehaviorSubject<boolean>
 *   - duplicatePanelTypeName$: BehaviorSubject<string>
 *
 * We replicate the reactive logic here without needing Angular TestBed.
 */

interface PanelTypeOption {
  name: string;
  value: number;
  id: string;
}

const PANEL_OPTIONS: PanelTypeOption[] = [
  {name: 'Light', value: 1, id: '0'},
  {name: 'Dark', value: 2, id: '1'},
  {name: 'Special edition', value: 3, id: '2'},
  {name: 'Limited edition', value: 4, id: '3'}
];

function makePanel(color: number, id = 1): ModulePanel {
  return {moduleid: 100, color, filename: `panel-${ color }.jpg`, description: 'test', id};
}

/** Mimics the component's combineLatest subscription logic. */
function setupDetection(existingPanels: ModulePanel[], initialSelection: PanelTypeOption = PANEL_OPTIONS[0]) {
  const existingColors$ = new BehaviorSubject<Set<number>>(new Set(existingPanels.map(p => p.color)));
  const panelTypeControl = new UntypedFormControl(initialSelection, [Validators.required]);
  const panelTypeAlreadyExists$ = new BehaviorSubject<boolean>(false);
  const duplicatePanelTypeName$ = new BehaviorSubject<string>('');
  
  const sub = combineLatest([
    panelTypeControl.valueChanges.pipe(startWith(panelTypeControl.value)),
    existingColors$
  ]).subscribe(([panelTypeValue, existingColors]) => {
    const selectedColor: number = panelTypeValue?.value;
    const isDuplicate = existingColors.has(selectedColor);
    panelTypeAlreadyExists$.next(isDuplicate);
    duplicatePanelTypeName$.next(isDuplicate ? panelTypeValue?.name ?? '' : '');
  });
  
  return {existingColors$, panelTypeControl, panelTypeAlreadyExists$, duplicatePanelTypeName$, sub};
}


/**
 * Mimics the real component lifecycle where:
 *   1. Constructor: combineLatest subscribes with _existingPanelColors$ = empty Set
 *   2. ngOnInit: _existingPanelColors$ is populated, then eager init sets the BehaviorSubjects directly
 */
function setupDetectionWithDeferredInit(existingPanels: ModulePanel[], initialSelection: PanelTypeOption = PANEL_OPTIONS[0]) {
  // Step 1 — Constructor: colors unknown yet
  const existingColors$ = new BehaviorSubject<Set<number>>(new Set());
  const panelTypeControl = new UntypedFormControl(initialSelection, [Validators.required]);
  const panelTypeAlreadyExists$ = new BehaviorSubject<boolean>(false);
  const duplicatePanelTypeName$ = new BehaviorSubject<string>('');
  
  const sub = combineLatest([
    panelTypeControl.valueChanges.pipe(startWith(panelTypeControl.value)),
    existingColors$
  ]).subscribe(([panelTypeValue, existingColors]) => {
    const selectedColor: number = panelTypeValue?.value;
    const isDuplicate = existingColors.has(selectedColor);
    panelTypeAlreadyExists$.next(isDuplicate);
    duplicatePanelTypeName$.next(isDuplicate ? panelTypeValue?.name ?? '' : '');
  });
  
  // Step 2 — ngOnInit: populate existing colors
  const colorsSet = new Set(existingPanels.map(p => p.color));
  existingColors$.next(colorsSet);
  
  // Step 3 — Eager init (the fix): compute initial duplicate state directly
  const initialColor: number = panelTypeControl.value?.value;
  if (colorsSet.has(initialColor)) {
    panelTypeAlreadyExists$.next(true);
    duplicatePanelTypeName$.next(panelTypeControl.value?.name ?? '');
  }
  
  return {existingColors$, panelTypeControl, panelTypeAlreadyExists$, duplicatePanelTypeName$, sub};
}


describe('Duplicate Panel Detection', () => {
  
  it('should not flag duplicate when module has no panels', () => {
    const {panelTypeAlreadyExists$, sub} = setupDetection([]);
    expect(panelTypeAlreadyExists$.value).toBe(false);
    sub.unsubscribe();
  });
  
  it('should flag duplicate when module already has a Light panel and Light is selected', () => {
    const {panelTypeAlreadyExists$, duplicatePanelTypeName$, sub} = setupDetection(
      [makePanel(1)], // Light panel exists
      PANEL_OPTIONS[0] // Light selected
    );
    expect(panelTypeAlreadyExists$.value).toBe(true);
    expect(duplicatePanelTypeName$.value).toBe('Light');
    sub.unsubscribe();
  });
  
  it('should not flag duplicate when module has a Light panel but Dark is selected', () => {
    const {panelTypeAlreadyExists$, sub} = setupDetection(
      [makePanel(1)], // Light panel exists
      PANEL_OPTIONS[1] // Dark selected
    );
    expect(panelTypeAlreadyExists$.value).toBe(false);
    sub.unsubscribe();
  });
  
  it('should flag duplicate when module has a Dark panel and user switches to Dark', () => {
    const {panelTypeControl, panelTypeAlreadyExists$, duplicatePanelTypeName$, sub} = setupDetection(
      [makePanel(2)], // Dark panel exists
      PANEL_OPTIONS[0] // Light selected initially
    );
    expect(panelTypeAlreadyExists$.value).toBe(false);
    
    panelTypeControl.setValue(PANEL_OPTIONS[1]); // switch to Dark
    expect(panelTypeAlreadyExists$.value).toBe(true);
    expect(duplicatePanelTypeName$.value).toBe('Dark');
    sub.unsubscribe();
  });
  
  it('should clear duplicate flag when user switches away from the duplicate type', () => {
    const {panelTypeControl, panelTypeAlreadyExists$, sub} = setupDetection(
      [makePanel(1)], // Light panel exists
      PANEL_OPTIONS[0] // Light selected — initially duplicate
    );
    expect(panelTypeAlreadyExists$.value).toBe(true);
    
    panelTypeControl.setValue(PANEL_OPTIONS[1]); // switch to Dark
    expect(panelTypeAlreadyExists$.value).toBe(false);
    sub.unsubscribe();
  });
  
  it('should detect duplicate across multiple existing panels', () => {
    const {panelTypeControl, panelTypeAlreadyExists$, sub} = setupDetection(
      [makePanel(1, 1), makePanel(3, 2)], // Light + Special edition exist
      PANEL_OPTIONS[1] // Dark selected — no duplicate
    );
    expect(panelTypeAlreadyExists$.value).toBe(false);
    
    panelTypeControl.setValue(PANEL_OPTIONS[2]); // switch to Special edition
    expect(panelTypeAlreadyExists$.value).toBe(true);
    
    panelTypeControl.setValue(PANEL_OPTIONS[3]); // switch to Limited edition
    expect(panelTypeAlreadyExists$.value).toBe(false);
    
    panelTypeControl.setValue(PANEL_OPTIONS[0]); // switch to Light
    expect(panelTypeAlreadyExists$.value).toBe(true);
    sub.unsubscribe();
  });
  
  it('should handle all four panel types existing', () => {
    const {panelTypeControl, panelTypeAlreadyExists$, sub} = setupDetection(
      [makePanel(1, 1), makePanel(2, 2), makePanel(3, 3), makePanel(4, 4)],
      PANEL_OPTIONS[0]
    );
    // All types exist — every selection should be duplicate
    expect(panelTypeAlreadyExists$.value).toBe(true);
    
    panelTypeControl.setValue(PANEL_OPTIONS[1]);
    expect(panelTypeAlreadyExists$.value).toBe(true);
    
    panelTypeControl.setValue(PANEL_OPTIONS[2]);
    expect(panelTypeAlreadyExists$.value).toBe(true);
    
    panelTypeControl.setValue(PANEL_OPTIONS[3]);
    expect(panelTypeAlreadyExists$.value).toBe(true);
    sub.unsubscribe();
  });
  
  it('should react to existing colors being updated (e.g. after panel deletion)', () => {
    const {existingColors$, panelTypeAlreadyExists$, sub} = setupDetection(
      [makePanel(1)], // Light exists
      PANEL_OPTIONS[0] // Light selected — duplicate
    );
    expect(panelTypeAlreadyExists$.value).toBe(true);
    
    // Simulate panel deletion — Light panel removed
    existingColors$.next(new Set());
    expect(panelTypeAlreadyExists$.value).toBe(false);
    sub.unsubscribe();
  });
  
  it('should set duplicatePanelTypeName$ to empty string when no duplicate', () => {
    const {duplicatePanelTypeName$, sub} = setupDetection([], PANEL_OPTIONS[0]);
    expect(duplicatePanelTypeName$.value).toBe('');
    sub.unsubscribe();
  });
  
  it('should set correct duplicatePanelTypeName$ for Special edition', () => {
    const {panelTypeAlreadyExists$, duplicatePanelTypeName$, sub} = setupDetection(
      [makePanel(3)],
      PANEL_OPTIONS[2] // Special edition
    );
    expect(panelTypeAlreadyExists$.value).toBe(true);
    expect(duplicatePanelTypeName$.value).toBe('Special edition');
    sub.unsubscribe();
  });
  
  // --- Deferred init tests (mimic real component lifecycle) ---
  
  it('(deferred) should flag duplicate on initial load without user interaction', () => {
    const {panelTypeAlreadyExists$, duplicatePanelTypeName$, sub} = setupDetectionWithDeferredInit(
      [makePanel(1)], // Light panel exists
      PANEL_OPTIONS[0] // Light selected by default
    );
    // This is the bug scenario: on first load, the warning must show immediately
    expect(panelTypeAlreadyExists$.value).toBe(true);
    expect(duplicatePanelTypeName$.value).toBe('Light');
    sub.unsubscribe();
  });
  
  it('(deferred) should not flag duplicate on initial load when no panels exist', () => {
    const {panelTypeAlreadyExists$, sub} = setupDetectionWithDeferredInit(
      [], // no panels
      PANEL_OPTIONS[0]
    );
    expect(panelTypeAlreadyExists$.value).toBe(false);
    sub.unsubscribe();
  });
  
  it('(deferred) should not flag duplicate on initial load when a different type exists', () => {
    const {panelTypeAlreadyExists$, sub} = setupDetectionWithDeferredInit(
      [makePanel(2)], // Dark exists
      PANEL_OPTIONS[0] // Light selected
    );
    expect(panelTypeAlreadyExists$.value).toBe(false);
    sub.unsubscribe();
  });
  
  it('(deferred) should still react to user switching types after initial load', () => {
    const {panelTypeControl, panelTypeAlreadyExists$, sub} = setupDetectionWithDeferredInit(
      [makePanel(2)], // Dark exists
      PANEL_OPTIONS[0] // Light selected initially — no duplicate
    );
    expect(panelTypeAlreadyExists$.value).toBe(false);
    
    panelTypeControl.setValue(PANEL_OPTIONS[1]); // switch to Dark
    expect(panelTypeAlreadyExists$.value).toBe(true);
    sub.unsubscribe();
  });
});