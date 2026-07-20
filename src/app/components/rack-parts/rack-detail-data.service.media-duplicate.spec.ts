import {
  fakeAsync,
  tick
} from '@angular/core/testing';
import type { ElementRef } from '@angular/core';
import {
  BehaviorSubject,
  Observable,
  of,
  throwError
} from 'rxjs';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';
import { RACK_PREVIEW_MAX_BYTES } from 'src/app/shared-interproject/upload-guardrails/upload-guardrails';
import { RackDetailDataService } from './rack-detail-data.service';
import { RACK_ANALYSIS_MODES } from './rack-analysis-mode';


describe('RackDetailDataService media, rename, and duplication', () => {
  type RackJpegGenerator = {generateRackJpeg$: (el: HTMLElement) => Observable<string>};

  let createdServices: RackDetailDataService[];

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

  function dataUrlOfSize(byteSize: number): string {
    const bytes = new Uint8Array(byteSize);
    let binary = '';
    for (let offset = 0; offset < bytes.length; offset += 32768) {
      binary += String.fromCharCode(...bytes.subarray(offset, offset + 32768));
    }
    return `data:image/jpeg;base64,${ btoa(binary) }`;
  }
  
  function build(options: {userId?: string; isAdmin?: boolean} = {}) {
    const loggedUser$ = new BehaviorSubject<any>({id: options.userId ?? 'u1'});
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
        rackWithId: jasmine.createSpy('GET.rackWithId').and.callFake((id: number) => of({data: rack({id})})),
        rackByPublicId: jasmine.createSpy('GET.rackByPublicId').and.callFake((token: string) => of({data: rack({id: 200, public_id: token})}))
      },
      storage: {
        uploadRackImage: jasmine.createSpy('storage.uploadRackImage').and.returnValue(of('uploaded.jpeg')),
        deleteRackImage: jasmine.createSpy('storage.deleteRackImage').and.returnValue(of({}))
      },
      admin: {
        setRackImageUrl: jasmine.createSpy('admin.setRackImageUrl').and.returnValue(of(void 0))
      },
      auth: {
        hasAdminRole$: jasmine.createSpy('auth.hasAdminRole$').and.returnValue(of(options.isAdmin ?? false))
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
      router,
      {capture: () => {}, identify: () => {}, reset: () => {}} as any
    );
    createdServices.push(service);
    return {service, backend, dialog, snackBar};
  }

  beforeEach(() => {
    createdServices = [];
  });

  afterEach(() => {
    createdServices.forEach((service) => service.ngOnDestroy());
  });
  
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
  
  it('updates rack preview image locally without refreshing rack modules', fakeAsync(() => {
    spyOn(SharedConstants, 'successCustom').and.callFake(() => {
    });
    const {service, backend} = build();
    const generateRackJpegSpy = spyOn<any>(service, 'generateRackJpeg$').and.callFake(() => {
      expect(service.analysisMode$.value).toBe(RACK_ANALYSIS_MODES.off);
      return of('data:image/jpeg;base64,YQ==');
    });
    const refreshSpy = spyOn(service.updateSingleRackData$, 'next').and.callThrough();
    service.singleRackData$.next(rack({id: 7, image: 'old.jpeg'}));
    service.rowedRackedModules$.next([[mod(1, 0, 0)]]);
    const rowReference = service.rowedRackedModules$.value[0];
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
    expect(backend.update.rack).toHaveBeenCalledWith(jasmine.objectContaining({id: 7, image: 'uploaded.jpeg'}));
    expect(backend.storage.deleteRackImage).toHaveBeenCalledWith('old.jpeg');
    expect(refreshSpy).not.toHaveBeenCalled();
    expect(service.singleRackData$.value?.image).toBe('uploaded.jpeg');
    expect(service.rowedRackedModules$.value[0]).toBe(rowReference);
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
    expect(backend.update.rack).toHaveBeenCalledWith(jasmine.objectContaining({id: 9, image: 'uploaded.jpeg'}));
  }));

  it('blocks generated rack preview uploads above one megabyte before storage or rack updates', fakeAsync(() => {
    spyOn(SharedConstants, 'errorCustom').and.callFake(() => {});
    spyOn(SharedConstants, 'successCustom').and.callFake(() => {});
    const {service, backend} = build();
    spyOn(service as unknown as RackJpegGenerator, 'generateRackJpeg$').and.returnValue(of(dataUrlOfSize(RACK_PREVIEW_MAX_BYTES + 1)));
    service.singleRackData$.next(rack({id: 10, image: undefined}));
    service.currentDownloadElementRef$.next({
      screen: {nativeElement: {scrollWidth: 40, scrollHeight: 50} as HTMLElement} as ElementRef<HTMLElement>
    });

    service.updateRackImagePreview$.next();
    tick(360);

    expect(backend.storage.uploadRackImage).not.toHaveBeenCalled();
    expect(backend.update.rack).not.toHaveBeenCalledWith(jasmine.objectContaining({id: 10, image: 'uploaded.jpeg'}));
    expect(SharedConstants.errorCustom).toHaveBeenCalledWith(jasmine.anything(), jasmine.stringMatching(/limit is 1 MB/));
    expect(SharedConstants.successCustom).not.toHaveBeenCalled();
  }));

  it('allows non-owner admins to update the generated rack preview through the existing rack update path', fakeAsync(() => {
    spyOn(SharedConstants, 'successCustom').and.callFake(() => {
    });
    const {service, backend} = build({userId: 'admin-user', isAdmin: true});
    spyOn<any>(service, 'generateRackJpeg$').and.returnValue(of('data:image/jpeg;base64,YQ=='));
    service.singleRackData$.next(rack({id: 13, image: 'old.jpeg', author: {id: 'owner-user', username: 'owner'}}));
    service.currentDownloadElementRef$.next({
      screen: {nativeElement: {scrollWidth: 40, scrollHeight: 50}} as any
    });

    service.updateRackImagePreview$.next();
    tick(360);

    expect(backend.storage.uploadRackImage).toHaveBeenCalled();
    expect(backend.update.rack).toHaveBeenCalledWith(jasmine.objectContaining({id: 13, image: 'uploaded.jpeg'}));
    expect(backend.storage.deleteRackImage).toHaveBeenCalledWith('old.jpeg');
    expect(service.singleRackData$.value?.image).toBe('uploaded.jpeg');
    expect(SharedConstants.successCustom).toHaveBeenCalled();
  }));

  it('marks admins as allowed to update rack previews even when they do not own the rack', () => {
    const {service} = build({userId: 'admin-user', isAdmin: true});
    const emitted: boolean[] = [];
    service.canUpdateRackImagePreview$.subscribe(value => emitted.push(value));

    service.isCurrentRackPropertyOfCurrentUser$.next(false);

    expect(emitted[emitted.length - 1]).toBeTrue();
  });

  it('continues when the previous rack image is already missing from storage', fakeAsync(() => {
    spyOn(SharedConstants, 'successCustom').and.callFake(() => {
    });
    const {service, backend} = build();
    backend.storage.deleteRackImage.and.returnValue(throwError(() => ({status: 404, message: 'Object not found'})));
    spyOn<any>(service, 'generateRackJpeg$').and.returnValue(of('data:image/jpeg;base64,YQ=='));
    service.singleRackData$.next(rack({id: 11, image: 'missing.jpeg'}));
    service.currentDownloadElementRef$.next({
      screen: {nativeElement: {scrollWidth: 40, scrollHeight: 50}} as any
    });

    service.updateRackImagePreview$.next();
    tick(360);

    expect(backend.update.rack).toHaveBeenCalledWith(jasmine.objectContaining({id: 11, image: 'uploaded.jpeg'}));
    expect(service.singleRackData$.value?.image).toBe('uploaded.jpeg');
    expect(SharedConstants.successCustom).toHaveBeenCalled();
  }));

  it('blocks rack preview updates for users who are neither owner nor admin', fakeAsync(() => {
    spyOn(SharedConstants, 'errorCustom').and.callFake(() => {});
    spyOn(SharedConstants, 'successCustom').and.callFake(() => {});
    const {service, backend} = build({userId: 'visitor', isAdmin: false});
    spyOn<any>(service, 'generateRackJpeg$').and.returnValue(of('data:image/jpeg;base64,YQ=='));
    service.singleRackData$.next(rack({id: 15, image: 'old.jpeg', author: {id: 'owner', username: 'owner'}}));
    service.currentDownloadElementRef$.next({
      screen: {nativeElement: {scrollWidth: 40, scrollHeight: 50}} as any
    });

    service.updateRackImagePreview$.next();
    tick(360);

    expect(backend.storage.uploadRackImage).not.toHaveBeenCalled();
    expect(backend.update.rack).not.toHaveBeenCalledWith(jasmine.objectContaining({image: 'uploaded.jpeg'}));
    expect(SharedConstants.errorCustom).toHaveBeenCalledWith(jasmine.anything(), jasmine.stringMatching(/owner or an admin/));
    expect(SharedConstants.successCustom).not.toHaveBeenCalled();
  }));

  it('shows an error when deleting the previous rack preview image fails for a non-404 reason', fakeAsync(() => {
    spyOn(SharedConstants, 'errorCustom').and.callFake(() => {});
    spyOn(SharedConstants, 'successCustom').and.callFake(() => {});
    const {service, backend} = build();
    backend.storage.deleteRackImage.and.returnValue(throwError(() => ({status: 500, message: 'storage unavailable'})));
    spyOn<any>(service, 'generateRackJpeg$').and.returnValue(of('data:image/jpeg;base64,YQ=='));
    const refreshSpy = spyOn(service.updateSingleRackData$, 'next').and.callThrough();
    service.singleRackData$.next(rack({id: 16, image: 'old.jpeg'}));
    service.currentDownloadElementRef$.next({
      screen: {nativeElement: {scrollWidth: 40, scrollHeight: 50}} as any
    });

    service.updateRackImagePreview$.next();
    tick(360);

    expect(backend.update.rack).toHaveBeenCalledWith(jasmine.objectContaining({id: 16, image: 'uploaded.jpeg'}));
    expect(refreshSpy).not.toHaveBeenCalled();
    expect(SharedConstants.errorCustom).toHaveBeenCalled();
    expect(SharedConstants.successCustom).not.toHaveBeenCalled();
  }));

  it('shows an error when persisting the new rack preview filename fails', fakeAsync(() => {
    spyOn(SharedConstants, 'errorCustom').and.callFake(() => {
    });
    spyOn(SharedConstants, 'successCustom').and.callFake(() => {
    });
    const {service, backend} = build();
    backend.update.rack.and.returnValue(throwError(() => new Error('db write failed')));
    spyOn<any>(service, 'generateRackJpeg$').and.returnValue(of('data:image/jpeg;base64,YQ=='));
    const refreshSpy = spyOn(service.updateSingleRackData$, 'next').and.callThrough();
    service.singleRackData$.next(rack({id: 12, image: 'old.jpeg'}));
    service.currentDownloadElementRef$.next({
      screen: {nativeElement: {scrollWidth: 40, scrollHeight: 50}} as any
    });

    service.updateRackImagePreview$.next();
    tick(360);

    expect(backend.storage.deleteRackImage).not.toHaveBeenCalled();
    expect(refreshSpy).not.toHaveBeenCalled();
    expect(SharedConstants.errorCustom).toHaveBeenCalled();
    expect(SharedConstants.successCustom).not.toHaveBeenCalled();
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

  it('shows an error when inline rack name auto-save fails', fakeAsync(() => {
    spyOn(SharedConstants, 'errorCustom').and.callFake(() => {});
    const {service, backend} = build();
    backend.update.rack.and.returnValue(throwError(() => new Error('save failed')));
    service.singleRackData$.next(rack({id: 124, name: 'Old Name'}));

    service.formData.name.control.setValue('Failed Rename');
    tick(900);

    expect(service.singleRackData$.value?.name).toBe('Failed Rename');
    expect(backend.update.rack).toHaveBeenCalledWith(jasmine.objectContaining({id: 124, name: 'Failed Rename'}));
    expect(SharedConstants.errorCustom).toHaveBeenCalled();
  }));
  
  it('duplicates rack without reusing the original preview image and syncs copied module layout to the new rack', () => {
    spyOn(SharedConstants, 'successCustom').and.callFake(() => {
    });
    const {service, backend, snackBar} = build();
    spyOn(history, 'replaceState');
    service.singleRackData$.next(rack({id: 1, name: 'Perf Rack V5', hp: 104, rows: 2, image: 'keep.jpeg'}));
    service.rowedRackedModules$.next([[mod(1, 0, 0), mod(2, 0, 1)]]);
    backend.GET.rackWithId.and.callFake((id: number) => of({data: rack({id, name: 'New Rack'})}));
    backend.update.rackedModules.and.returnValue(of({
      data: [
        {id: 301, moduleid: 1001, rackid: 200, row: 0, column: 0, selected_panel_id: null},
        {id: 302, moduleid: 1002, rackid: 200, row: 0, column: 1, selected_panel_id: null}
      ]
    }));
    
    service.duplicateRack$.next({id: 1, name: 'Perf Rack V5'} as any);
    
    expect(snackBar.open).toHaveBeenCalled();
    expect(backend.add.rack).toHaveBeenCalledWith(jasmine.objectContaining({name: 'Perf Rack V6'}));
    expect(backend.add.rack.calls.mostRecent().args[0].image).toBeUndefined();
    expect(history.replaceState).toHaveBeenCalled();
    expect(backend.update.rackedModules).toHaveBeenCalled();
    expect(service.rowedRackedModules$.value[0].map((module: any) => module.module.id)).toEqual([1001, 1002]);
    expect(service.rowedRackedModules$.value[0].map((module: any) => module.rackingData.id)).toEqual([301, 302]);
    expect(SharedConstants.successCustom).toHaveBeenCalled();
  });

  it('loads a duplicated rack by public token when the create response includes one', () => {
    spyOn(SharedConstants, 'successCustom').and.callFake(() => {});
    const {service, backend} = build();
    spyOn(history, 'replaceState');
    backend.add.rack.and.returnValue(of({data: [{id: 200, public_id: 'public-token'}]}));
    service.singleRackData$.next(rack({id: 1, name: 'Token Rack', hp: 84, rows: 1}));
    service.rowedRackedModules$.next([[mod(1, 0, 0)]]);

    service.duplicateRack$.next({id: 1, name: 'Token Rack'} as any);

    expect(backend.GET.rackByPublicId).toHaveBeenCalledWith('public-token');
    expect(history.replaceState).toHaveBeenCalledWith({}, '', '/racks/public-token');
    expect(backend.update.rackedModules).toHaveBeenCalled();
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
    backend.GET.rackWithId.and.returnValue(of({data: rack({id: 2, rows: 2})}));
    service.updateSingleRackData$.next(2);
    
    const stats = service.rackStatistics$.value || [];
    expect(stats.map(x => x.name)).toEqual(['4HP count', '8HP count']);
    expect(stats.map(x => x.value)).toEqual(['1', '2']);
  });

});
