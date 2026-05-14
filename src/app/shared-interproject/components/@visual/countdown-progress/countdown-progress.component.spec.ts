import { EventEmitter } from '@angular/core';
import { CountdownProgressComponent } from './countdown-progress.component';

function makeComp(): CountdownProgressComponent {
  return new CountdownProgressComponent();
}

describe('CountdownProgressComponent', () => {
  describe('default inputs', () => {
    it('countdown starts as null', () => {
      expect(makeComp().countdown).toBeNull();
    });

    it('progress starts as 0', () => {
      expect(makeComp().progress).toBe(0);
    });

    it('message starts as "Redirecting in"', () => {
      expect(makeComp().message).toBe('Redirecting in');
    });

    it('unitLabel starts as "seconds"', () => {
      expect(makeComp().unitLabel).toBe('seconds');
    });

    it('theme starts as "success"', () => {
      expect(makeComp().theme).toBe('success');
    });

    it('actionButtonLabel starts as undefined', () => {
      expect(makeComp().actionButtonLabel).toBeUndefined();
    });

    it('actionClick$ is an EventEmitter', () => {
      expect(makeComp().actionClick$).toBeInstanceOf(EventEmitter);
    });
  });

  describe('onActionClick', () => {
    it('emits on actionClick$ when called', () => {
      const comp = makeComp();
      let emitted = false;
      comp.actionClick$.subscribe(() => (emitted = true));
      comp.onActionClick();
      expect(emitted).toBeTrue();
    });

    it('can be called multiple times', () => {
      const comp = makeComp();
      let count = 0;
      comp.actionClick$.subscribe(() => count++);
      comp.onActionClick();
      comp.onActionClick();
      comp.onActionClick();
      expect(count).toBe(3);
    });
  });

  describe('ngOnDestroy', () => {
    it('does not throw on destroy', () => {
      const comp = makeComp();
      expect(() => comp.ngOnDestroy()).not.toThrow();
    });
  });

  describe('input assignments', () => {
    it('accepts countdown number', () => {
      const comp = makeComp();
      comp.countdown = 5;
      expect(comp.countdown).toBe(5);
    });

    it('accepts progress percentage', () => {
      const comp = makeComp();
      comp.progress = 75;
      expect(comp.progress).toBe(75);
    });

    it('accepts theme: info', () => {
      const comp = makeComp();
      comp.theme = 'info';
      expect(comp.theme).toBe('info');
    });

    it('accepts theme: warning', () => {
      const comp = makeComp();
      comp.theme = 'warning';
      expect(comp.theme).toBe('warning');
    });
  });
});
