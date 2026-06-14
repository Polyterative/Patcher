import { ChangeDetectorRef } from '@angular/core';
import {
  isPreviewStale,
  previewGeneratedAt,
  RackImageComponent
} from './rack-image.component';
import { Rack } from 'src/app/models/rack';

function mockCdr(): ChangeDetectorRef {
  return { detectChanges: jasmine.createSpy('detectChanges') } as unknown as ChangeDetectorRef;
}

function makeRack(image?: string, updated = '2024-01-01'): Rack {
  return {
    id: 1,
    name: 'Test Rack',
    hp: 84,
    rows: 3,
    image,
    locked: false,
    public: true,
    created: '2024-01-01',
    updated,
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

    it('imageLoadFailed defaults to false', () => {
      expect(new RackImageComponent(cdr).imageLoadFailed).toBeFalse();
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

    it('clears failed state when the image filename changes', () => {
      const comp = new RackImageComponent(cdr);
      comp.data = makeRack('old.jpg');
      comp.ngOnChanges();
      comp.onPreviewLoadError();

      comp.data = makeRack('new.jpg');
      comp.ngOnChanges();

      expect(comp.imageLoadFailed).toBeFalse();
    });
  });

  describe('onPreviewLoadError', () => {
    it('marks the preview as failed', () => {
      const comp = new RackImageComponent(cdr);
      comp.onPreviewLoadError();
      expect(comp.imageLoadFailed).toBeTrue();
    });
  });

  describe('preview stale helpers', () => {
    it('parses the timestamp encoded in a rack preview filename', () => {
      const generatedAt = previewGeneratedAt('336_2026-05-1509-54-15073.jpeg');

      expect(generatedAt?.getFullYear()).toBe(2026);
      expect(generatedAt?.getMonth()).toBe(4);
      expect(generatedAt?.getDate()).toBe(15);
      expect(generatedAt?.getHours()).toBe(9);
      expect(generatedAt?.getMinutes()).toBe(54);
      expect(generatedAt?.getSeconds()).toBe(15);
      expect(generatedAt?.getMilliseconds()).toBe(73);
    });

    it('marks a preview as stale when rack.updated is newer than the encoded image timestamp', () => {
      expect(isPreviewStale(makeRack('336_2026-05-1509-54-15073.jpeg', '2026-05-15T10:00:00'))).toBeTrue();
    });

    it('keeps a preview fresh when the image timestamp is newer than rack.updated', () => {
      expect(isPreviewStale(makeRack('336_2026-05-1509-54-15073.jpeg', '2026-05-15T09:30:00'))).toBeFalse();
    });

    it('returns false for missing or unparseable preview filenames', () => {
      expect(isPreviewStale(makeRack(undefined, '2026-05-15T10:00:00'))).toBeFalse();
      expect(isPreviewStale(makeRack('legacy-preview.jpeg', '2026-05-15T10:00:00'))).toBeFalse();
    });
  });
});
