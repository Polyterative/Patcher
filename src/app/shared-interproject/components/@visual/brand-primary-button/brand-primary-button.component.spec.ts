import { EventEmitter } from '@angular/core';
import { BrandPrimaryButtonComponent } from './brand-primary-button.component';

function makeComp(): BrandPrimaryButtonComponent {
  return new BrandPrimaryButtonComponent();
}

describe('BrandPrimaryButtonComponent', () => {
  describe('default inputs', () => {
    it('disabled defaults to false', () => {
      expect(makeComp().disabled).toBeFalse();
    });

    it('error defaults to false', () => {
      expect(makeComp().error).toBeFalse();
    });

    it('theme defaults to "primary"', () => {
      expect(makeComp().theme).toBe('primary');
    });

    it('click$ is an EventEmitter', () => {
      expect(makeComp().click$).toBeInstanceOf(EventEmitter);
    });

    it('innerFlex defaults to undefined', () => {
      expect(makeComp().innerFlex).toBeUndefined();
    });

    it('routerLink defaults to undefined', () => {
      expect(makeComp().routerLink).toBeUndefined();
    });

    it('autoFocus defaults to false', () => {
      expect(makeComp().autoFocus).toBeFalse();
    });

    it('icon defaults to undefined', () => {
      expect(makeComp().icon).toBeUndefined();
    });

    it('tooltip defaults to empty string', () => {
      expect(makeComp().tooltip).toBe('');
    });

    it('tooltipPosition defaults to "above"', () => {
      expect(makeComp().tooltipPosition).toBe('above');
    });
  });

  describe('doNothing', () => {
    it('is callable without error', () => {
      expect(() => makeComp().doNothing()).not.toThrow();
    });
  });

  describe('theme variants', () => {
    it('accepts "warning" theme', () => {
      const comp = makeComp();
      comp.theme = 'warning';
      expect(comp.theme).toBe('warning');
    });

    it('accepts "positive" theme', () => {
      const comp = makeComp();
      comp.theme = 'positive';
      expect(comp.theme).toBe('positive');
    });

    it('accepts "negative" theme', () => {
      const comp = makeComp();
      comp.theme = 'negative';
      expect(comp.theme).toBe('negative');
    });

    it('accepts "light" theme', () => {
      const comp = makeComp();
      comp.theme = 'light';
      expect(comp.theme).toBe('light');
    });
  });
});
