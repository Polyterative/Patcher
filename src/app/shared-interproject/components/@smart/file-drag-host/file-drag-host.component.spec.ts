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

  describe('image snapshot on pick', () => {
    function pick(comp: FileDragHostComponent, files: File[]): HTMLInputElement {
      const input = document.createElement('input');
      Object.defineProperty(input, 'files', {configurable: true, value: files});
      comp.onFilePickerChange(new Event('change'), input);
      return input;
    }

    function addedFiles(service: FileDragHostService): Promise<File[]> {
      return new Promise(resolve => {
        service.fileAdd$.subscribe(event => resolve(event.addedFiles));
      });
    }

    function makeImageComp(): { comp: FileDragHostComponent; service: FileDragHostService } {
      const service = makeServiceMock();
      const comp = makeComp(service);
      Object.defineProperty(comp, 'isImageOnlyMode', {configurable: true, value: true});
      comp.acceptedFileType = 'image/jpeg';
      return {comp, service};
    }

    it('adds an in-memory copy that keeps name, type and bytes in image mode', async () => {
      const {comp, service} = makeImageComp();
      const original = new File([new Uint8Array([1, 2, 3])], 'shot (tagged).jpg', {type: 'image/jpeg', lastModified: 1234});
      const added = addedFiles(service);

      pick(comp, [original]);
      const [copy] = await added;

      expect(copy).not.toBe(original);
      expect(copy.name).toBe(original.name);
      expect(copy.type).toBe('image/jpeg');
      expect(copy.lastModified).toBe(1234);
      expect(new Uint8Array(await copy.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
    });

    it('still reads the bytes after the original file can no longer be read', async () => {
      const {comp, service} = makeImageComp();
      const original = new File([new Uint8Array([9, 9])], 'a.jpg', {type: 'image/jpeg'});
      const added = addedFiles(service);

      pick(comp, [original]);
      spyOn(original, 'arrayBuffer').and.rejectWith(new DOMException('gone', 'NotFoundError'));
      const [copy] = await added;

      expect((await copy.arrayBuffer()).byteLength).toBe(2);
    });

    it('reports an unreadable file instead of adding it', async () => {
      const {comp, service} = makeImageComp();
      const original = new File([''], 'a.jpg', {type: 'image/jpeg'});
      spyOn(original, 'arrayBuffer').and.rejectWith(new DOMException('gone', 'NotFoundError'));
      spyOn(console, 'error');
      spyOn(service, 'addFiles');
      spyOn(service, 'reportUnreadableFile');

      pick(comp, [original]);
      await new Promise(resolve => setTimeout(resolve));

      expect(service.reportUnreadableFile).toHaveBeenCalled();
      expect(service.addFiles).not.toHaveBeenCalled();
    });

    it('passes files through untouched when not in image mode', () => {
      const service = makeServiceMock();
      const comp = makeComp(service);
      spyOn(service, 'addFiles');
      const original = new File(['x'], 'a.txt', {type: 'text/plain'});

      pick(comp, [original]);

      expect(service.addFiles).toHaveBeenCalledWith([original], undefined as unknown as string);
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
