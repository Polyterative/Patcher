import { Component } from '@angular/core';
import { UntypedFormControl } from '@angular/forms';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { FormTypes } from './form-element-models';
import { IMatFormEntityConfig, MatFormEntityComponent } from './mat-form-entity.component';


@Component({
  standalone: true,
  imports: [MatFormEntityComponent],
  template: `
    <lib-mat-form-entity
      [dataPack]="firstField"
    ></lib-mat-form-entity>

    <lib-mat-form-entity
      [dataPack]="secondField"
      (enterPressed)="handleDoneEnter()"
    ></lib-mat-form-entity>

    <lib-mat-form-entity
      [dataPack]="searchField"
    ></lib-mat-form-entity>
  `
})
class HostComponent {
  doneEnterCount = 0;

  readonly firstField: IMatFormEntityConfig = {
    type: FormTypes.TEXT,
    control: new UntypedFormControl(''),
    label: 'First',
    code: 'first',
    flex: '100%',
    ergonomics: {
      autofocus: true,
      enterkeyhint: 'next',
      inputmode: 'search'
    }
  };

  readonly secondField: IMatFormEntityConfig = {
    type: FormTypes.TEXT,
    control: new UntypedFormControl(''),
    label: 'Second',
    code: 'second',
    flex: '100%',
    ergonomics: {
      enterkeyhint: 'done'
    }
  };

  readonly searchField: IMatFormEntityConfig = {
    type: FormTypes.TEXT,
    control: new UntypedFormControl(''),
    label: 'Search',
    code: 'search',
    flex: '100%',
    iconL1: 'search'
  };

  handleDoneEnter(): void {
    this.doneEnterCount += 1;
  }
}

describe('MatFormEntityComponent ergonomics', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent, NoopAnimationsModule]
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('applies data-pack ergonomics attributes to the rendered input', () => {
    const firstInput = getRenderedInputs()[0];
    const firstComponent = fixture.debugElement.queryAll(By.directive(MatFormEntityComponent))[0].componentInstance as MatFormEntityComponent;

    expect(firstComponent.autofocus).toBe(true);
    expect(firstInput.getAttribute('inputmode')).toBe('search');
    expect(firstInput.getAttribute('enterkeyhint')).toBe('next');
  });

  it('moves focus to the next field when enterkeyhint is next', () => {
    const [firstInput, secondInput] = getRenderedInputs();

    firstInput.focus();
    firstInput.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true
    }));
    fixture.detectChanges();

    expect(document.activeElement).toBe(secondInput);
    expect(host.doneEnterCount).toBe(0);
  });

  it('emits enterPressed for non-next fields', () => {
    const [, secondInput] = getRenderedInputs();

    secondInput.focus();
    secondInput.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true
    }));
    fixture.detectChanges();

    expect(host.doneEnterCount).toBe(1);
  });

  it('defaults search fields to search keyboard ergonomics', () => {
    const searchInput = getRenderedInputs()[2];

    expect(searchInput.getAttribute('inputmode')).toBe('search');
    expect(searchInput.getAttribute('enterkeyhint')).toBe('search');
  });

  function getRenderedInputs(): HTMLInputElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('input')) as HTMLInputElement[];
  }
});
