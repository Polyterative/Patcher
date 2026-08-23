/**
 * CVA (ControlValueAccessor) DOM integration regression spec.
 *
 * WHY THESE TESTS EXIST — do not delete as "redundant":
 * In v6.5.0–v6.5.1 the production bundle shipped TWO copies of
 * @angular/forms (duplicate peer-qualified instances after the pnpm 9→10
 * lockfile migration; fixed in v6.5.2 by `pnpm dedupe`, commit a3f82fae).
 * Two copies mean two distinct NG_VALUE_ACCESSOR InjectionToken objects:
 * Material's ControlValueAccessors (MatAutocompleteTrigger, MatSelect)
 * registered under one token while [formControl] injected the other, so UI
 * selections silently never reached the FormControl — the module-add form
 * kept its `notInOptions` error and submit stayed disabled forever.
 *
 * Regular unit specs missed it because they drive controls programmatically
 * via setValue(), which bypasses the CVA registration entirely. These tests
 * drive Material controls through REAL DOM interaction and assert the value
 * actually lands in the FormControl, plus directly assert the accessor
 * identity (test C) — the most direct canary for a split-DI-token state.
 *
 * TestBed quirks applied here (learned while reproducing the bug):
 * - synthetic input/keydown events need {bubbles: true} or the
 *   MatAutocompleteTrigger handlers never fire;
 * - the TestBed-injected OverlayContainer is NOT the instance actually used,
 *   so overlay content must be queried via document.querySelectorAll(...).
 */
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { NgControl, UntypedFormControl } from '@angular/forms';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { BehaviorSubject } from 'rxjs';
import { FormTypes } from './form-element-models';
import { IMatFormEntityConfig, MatFormEntityComponent } from './mat-form-entity.component';


