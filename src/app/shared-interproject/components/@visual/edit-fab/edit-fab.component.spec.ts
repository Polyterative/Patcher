import { EventEmitter } from '@angular/core';
import { of } from 'rxjs';
import { EditFabComponent } from './edit-fab.component';

function makeComp(): EditFabComponent {
  return new EditFabComponent();
}

describe('EditFabComponent', () => {
  describe('default inputs', () => {
    it('hasPendingChanges$ defaults to of(false)', (done) => {
      const comp = makeComp();
      comp.hasPendingChanges$.subscribe(v => {
        expect(v).toBeFalse();
        done();
      });
    });

    it('openLabel defaults to "Edit"', () => {
      expect(makeComp().openLabel).toBe('Edit');
    });

    it('closeLabel defaults to "Close editor"', () => {
      expect(makeComp().closeLabel).toBe('Close editor');
    });

    it('discardLabel defaults to "Discard changes"', () => {
      expect(makeComp().discardLabel).toBe('Discard changes');
    });

    it('openIcon defaults to "edit"', () => {
      expect(makeComp().openIcon).toBe('edit');
    });

    it('closeIcon defaults to "close"', () => {
      expect(makeComp().closeIcon).toBe('close');
    });

    it('discardIcon defaults to "warning"', () => {
      expect(makeComp().discardIcon).toBe('warning');
    });

    it('toggle$ is an EventEmitter', () => {
      expect(makeComp().toggle$).toBeInstanceOf(EventEmitter);
    });
  });

  describe('bouncing$', () => {
    it('is an Observable (not null/undefined)', () => {
      expect(makeComp().bouncing$).toBeTruthy();
    });
  });

  describe('input overrides', () => {
    it('accepts custom openLabel', () => {
      const comp = makeComp();
      comp.openLabel = 'Customize';
      expect(comp.openLabel).toBe('Customize');
    });

    it('accepts custom editMode$ observable', () => {
      const comp = makeComp();
      comp.editMode$ = of(true);
      expect(comp.editMode$).toBeTruthy();
    });
  });
});
