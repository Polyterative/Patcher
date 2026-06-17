import { BehaviorSubject, Subject } from 'rxjs';
import { FileDragHostComponent } from './file-drag-host.component';

function makeServiceMock() {
  return {
    singleFileMode$: { next: jasmine.createSpy('singleFileMode$.next') },
    files$: new Subject<any>(),
    fileAdd$: new Subject<any>(),
    removeFile$: new Subject<any>(),
    removeAllFiles$: new Subject<any>()
  } as any;
}

function makeCdrMock() {
  return { detectChanges: jasmine.createSpy('detectChanges') } as any;
}

function makeComp(service = makeServiceMock(), cdr = makeCdrMock()): FileDragHostComponent {
  return new FileDragHostComponent(service, cdr);
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
      const input = { click: jasmine.createSpy('click') } as Pick<HTMLInputElement, 'click'> as HTMLInputElement;
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
      (comp as any).multipleFilesMode = false;
      comp.ngOnInit();
      expect(service.singleFileMode$.next).toHaveBeenCalledWith(true);
    });

    it('sets singleFileMode$ to false when multipleFilesMode is true', () => {
      const service = makeServiceMock();
      const comp = makeComp(service);
      (comp as any).multipleFilesMode = true;
      comp.ngOnInit();
      expect(service.singleFileMode$.next).toHaveBeenCalledWith(false);
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

      service.fileAdd$.next({});
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
