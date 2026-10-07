import { Component, EventEmitter } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
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

  describe('solid theme', () => {
    it('accepts "solid" theme', () => {
      const comp = makeComp();
      comp.theme = 'solid';
      expect(comp.theme).toBe('solid');
    });
  });

  describe('plain links (href)', () => {
    it('href and target default to undefined', () => {
      const comp = makeComp();
      expect(comp.href).toBeUndefined();
      expect(comp.target).toBeUndefined();
    });

    it('adds noopener noreferrer only for new-tab links', () => {
      const comp = makeComp();
      expect(comp.linkRel).toBeNull();
      comp.target = '_self';
      expect(comp.linkRel).toBeNull();
      comp.target = '_blank';
      expect(comp.linkRel).toBe('noopener noreferrer');
    });
  });

  describe('rendering', () => {
    @Component({
      standalone: true,
      imports: [BrandPrimaryButtonComponent],
      template: `
        <app-brand-primary-button id="router" routerLink="/somewhere" icon="add" theme="solid" (click$)="clicks = clicks + 1">Go</app-brand-primary-button>
        <app-brand-primary-button id="external" href="https://example.com/docs" target="_blank" icon="north_east">Docs</app-brand-primary-button>
        <app-brand-primary-button id="anchor" href="#switch">Jump</app-brand-primary-button>
        <app-brand-primary-button id="off" href="https://example.com" [disabled]="true">Off</app-brand-primary-button>
      `
    })
    class HostComponent {
      clicks = 0;
    }

    const anchorIn = (host: HTMLElement, id: string) => host.querySelector<HTMLAnchorElement>(`#${id} a`);

    beforeEach(() => {
      TestBed.configureTestingModule({imports: [HostComponent], providers: [provideRouter([])]});
    });

    it('keeps router links, the icon slot, the theme class and click$ working', () => {
      const fixture = TestBed.createComponent(HostComponent);
      fixture.detectChanges();
      const anchor = anchorIn(fixture.nativeElement, 'router');

      expect(anchor?.getAttribute('href')).toBe('/somewhere');
      expect(anchor?.classList).toContain('solid');
      expect(anchor?.querySelector('mat-icon')?.textContent).toContain('add');
      expect(anchor?.textContent).toContain('Go');

      anchor?.click();
      expect(fixture.componentInstance.clicks).toBe(1);
    });

    it('renders external links with target and a safe rel', () => {
      const fixture = TestBed.createComponent(HostComponent);
      fixture.detectChanges();
      const anchor = anchorIn(fixture.nativeElement, 'external');

      expect(anchor?.getAttribute('href')).toBe('https://example.com/docs');
      expect(anchor?.getAttribute('target')).toBe('_blank');
      expect(anchor?.getAttribute('rel')).toBe('noopener noreferrer');
      expect(anchor?.querySelector('mat-icon')?.textContent).toContain('north_east');
      expect(anchor?.textContent).toContain('Docs');
    });

    it('renders in-page anchors without target or rel', () => {
      const fixture = TestBed.createComponent(HostComponent);
      fixture.detectChanges();
      const anchor = anchorIn(fixture.nativeElement, 'anchor');

      expect(anchor?.getAttribute('href')).toBe('#switch');
      expect(anchor?.hasAttribute('target')).toBeFalse();
      expect(anchor?.hasAttribute('rel')).toBeFalse();
    });

    it('drops the href when disabled', () => {
      const fixture = TestBed.createComponent(HostComponent);
      fixture.detectChanges();

      expect(anchorIn(fixture.nativeElement, 'off')?.hasAttribute('href')).toBeFalse();
    });
  });
});
