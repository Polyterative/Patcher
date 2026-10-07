import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  SegmentedControlComponent,
  SegmentedControlKind,
  SegmentedControlOption
} from './segmented-control.component';

const OPTIONS: SegmentedControlOption[] = [
  {id: 'a', label: 'Alpha', icon: 'inventory_2'},
  {id: 'b', label: 'Beta'},
  {id: 'c', label: 'Gamma'}
];

@Component({
  standalone: true,
  imports: [SegmentedControlComponent],
  template: `
    <app-segmented-control [options]="options"
                           [kind]="kind"
                           [value]="value"
                           idPrefix="demo"
                           ariaLabel="Demo control"
                           (valueChange)="value = $event"
    ></app-segmented-control>
  `
})
class HostComponent {
  options = OPTIONS;
  kind: SegmentedControlKind = 'toggle';
  value: string | undefined = 'a';
}

describe('SegmentedControlComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HTMLElement;

  const buttons = () => Array.from(host.querySelectorAll<HTMLButtonElement>('button'));
  const press = (target: HTMLElement, key: string) => {
    target.dispatchEvent(new KeyboardEvent('keydown', {key, bubbles: true}));
    fixture.detectChanges();
  };
  const render = (kind: SegmentedControlKind, value: string | undefined = 'a') => {
    fixture.componentInstance.kind = kind;
    fixture.componentInstance.value = value;
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.configureTestingModule({imports: [HostComponent]});
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.nativeElement as HTMLElement;
  });

  describe('toggle', () => {
    beforeEach(() => render('toggle'));

    it('renders a labelled group of buttons with aria-pressed', () => {
      const group = host.querySelector('.segmented');
      expect(group?.getAttribute('role')).toBe('group');
      expect(group?.getAttribute('aria-label')).toBe('Demo control');
      expect(buttons().map(b => b.getAttribute('aria-pressed'))).toEqual(['true', 'false', 'false']);
      expect(buttons()[0].hasAttribute('role')).toBeFalse();
      expect(buttons()[0].hasAttribute('aria-selected')).toBeFalse();
    });

    it('renders the optional icon', () => {
      expect(buttons()[0].querySelector('mat-icon')?.textContent).toContain('inventory_2');
      expect(buttons()[1].querySelector('mat-icon')).toBeNull();
    });

    it('emits the clicked id but stays silent for the current value', () => {
      buttons()[0].click();
      expect(fixture.componentInstance.value).toBe('a');

      buttons()[2].click();
      fixture.detectChanges();
      expect(fixture.componentInstance.value).toBe('c');
      expect(buttons().map(b => b.getAttribute('aria-pressed'))).toEqual(['false', 'false', 'true']);
    });

    it('ignores arrow keys, leaving them to normal focus handling', () => {
      press(buttons()[0], 'ArrowRight');
      expect(fixture.componentInstance.value).toBe('a');
    });
  });

  describe('tabs', () => {
    beforeEach(() => render('tabs'));

    it('renders a tablist with linked tab ids, aria-selected and a roving tabindex', () => {
      expect(host.querySelector('.segmented')?.getAttribute('role')).toBe('tablist');
      expect(buttons().map(b => b.getAttribute('role'))).toEqual(['tab', 'tab', 'tab']);
      expect(buttons().map(b => b.id)).toEqual(['demo-tab-a', 'demo-tab-b', 'demo-tab-c']);
      expect(buttons().map(b => b.getAttribute('aria-controls'))).toEqual(['demo-panel-a', 'demo-panel-b', 'demo-panel-c']);
      expect(buttons().map(b => b.getAttribute('aria-selected'))).toEqual(['true', 'false', 'false']);
      expect(buttons().map(b => b.getAttribute('tabindex'))).toEqual(['0', '-1', '-1']);
      expect(buttons()[0].hasAttribute('aria-pressed')).toBeFalse();
    });

    it('selects the first tab when no value is given', () => {
      render('tabs', undefined);
      expect(buttons()[0].getAttribute('aria-selected')).toBe('true');
    });

    it('supports arrow, Home and End keys with wrap-around and moves focus', () => {
      press(buttons()[0], 'ArrowLeft');
      expect(fixture.componentInstance.value).toBe('c');
      expect(document.activeElement).toBe(buttons()[2]);

      press(buttons()[2], 'ArrowRight');
      expect(fixture.componentInstance.value).toBe('a');

      press(buttons()[0], 'End');
      expect(fixture.componentInstance.value).toBe('c');

      press(buttons()[2], 'Home');
      expect(fixture.componentInstance.value).toBe('a');
    });

    it('does not swallow unrelated keys', () => {
      const event = new KeyboardEvent('keydown', {key: 'Tab', bubbles: true, cancelable: true});
      buttons()[0].dispatchEvent(event);
      expect(event.defaultPrevented).toBeFalse();
      expect(fixture.componentInstance.value).toBe('a');
    });
  });
});
