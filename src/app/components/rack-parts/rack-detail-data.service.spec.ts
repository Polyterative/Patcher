import {
  fakeAsync,
  tick
} from '@angular/core/testing';
import {
  BehaviorSubject,
  of,
  Subject,
  throwError
} from 'rxjs';
import { RackDetailDataService } from './rack-detail-data.service';

describe('RackDetailDataService', () => {

  function makeRack(overrides: Partial<any> = {}): any {
    return {
      id: 1,
      name: 'Test Rack',
      hp: 84,
      rows: 3,
      public: true,
      locked: false,
      image: null,
      author: {id: 'user-1', username: 'alice'},
      ...overrides
    };
  }

  function makeRackedModule(overrides: Partial<any> = {}): any {
    return {
      rackingData: {id: 10, rackid: 1, moduleid: 5, row: 0, column: 0, selectedPanelId: null},
      module: {id: 5, name: 'VCO', hp: 8, standard: {id: 0}, functions: []},
      ...overrides
    };
  }

  function build(options: {usePublicReads?: boolean} = {}) {
    const loggedUser$ = new BehaviorSubject<any>({id: 'user-1', username: 'alice'});

    const backend = {
      GET: {
        rackWithId: jasmine.createSpy('rackWithId').and.callFake((id: number) =>
          of({data: makeRack({id})})
        ),
        publicRackWithId: jasmine.createSpy('publicRackWithId').and.callFake((id: number) =>
          of({data: makeRack({id})})
        )
      },
      get: {
        rackedModules: jasmine.createSpy('rackedModules').and.returnValue(of([]))
      },
      update: {
        rack: jasmine.createSpy('rack').and.callFake((r: any) => of(r)),
        rackedModules: jasmine.createSpy('rackedModules').and.returnValue(of({})),
        rackModulePanel: jasmine.createSpy('rackModulePanel').and.returnValue(of({}))
      },
      delete: {
        rackedModule: jasmine.createSpy('rackedModule').and.returnValue(of({})),
        modulesOfRack: jasmine.createSpy('modulesOfRack').and.returnValue(of({})),
        commentsForRack: jasmine.createSpy('commentsForRack').and.returnValue(of({})),
        userRack: jasmine.createSpy('userRack').and.returnValue(of({}))
      },
      add: {
        rack: jasmine.createSpy('rack').and.returnValue(of({data: [{id: 99}]})),
        rackModule: jasmine.createSpy('rackModule').and.returnValue(of({})),
        patch: jasmine.createSpy('patch').and.returnValue(of({data: [{id: 77}]}))
      },
      storage: {
        uploadRackImage: jasmine.createSpy('uploadRackImage').and.returnValue(of('url')),
        deleteRackImage: jasmine.createSpy('deleteRackImage').and.returnValue(of({}))
      }
    };

    const snackBar = {open: jasmine.createSpy('open')};
    const dialog = {open: jasmine.createSpy('open')};
    const router = jasmine.createSpyObj('Router', ['navigate']);
    const userService = {loggedUser$};

    const service = new RackDetailDataService(
      snackBar as any,
      userService as any,
      backend as any,
      dialog as any,
      router
    );

    if (options.usePublicReads) {
      service.setPublicDetailMode(true);
    }

    return {service, backend, snackBar, router, loggedUser$};
  }

  it('starts with expected default state', () => {
    const {service} = build();

    expect(service.singleRackData$.value).toBeUndefined();
    // BehaviorSubject starts null; constructor taps singleRackData$(undefined) and sets it to []
    expect(service.rowedRackedModules$.value).toEqual([]);
    expect(service.isRackDataLoading$.value).toBeFalse();
    expect(service.isCurrentRackPropertyOfCurrentUser$.value).toBeFalse();
    expect(service.isCurrentRackEditable$.value).toBeTrue();
    expect(service.isCurrentRackPrivate$.value).toBeFalse();
    expect(service.shouldShowPanelImages$.value).toBeTrue();
    expect(service.userRequestedSmallerScale$.value).toBeFalse();
  });

  it('loads rack data via private endpoint and sets isRackDataLoading$ correctly', fakeAsync(() => {
    const {service, backend} = build();

    service.updateSingleRackData$.next(1);
    tick();

    expect(service.isRackDataLoading$.value).toBeFalse();
    expect(backend.GET.rackWithId).toHaveBeenCalledWith(1);
    expect(backend.GET.publicRackWithId).not.toHaveBeenCalled();
    expect(service.singleRackData$.value?.id).toBe(1);
  }));

  it('uses publicRackWithId when public detail mode is enabled', fakeAsync(() => {
    const {service, backend} = build({usePublicReads: true});

    service.updateSingleRackData$.next(2);
    tick();

    expect(backend.GET.publicRackWithId).toHaveBeenCalledWith(2);
    expect(backend.GET.rackWithId).not.toHaveBeenCalled();
  }));

  it('fetches racked modules after rack data arrives and sets rowedRackedModules$', fakeAsync(() => {
    const module = makeRackedModule();
    const {service, backend} = build();
    backend.get.rackedModules.and.returnValue(of([module]));

    service.updateSingleRackData$.next(1);
    tick();

    expect(backend.get.rackedModules).toHaveBeenCalledWith(1);
    expect(service.rowedRackedModules$.value).not.toBeNull();
    const all = service.rowedRackedModules$.value!.flat();
    expect(all.length).toBe(1);
    expect(all[0].module.id).toBe(5);
  }));

  it('resets rowedRackedModules$ and isRackDataLoading$ when rack data is null', fakeAsync(() => {
    const {service, backend} = build();
    backend.GET.rackWithId.and.returnValue(of({data: null}));

    service.updateSingleRackData$.next(1);
    tick();

    expect(service.singleRackData$.value).toBeUndefined();
    expect(service.rowedRackedModules$.value).toEqual([]);
    expect(service.isRackDataLoading$.value).toBeFalse();
  }));

  it('syncs isCurrentRackEditable$ and isCurrentRackPrivate$ when rack data changes', fakeAsync(() => {
    const {service, backend} = build();
    backend.GET.rackWithId.and.returnValue(of({data: makeRack({locked: true, public: false})}));

    service.updateSingleRackData$.next(1);
    tick();

    expect(service.isCurrentRackEditable$.value).toBeFalse();
    expect(service.isCurrentRackPrivate$.value).toBeTrue();
  }));

  it('sets isCurrentRackPropertyOfCurrentUser$ true when logged user owns the rack', fakeAsync(() => {
    const {service, backend} = build();
    backend.GET.rackWithId.and.returnValue(of({data: makeRack({author: {id: 'user-1', username: 'alice'}})}));

    service.updateSingleRackData$.next(1);
    tick();

    expect(service.isCurrentRackPropertyOfCurrentUser$.value).toBeTrue();
  }));

  it('sets isCurrentRackPropertyOfCurrentUser$ false when rack belongs to another user', fakeAsync(() => {
    const {service, backend} = build();
    backend.GET.rackWithId.and.returnValue(of({data: makeRack({author: {id: 'user-99', username: 'bob'}})}));

    service.updateSingleRackData$.next(1);
    tick();

    expect(service.isCurrentRackPropertyOfCurrentUser$.value).toBeFalse();
  }));

  it('toggles privacy status and calls backend.update.rack', fakeAsync(() => {
    const {service, backend} = build();
    backend.GET.rackWithId.and.returnValue(of({data: makeRack({public: true})}));

    service.updateSingleRackData$.next(1);
    tick();
    expect(service.isCurrentRackPrivate$.value).toBeFalse();

    service.requestRackPrivacyStatusChange$.next();
    tick();

    expect(backend.update.rack).toHaveBeenCalled();
    expect(service.isCurrentRackPrivate$.value).toBeTrue();
  }));

  it('toggles editable status and calls backend.update.rack', fakeAsync(() => {
    const {service, backend} = build();
    backend.GET.rackWithId.and.returnValue(of({data: makeRack({locked: false})}));

    service.updateSingleRackData$.next(1);
    tick();
    expect(service.isCurrentRackEditable$.value).toBeTrue();

    service.requestRackEditableStatusChange$.next();
    tick();

    expect(backend.update.rack).toHaveBeenCalled();
    expect(service.isCurrentRackEditable$.value).toBeFalse();
  }));

  it('pre-fills formData.name.control with the current rack name when activating edit mode', fakeAsync(() => {
    const {service, backend} = build();
    backend.GET.rackWithId.and.returnValue(of({data: makeRack({name: 'My Rack', locked: true})}));

    service.updateSingleRackData$.next(1);
    tick();
    expect(service.isCurrentRackEditable$.value).toBeFalse();

    service.requestRackEditableStatusChange$.next();
    tick();

    expect(service.isCurrentRackEditable$.value).toBeTrue();
    expect(service.formData.name.control.value).toBe('My Rack');
  }));

  it('requestAddNewRow$ increments rows by 1 and calls backend.update.rack', fakeAsync(() => {
    const {service, backend} = build();
    backend.GET.rackWithId.and.returnValue(of({data: makeRack({rows: 3})}));

    service.updateSingleRackData$.next(1);
    tick();

    service.requestAddNewRow$.next();
    tick();

    const updatedRack = backend.update.rack.calls.mostRecent().args[0];
    expect(updatedRack.rows).toBe(4);
  }));

  it('requestRemoveRow$ decrements rows by 1 and calls backend.update.rack', fakeAsync(() => {
    const {service, backend} = build();
    backend.GET.rackWithId.and.returnValue(of({data: makeRack({rows: 3})}));

    service.updateSingleRackData$.next(1);
    tick();

    service.requestRemoveRow$.next();
    tick();

    const updatedRack = backend.update.rack.calls.mostRecent().args[0];
    expect(updatedRack.rows).toBe(2);
  }));

  it('requestRackedModuleRemoval$ removes module from local state and deletes from backend', fakeAsync(() => {
    const module = makeRackedModule();
    const {service, backend} = build();
    backend.GET.rackWithId.and.returnValue(of({data: makeRack({rows: 1})}));

    // First call returns the module; subsequent calls (after removal triggers a refresh) return []
    let rackedModulesCallCount = 0;
    backend.get.rackedModules.and.callFake(() => {
      rackedModulesCallCount++;
      return rackedModulesCallCount === 1 ? of([module]) : of([]);
    });

    service.updateSingleRackData$.next(1);
    tick();

    const before = service.rowedRackedModules$.value!.flat().length;
    expect(before).toBe(1);

    service.requestRackedModuleRemoval$.next(module);
    tick();

    expect(backend.delete.rackedModule).toHaveBeenCalledWith(10);
    // After re-fetch triggered by singleRackData$.next, the stub returns [] so final state is empty
    const after = service.rowedRackedModules$.value!.flat().length;
    expect(after).toBe(0);
  }));

  it('requestRackedModuleRemoval$ rolls back local state when backend delete fails', fakeAsync(() => {
    const module = makeRackedModule();
    const {service, backend, snackBar} = build();
    backend.GET.rackWithId.and.returnValue(of({data: makeRack({rows: 1})}));
    backend.get.rackedModules.and.returnValue(of([module]));

    service.updateSingleRackData$.next(1);
    tick();

    expect(service.rowedRackedModules$.value!.flat().length).toBe(1);

    backend.delete.rackedModule.and.returnValue(throwError(() => new Error('network error')));
    service.requestRackedModuleRemoval$.next(module);
    tick();

    // State should be restored to 1 module after rollback
    expect(service.rowedRackedModules$.value!.flat().length).toBe(1);
    expect(snackBar.open).toHaveBeenCalled();
  }));

  it('formData.name.control updates singleRackData$.value.name immediately when valid', fakeAsync(() => {
    const {service, backend} = build();
    backend.GET.rackWithId.and.returnValue(of({data: makeRack({name: 'Original'})}));

    service.updateSingleRackData$.next(1);
    tick();

    service.formData.name.control.setValue('Updated Name');
    tick();

    expect(service.singleRackData$.value?.name).toBe('Updated Name');
  }));

  it('formData.name.control does NOT update when value is invalid (too short)', fakeAsync(() => {
    const {service, backend} = build();
    backend.GET.rackWithId.and.returnValue(of({data: makeRack({name: 'Original'})}));

    service.updateSingleRackData$.next(1);
    tick();

    service.formData.name.control.setValue('AB');
    tick();

    expect(service.singleRackData$.value?.name).toBe('Original');
  }));

  it('formData.name.control debounces auto-save to backend after 800ms', fakeAsync(() => {
    const {service, backend} = build();
    backend.GET.rackWithId.and.returnValue(of({data: makeRack()}));

    service.updateSingleRackData$.next(1);
    tick();

    const callsBefore = backend.update.rack.calls.count();

    service.formData.name.control.setValue('New Name Here');
    tick(400); // not yet
    expect(backend.update.rack.calls.count()).toBe(callsBefore);

    tick(800); // debounce fires
    expect(backend.update.rack.calls.count()).toBeGreaterThan(callsBefore);
  }));

  it('functionAnalysisLegendItems$ emits when rowedRackedModules$ updates', fakeAsync(() => {
    const {service} = build();
    let emitted: any;
    service.functionAnalysisLegendItems$.subscribe(v => emitted = v);

    service.rowedRackedModules$.next([[makeRackedModule()]]);
    tick();

    expect(emitted).toBeDefined();
  }));

  it('rackStatistics$ is null when singleRackData$ is null, then populated on load', fakeAsync(() => {
    const {service, backend} = build();
    expect(service.rackStatistics$.value).toBeNull();

    const module = makeRackedModule({module: {id: 5, name: 'VCO', hp: 8, standard: {id: 0}, functions: []}});
    backend.get.rackedModules.and.returnValue(of([module]));

    service.updateSingleRackData$.next(1);
    tick();

    expect(service.rackStatistics$.value).not.toBeNull();
    const stat = service.rackStatistics$.value!.find(s => s.name === '8HP count');
    expect(stat?.value).toBe('1');
  }));

  it('setPublicDetailMode switches between private and public read paths', fakeAsync(() => {
    const {service, backend} = build();

    service.updateSingleRackData$.next(1);
    tick();
    expect(backend.GET.rackWithId).toHaveBeenCalled();

    service.setPublicDetailMode(true);
    service.updateSingleRackData$.next(1);
    tick();
    expect(backend.GET.publicRackWithId).toHaveBeenCalled();
  }));

});