@Component({
  standalone: true,
  imports: [MatFormEntityComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <lib-mat-form-entity
      [dataPack]="autocompleteField"
    ></lib-mat-form-entity>

    <lib-mat-form-entity
      [control]="selectControl"
      [type]="types.SELECT"
      [options$]="selectOptions$"
      label="Standard"
    ></lib-mat-form-entity>
  `
})
class CvaHostComponent {
  readonly types = FormTypes;
  readonly options = [
    {id: '1', name: 'Studio Rack'},
    {id: '2', name: 'Live Case'}
  ];
  readonly selectControl = new UntypedFormControl('');
  readonly selectOptions$ = new BehaviorSubject(this.options);

  readonly autocompleteField: IMatFormEntityConfig = {
    type: FormTypes.AUTOCOMPLETE,
    control: new UntypedFormControl(''),
    label: 'Module',
    code: 'module',
    flex: '100%',
    options$: new BehaviorSubject(this.options)
  };
}

describe('MatFormEntityComponent CVA integration (v6.5.2 duplicate-forms regression guard)', () => {
  let fixture: ComponentFixture<CvaHostComponent>;
  let host: CvaHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CvaHostComponent, NoopAnimationsModule]
    }).compileComponents();

    fixture = TestBed.createComponent(CvaHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    // The overlay container actually used is document-level, not the
    // TestBed-injected instance — remove it manually between tests.
    document.querySelectorAll('.cdk-overlay-container').forEach(el => el.remove());
  });

  function getAutocompleteInput(): HTMLInputElement {
    return fixture.nativeElement.querySelector('input[type="text"]') as HTMLInputElement;
  }

  function getOverlayOptions(): HTMLElement[] {
    return Array.from(document.querySelectorAll('mat-option')) as HTMLElement[];
  }

  async function settle(waitMs = 0): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    // flush the 200ms options-filter debounce, the async strict-autocomplete
    // validator, and overlay scheduling
    await new Promise(resolve => setTimeout(resolve, waitMs));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('A: typing + clicking an autocomplete option lands the option OBJECT in the FormControl and validates', async () => {
    const input = getAutocompleteInput();
    const control = host.autocompleteField.control;

    input.focus();
    input.dispatchEvent(new Event('focusin', {bubbles: true}));
    input.value = 'Stu';
    input.dispatchEvent(new Event('input', {bubbles: true}));
    await settle(300);

    const options = getOverlayOptions();
    expect(options.length).withContext('autocomplete overlay should show filtered options').toBeGreaterThan(0);
    const studio = options.find(option => option.textContent?.includes('Studio Rack'));
    expect(studio).withContext('Studio Rack should be among the filtered options').toBeDefined();

    studio.click();
    await settle(300);

    // The CVA must deliver the selected OPTION OBJECT, not the typed string.
    expect(control.value).toEqual({id: '1', name: 'Studio Rack'});
    expect(control.valid)
      .withContext('strict autocomplete validator must accept a real option (no notInOptions)')
      .toBe(true);
  });

  it('B: opening the mat-select and clicking an option updates the FormControl value and dirty state', async () => {
    const selectTrigger = fixture.nativeElement.querySelector('mat-select') as HTMLElement;
    expect(selectTrigger).withContext('mat-select should render').toBeTruthy();

    selectTrigger.click();
    await settle();

    const liveCase = getOverlayOptions().find(option => option.textContent?.includes('Live Case'));
    expect(liveCase).withContext('select overlay should contain the Live Case option').toBeDefined();

    liveCase.click();
    await settle();

    expect(host.selectControl.value).toEqual({id: '2', name: 'Live Case'});
    expect(host.selectControl.valid).toBe(true);
    expect(host.selectControl.dirty)
      .withContext('a UI-driven selection must mark the control dirty')
      .toBe(true);
  });

  it('C: the autocomplete input NgControl valueAccessor is MatAutocompleteTrigger (accessor identity canary)', () => {
    // With duplicate @angular/forms instances, Material CVAs register on the
    // wrong NG_VALUE_ACCESSOR token and [formControl] falls back to
    // DefaultValueAccessor — this assertion fails in exactly that state.
    const inputDebug = fixture.debugElement.query(By.css('input[type="text"]'));
    const ngControl = inputDebug.injector.get(NgControl);

    expect(ngControl.valueAccessor instanceof MatAutocompleteTrigger)
      .withContext('valueAccessor must be MatAutocompleteTrigger, not DefaultValueAccessor')
      .toBe(true);
  });

  it('D: typing a full option name then blurring away WITHOUT clicking auto-resolves to the option OBJECT (regression: manufacturer filter silently skipped)', async () => {
    const input = getAutocompleteInput();
    const control = host.autocompleteField.control;

    input.focus();
    input.dispatchEvent(new Event('focusin', {bubbles: true}));
    input.value = 'Studio Rack';
    input.dispatchEvent(new Event('input', {bubbles: true}));
    await settle(300);

    // Blur away WITHOUT clicking a mat-option - this is exactly what happened
    // in the reported bug: the control is left holding the raw typed string.
    input.dispatchEvent(new Event('blur', {bubbles: true}));
    await settle(300);

    expect(control.value)
      .withContext('an exact typed match must auto-resolve to the option OBJECT on blur, not stay a raw string')
      .toEqual({id: '1', name: 'Studio Rack'});
    expect(control.valid)
      .withContext('once resolved to a real option, the strict autocomplete validator must pass')
      .toBe(true);
  });

  it('E: typing an unmatched string then blurring away clears the control instead of leaving a stray string', async () => {
    const input = getAutocompleteInput();
    const control = host.autocompleteField.control;

    input.focus();
    input.dispatchEvent(new Event('focusin', {bubbles: true}));
    input.value = 'Not A Real Option';
    input.dispatchEvent(new Event('input', {bubbles: true}));
    await settle(300);

    input.dispatchEvent(new Event('blur', {bubbles: true}));
    await settle(300);

    expect(control.value)
      .withContext('an unmatched typed value must be cleared on blur, never silently skipped downstream as NaN/empty-filter')
      .toBe('');
  });
});
