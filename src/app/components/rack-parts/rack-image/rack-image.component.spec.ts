import { ChangeDetectorRef } from '@angular/core';
import { RackImageComponent } from './rack-image.component';
import { Rack } from 'src/app/models/rack';

function mockCdr(): ChangeDetectorRef {
  return { detectChanges: jasmine.createSpy('detectChanges') } as unknown as ChangeDetectorRef;
}

function makeRack(image?: string): Rack {
  return {
    id: 1,
    name: 'Test Rack',
    hp: 84,
    rows: 3,
    image,
    locked: false,
    public: true,
    created: '2024-01-01',
    updated: '2024-01-01',
    author: { id: 'u1', username: 'tester', avatar_url: null }
  } as unknown as Rack;
}

describe('RackImageComponent', () => {
  let cdr: ChangeDetectorRef;

  beforeEach(() => {
    cdr = mockCdr();
  });

  describe('construction', () => {
    it('creates without error', () => {
      expect(() => new RackImageComponent(cdr)).not.toThrow();
    });

    it('containImage defaults to true', () => {
      const comp = new RackImageComponent(cdr);
      expect(comp.containImage).toBeTrue();
    });

    it('sizeDivider defaults to 1.5', () => {
      expect(new RackImageComponent(cdr).sizeDivider).toBe(1.5);
    });

    it('filename is initially undefined', () => {
      expect(new RackImageComponent(cdr).filename).toBeUndefined();
    });
  });

  describe('ngOnInit', () => {
    it('sets filename from data.image when present', () => {
      const comp = new RackImageComponent(cdr);
      comp.data = makeRack('my-image.jpg');
      comp.ngOnInit();
      expect(comp.filename).toBe('my-image.jpg');
    });

    it('sets filename to undefined when data.image is absent', () => {
      const comp = new RackImageComponent(cdr);
      comp.data = makeRack(undefined);
      comp.ngOnInit();
      expect(comp.filename).toBeUndefined();
    });

    it('calls detectChanges', () => {
      const comp = new RackImageComponent(cdr);
      comp.data = makeRack();
      comp.ngOnInit();
      expect(cdr.detectChanges).toHaveBeenCalled();
    });
  });

  describe('ngOnChanges', () => {
    it('sets filename from data.image when present', () => {
      const comp = new RackImageComponent(cdr);
      comp.data = makeRack('changed.jpg');
      comp.ngOnChanges();
      expect(comp.filename).toBe('changed.jpg');
    });

    it('sets filename to undefined when data.image is absent', () => {
      const comp = new RackImageComponent(cdr);
      comp.data = makeRack(undefined);
      comp.ngOnChanges();
      expect(comp.filename).toBeUndefined();
    });
  });
});
