import {
  fakeAsync,
  tick
} from '@angular/core/testing';
import {
  BehaviorSubject,
  of,
  throwError
} from 'rxjs';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';
import { RackDetailDataService } from './rack-detail-data.service';
import { RACK_ANALYSIS_MODES } from './rack-analysis-mode';


describe('RackDetailDataService media, rename, and duplication', () => {
  function rack(partial: any = {}) {
    return {
      id: 1,
      name: 'Rack',
      rows: 2,
      hp: 84,
      public: true,
      locked: false,
      image: undefined,
      author: {id: 'u1', username: 'user'},
      ...partial
    } as any;
  }
  
  function mod(id: number, row: number | null, column: number | null, hp = 8, standard = 0) {
    return {
      module: {id: id + 1000, name: `M${ id }`, hp, standard: {id: standard}},
      rackingData: {id, rackid: 1, row, column}
    } as any;
  }
  
  function build() {
    const loggedUser$ = new BehaviorSubject<any>({id: 'u1'});
    const backend = {
      update: {
        rack: jasmine.createSpy('update.rack').and.returnValue(of({data: [{id: 1}]})),
        rackedModules: jasmine.createSpy('update.rackedModules').and.returnValue(of({}))
      },
      delete: {
        rackedModule: jasmine.createSpy('delete.rackedModule').and.returnValue(of({})),
        modulesOfRack: jasmine.createSpy('delete.modulesOfRack').and.returnValue(of({})),
        commentsForRack: jasmine.createSpy('delete.commentsForRack').and.returnValue(of({})),
        userRack: jasmine.createSpy('delete.userRack').and.returnValue(of({}))
      },
      add: {
        rackModule: jasmine.createSpy('add.rackModule').and.returnValue(of({})),
        rack: jasmine.createSpy('add.rack').and.returnValue(of({data: [{id: 200}]}))
      },
      get: {
        rackedModules: jasmine.createSpy('get.rackedModules').and.returnValue(of([]))
      },
      GET: {
        rackWithId: jasmine.createSpy('GET.rackWithId').and.callFake((id: number) => of({data: rack({id})}))
      },
      storage: {
        uploadRackImage: jasmine.createSpy('storage.uploadRackImage').and.returnValue(of('uploaded.jpeg')),
        deleteRackImage: jasmine.createSpy('storage.deleteRackImage').and.returnValue(of({}))
      }
    };
    const dialog = {
      open: jasmine.createSpy('dialog.open').and.returnValue({
        afterClosed: () => of({answer: true, result: 'Renamed Rack'})
      })
    };
    const snackBar = jasmine.createSpyObj('MatSnackBar', ['open']);
    const router = jasmine.createSpyObj('Router', ['navigate']);
    const service = new RackDetailDataService(
      snackBar,
      {loggedUser$} as any,
      backend as any,
      dialog as any,
      router
    );
    return {service, backend, dialog, snackBar};
  }
  
  it('downloads rack image and sanitizes generated filename', fakeAsync(() => {
    const {service, snackBar} = build();
    const generateRackJpegSpy = spyOn<any>(service, 'generateRackJpeg$').and.callFake(() => {
      expect(service.analysisMode$.value).toBe(RACK_ANALYSIS_MODES.off);
      return of('data:image/jpeg;base64,YQ==');
    });
    service.singleRackData$.next(rack({name: 'My/Rack', author: {username: 'u*ser'}}));
    service.currentDownloadElementRef$.next({
      screen: {nativeElement: {scrollWidth: 10, scrollHeight: 20}} as any
    });
    service.analysisMode$.next(RACK_ANALYSIS_MODES.power);
    
    const link = document.createElement('a');
    spyOn(link, 'click');
    spyOn(link, 'remove');
    const createElementOriginal = document.createElement.bind(document);
    spyOn(document, 'createElement').and.callFake((tagName: string) => {
      if (tagName === 'a') {
        return link;
      }
      return createElementOriginal(tagName);
    });
    
    service.downloadRackImageToUserComputer$.next();
    expect(service.analysisMode$.value).toBe(RACK_ANALYSIS_MODES.off);
    tick(359);
    expect(generateRackJpegSpy).not.toHaveBeenCalled();
    tick(1);
    
    expect(link.download).toContain('.jpeg');
    expect(link.download).not.toContain('/');
    expect(link.click).toHaveBeenCalled();
    expect(link.remove).toHaveBeenCalled();
    expect(snackBar.open).toHaveBeenCalled();
    expect(service.analysisMode$.value).toBe(RACK_ANALYSIS_MODES.power);
  }));
  
  it('updates rack preview image, deletes previous image, and refreshes rack', fakeAsync(() => {
    spyOn(SharedConstants, 'successCustom').and.callFake(() => {
    });
    const {service, backend} = build();
    const generateRackJpegSpy = spyOn<any>(service, 'generateRackJpeg$').and.callFake(() => {
      expect(service.analysisMode$.value).toBe(RACK_ANALYSIS_MODES.off);
      return of('data:image/jpeg;base64,YQ==');
    });
    const refreshSpy = spyOn(service.updateSingleRackData$, 'next').and.callThrough();
    service.singleRackData$.next(rack({id: 7, image: 'old.jpeg'}));
    service.currentDownloadElementRef$.next({
      screen: {nativeElement: {scrollWidth: 20, scrollHeight: 30}} as any
    });
    service.analysisMode$.next(RACK_ANALYSIS_MODES.function);
    
    service.updateRackImagePreview$.next();
    expect(service.analysisMode$.value).toBe(RACK_ANALYSIS_MODES.off);
    expect(service.isRackImageCaptureInProgress$.value).toBeTrue();
    tick(359);
    expect(generateRackJpegSpy).not.toHaveBeenCalled();
    tick(1);
    
    expect(backend.storage.uploadRackImage).toHaveBeenCalled();
    expect(backend.storage.deleteRackImage).toHaveBeenCalledWith('old.jpeg');
    expect(backend.update.rack).toHaveBeenCalled();
    expect(refreshSpy).toHaveBeenCalledWith(7);
    expect(SharedConstants.successCustom).toHaveBeenCalled();
    expect(service.analysisMode$.value).toBe(RACK_ANALYSIS_MODES.function);
    expect(service.isRackImageCaptureInProgress$.value).toBeFalse();
  }));
  
  it('updates rack preview image without deleting when no previous image exists', fakeAsync(() => {
    const {service, backend} = build();
    const generateRackJpegSpy = spyOn<any>(service, 'generateRackJpeg$').and.returnValue(of('data:image/jpeg;base64,YQ=='));
    service.singleRackData$.next(rack({id: 9, image: undefined}));
    service.currentDownloadElementRef$.next({
      screen: {nativeElement: {scrollWidth: 40, scrollHeight: 50}} as any
    });
    
    service.updateRackImagePreview$.next();
    tick(359);
    expect(generateRackJpegSpy).not.toHaveBeenCalled();
    tick(1);
    
    expect(backend.storage.uploadRackImage).toHaveBeenCalled();
    expect(backend.storage.deleteRackImage).not.toHaveBeenCalled();
    expect(backend.update.rack).toHaveBeenCalled();
  }));
  
  it('updates rack name from inline control and auto-saves', fakeAsync(() => {
    const {service, backend} = build();
    backend.update.rack.and.returnValue(of({data: [{id: 123}]}));
    service.singleRackData$.next(rack({id: 123, name: 'Old Name'}));
    
    service.formData.name.control.setValue('Renamed Rack');
    tick(900);
    
    expect(service.singleRackData$.value?.name).toBe('Renamed Rack');
    expect(backend.update.rack).toHaveBeenCalledWith(jasmine.objectContaining({id: 123, name: 'Renamed Rack'}));
  }));
  
  it('duplicates rack without reusing the original preview image and syncs copied module layout to the new rack', () => {
    spyOn(SharedConstants, 'successCustom').and.callFake(() => {
    });
    const {service, backend, snackBar} = build();
    spyOn(history, 'replaceState');
    service.singleRackData$.next(rack({id: 1, name: 'Perf Rack V5', hp: 104, rows: 2, image: 'keep.jpeg'}));
    service.rowedRackedModules$.next([[mod(1, 0, 0), mod(2, 0, 1)]]);
    backend.GET.rackWithId.and.callFake((id: number) => of({data: rack({id, name: 'New Rack'})}));
    
    service.duplicateRack$.next({id: 1, name: 'Perf Rack V5'} as any);
    
    expect(snackBar.open).toHaveBeenCalled();
    expect(backend.add.rack).toHaveBeenCalledWith(jasmine.objectContaining({name: 'Perf Rack V6'}));
    expect(backend.add.rack.calls.mostRecent().args[0].image).toBeUndefined();
    expect(history.replaceState).toHaveBeenCalled();
    expect(backend.update.rackedModules).toHaveBeenCalled();
    expect(SharedConstants.successCustom).toHaveBeenCalled();
  });
  
  it('handles row clear backend failure', () => {
    spyOn(SharedConstants, 'errorCustom').and.callFake(() => {
    });
    const {service, backend} = build();
    service.singleRackData$.next(rack({rows: 2}));
    service.rowedRackedModules$.next([
      [mod(1, 0, 0, 8, 0), mod(2, 0, 1, 4, 0), mod(3, 0, 2, 8, 0), mod(4, 0, 3, 14, 1)],
      []
    ]);
    backend.delete.rackedModule.and.returnValue(throwError(() => new Error('db error')));
    
    service.requestRackedModuleRowClearing$.next(mod(1, 0, 0, 8, 0));
    
    expect(SharedConstants.errorCustom).toHaveBeenCalled();
  });
  
  it('computes rack statistics by hp and excludes non-3u modules', () => {
    const {service, backend} = build();
    backend.get.rackedModules.and.returnValue(of([
      mod(1, 0, 0, 8, 0),
      mod(2, 0, 1, 4, 0),
      mod(3, 0, 2, 8, 0),
      mod(4, 0, 3, 14, 1)
    ]));
    service.singleRackData$.next(rack({id: 2, rows: 2}));
    
    const stats = service.rackStatistics$.value || [];
    expect(stats.map(x => x.name)).toEqual(['4HP count', '8HP count']);
    expect(stats.map(x => x.value)).toEqual(['1', '2']);
  });

});
