import { ChangeDetectorRef } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FileDragHostComponent } from './file-drag-host.component';
import { FileDragHostService, FileDragHostAddEvent } from './file-drag-host.service';

function makeServiceMock(): FileDragHostService {
  const snackBar = jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']);
  return new FileDragHostService(snackBar);
}

function makeCdrMock(): jasmine.SpyObj<ChangeDetectorRef> {
  return jasmine.createSpyObj<ChangeDetectorRef>('ChangeDetectorRef', [
    'detectChanges',
    'markForCheck',
    'detach',
    'reattach'
  ]);
}

function makeComp(service = makeServiceMock(), cdr = makeCdrMock()): FileDragHostComponent {
  return new FileDragHostComponent(service, cdr);
}

function setMultipleFilesMode(comp: FileDragHostComponent, multipleFilesMode: boolean): void {
  Object.defineProperty(comp, 'multipleFilesMode', {
    configurable: true,
    value: multipleFilesMode
  });
}

function makeFileAddEvent(): FileDragHostAddEvent {
  return {
    addedFiles: [],
    rejectedFiles: []
  };
}

describe('FileDragHostComponent', () => {
  describe('construction', () => {
    it('creates without error', () => {
      expect(() => makeComp()).not.toThrow();
    });

    it('isImageOnlyMode defaults to false', () => {
      expect(makeComp().isImageOnlyMode).toBeFalse();
    });
  });

  describe('openFilePicker', () => {
    it('opens the native file picker from keyboard activation', () => {
      const comp = makeComp();
      const input = document.createElement('input');
      spyOn(input, 'click');
      const event = jasmine.createSpyObj<Event>('event', ['preventDefault', 'stopPropagation']);

      comp.openFilePicker(input, event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(event.stopPropagation).toHaveBeenCalled();
      expect(input.click).toHaveBeenCalled();
    });
  });

  describe('ngOnInit — singleFileMode', () => {
    it('sets singleFileMode$ to true when multipleFilesMode is falsy', () => {
      const service = makeServiceMock();
      const comp = makeComp(service);
      const singleFileModeSpy = spyOn(service.singleFileMode$, 'next');
      setMultipleFilesMode(comp, false);
      comp.ngOnInit();
      expect(singleFileModeSpy).toHaveBeenCalledWith(true);
    });

    it('sets singleFileMode$ to false when multipleFilesMode is true', () => {
      const service = makeServiceMock();
      const comp = makeComp(service);
      const singleFileModeSpy = spyOn(service.singleFileMode$, 'next');
      setMultipleFilesMode(comp, true);
      comp.ngOnInit();
      expect(singleFileModeSpy).toHaveBeenCalledWith(false);
    });
  });

  describe('ngOnInit — detectChanges on service events', () => {
    beforeEach(() => {
      // jasmine.clock().install();
    });

    it('calls detectChanges after files$ emits (with fakeAsync)', (done) => {
      const service = makeServiceMock();
      const cdr = makeCdrMock();
      const comp = makeComp(service, cdr);
      comp.ngOnInit();

      service.files$.next([]);
      // debounceTime(50) — use setTimeout to allow microtask queue to flush
      setTimeout(() => {
        expect(cdr.detectChanges).toHaveBeenCalled();
        done();
      }, 100);
    });

    it('calls detectChanges after fileAdd$ emits', (done) => {
      const service = makeServiceMock();
      const cdr = makeCdrMock();
      const comp = makeComp(service, cdr);
      comp.ngOnInit();

      service.fileAdd$.next(makeFileAddEvent());
      setTimeout(() => {
        expect(cdr.detectChanges).toHaveBeenCalled();
        done();
      }, 100);
    });

    it('calls detectChanges after removeAllFiles$ emits', (done) => {
      const service = makeServiceMock();
      const cdr = makeCdrMock();
      const comp = makeComp(service, cdr);
      comp.ngOnInit();

      service.removeAllFiles$.next();
      setTimeout(() => {
        expect(cdr.detectChanges).toHaveBeenCalled();
        done();
      }, 100);
    });
  });

  describe('ngOnDestroy', () => {
    it('stops calling detectChanges after destroy', (done) => {
      const service = makeServiceMock();
      const cdr = makeCdrMock();
      const comp = makeComp(service, cdr);
      comp.ngOnInit();
      comp.ngOnDestroy();

      service.files$.next([]);
      setTimeout(() => {
        expect(cdr.detectChanges).not.toHaveBeenCalled();
        done();
      }, 100);
    });
  });
});
