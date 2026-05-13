import { of } from 'rxjs';
import { RackDetailDataService } from './rack-detail-data.service';
import {
  buildRowedModulesArray,
  calculateBlankIdForSizeAndStandard,
  isAnyModuleWithoutRackingId,
} from './rack-detail-data.utils';


describe('RackDetailDataService helpers', () => {
  let createdServices: RackDetailDataService[];

  function build() {
    const backend = {
      update: {
        rack: jasmine.createSpy('update.rack').and.returnValue(of({})),
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
        rack: jasmine.createSpy('add.rack').and.returnValue(of({data: [{id: 999}]}))
      },
      get: {
        rackedModules: jasmine.createSpy('get.rackedModules').and.returnValue(of([]))
      },
      GET: {
        rackWithId: jasmine.createSpy('GET.rackWithId').and.returnValue(of({data: null}))
      },
      storage: {
        uploadRackImage: jasmine.createSpy('storage.uploadRackImage').and.returnValue(of('img.jpg')),
        deleteRackImage: jasmine.createSpy('storage.deleteRackImage').and.returnValue(of({}))
      }
    };
    
    const dialog = {
      open: jasmine.createSpy('open').and.returnValue({
        afterClosed: () => of({answer: true})
      })
    };
    
    const service = new RackDetailDataService(
      {open: jasmine.createSpy('snack.open')} as any,
      {loggedUser$: of(undefined)} as any,
      backend as any,
      dialog as any,
      jasmine.createSpyObj('Router', ['navigate'])
    );
    createdServices.push(service);
    
    return {service, backend, dialog};
  }

  beforeEach(() => {
    createdServices = [];
  });

  afterEach(() => {
    createdServices.forEach((service) => service.ngOnDestroy());
  });
  
  function mod(id: number, row: number | null, column: number | null, hp = 8, standardId = 0) {
    return {
      module: {
        id: 1000 + id,
        name: `M${ id }`,
        hp,
        standard: {id: standardId}
      },
      rackingData: {
        id,
        rackid: 1,
        row,
        column
      }
    } as any;
  }
  
  it('maps blank panel IDs for 3U and Intellijel standards', () => {
    const standard0Map: Record<number, number> = {
      1: 4666, 2: 4647, 3: 4665, 4: 4648, 5: 4664,
      6: 4649, 7: 4650, 8: 4651, 9: 4652, 10: 4653,
      11: 4654, 12: 4655, 13: 4656, 14: 4657, 15: 4658,
      16: 4659, 17: 4660, 18: 4661, 19: 4662, 20: 4663
    };
    Object.entries(standard0Map).forEach(([hp, id]) => {
      expect(calculateBlankIdForSizeAndStandard(Number(hp), 0)).toBe(id);
    });
    
    const standard1Map: Record<number, number> = {
      1: 4711, 2: 4712, 3: 4713, 4: 4714, 5: 4715,
      6: 4716, 7: 4717, 8: 4718, 9: 4719, 10: 4720,
      11: 4721, 12: 4722, 13: 4723, 14: 4724, 15: 4725,
      16: 4726, 17: 4727, 18: 4728, 19: 4729, 20: 4730,
      21: 4731, 22: 4732, 23: 4733, 24: 4734, 25: 4735
    };
    Object.entries(standard1Map).forEach(([hp, id]) => {
      expect(calculateBlankIdForSizeAndStandard(Number(hp), 1)).toBe(id);
    });
    
    expect(calculateBlankIdForSizeAndStandard(99, 0)).toBe(-1);
    expect(calculateBlankIdForSizeAndStandard(99, 1)).toBe(-1);
    expect(calculateBlankIdForSizeAndStandard(8, 999)).toBe(-1);
  });
  
  it('bumps rack version suffix or appends V2', () => {
    const {service} = build();
    const bump = (service as any).bumpUpVersionInNameOfOfRack.bind(service);
    
    service.singleRackData$.next({name: 'My Rack V2'} as any);
    expect(bump()).toBe('My Rack V3');
    
    service.singleRackData$.next({name: 'My Rack'} as any);
    expect(bump()).toBe('My Rack V2');
  });
  
  it('builds rowed module arrays and appends unracked row', () => {
    const rowed = buildRowedModulesArray(
      [mod(1, 0, 0), mod(2, 1, 0), mod(3, null, null)],
      {rows: 2} as any
    );
    
    expect(rowed.length).toBe(3);
    expect(rowed[0].map((x: any) => x.rackingData.id)).toEqual([1]);
    expect(rowed[1].map((x: any) => x.rackingData.id)).toEqual([2]);
    expect(rowed[2].map((x: any) => x.rackingData.id)).toEqual([3]);
  });
  
  it('updates module columns and supports in-row and cross-row transfer', () => {
    const {service} = build();
    const updateCols = (service as any).updateModulesColumnIds.bind(service);
    const transferInRow = (service as any).transferInRow.bind(service);
    const transferBetweenRows = (service as any).transferBetweenRows.bind(service);
    
    const rows = [[mod(1, 0, 0), mod(2, 0, 1)], [mod(3, 1, 0)]];
    updateCols(rows, undefined);
    transferInRow(rows, 0, {previousIndex: 0, currentIndex: 1});
    expect(rows[0].map((x: any) => x.rackingData.id)).toEqual([2, 1]);
    expect(rows[0].map((x: any) => x.rackingData.column)).toEqual([0, 1]);
    
    transferBetweenRows(rows, rows[0][0], {currentIndex: 1}, 1);
    expect(rows[1].map((x: any) => x.rackingData.id)).toEqual([3, 2]);
    expect(rows[1].map((x: any) => x.rackingData.column)).toEqual([0, 1]);
  });
  
  it('removes modules and handles unracked-row cleanup', () => {
    const {service} = build();
    const remove = (service as any).removeRackedModuleFromRack.bind(service);
    
    const a = mod(1, 0, 0);
    const b = mod(2, 0, 1);
    const unracked = mod(99, null, null);
    const rows = [[a, b], [unracked]];
    
    remove(rows, a);
    expect(rows[0].map((x: any) => x.rackingData.id)).toEqual([2]);
    expect(rows[0][0].rackingData.column).toBe(0);
    
    remove(rows, unracked);
    expect(rows.length).toBe(1);
  });
  
  it('duplicates modules for both racked and unracked cases', () => {
    const {service} = build();
    const duplicate = (service as any).duplicateModule.bind(service);
    
    const rackedRows = [[mod(1, 0, 0)]];
    duplicate(rackedRows, rackedRows[0][0]);
    expect(rackedRows[0].length).toBe(2);
    expect(rackedRows[0][1].rackingData.id).toBeUndefined();
    expect(rackedRows[0].map((x: any) => x.rackingData.column)).toEqual([0, 1]);
    
    const unrackedRows = [[], [mod(50, null, null)]];
    duplicate(unrackedRows, unrackedRows[1][0]);
    expect(unrackedRows[1].length).toBe(2);
    expect(unrackedRows[1][1].rackingData.id).toBeUndefined();
  });
  
  it('preserves selectedPanelId when duplicating a module', () => {
    const {service} = build();
    const duplicate = (service as any).duplicateModule.bind(service);
    
    const source = mod(1, 0, 0);
    source.rackingData.selectedPanelId = 3;
    const rows = [[source]];
    
    duplicate(rows, rows[0][0]);
    
    expect(rows[0].length).toBe(2);
    expect(rows[0][1].rackingData.selectedPanelId).toBe(3);
    expect(rows[0][1].rackingData.id).toBeUndefined();
  });

  it('strips module identifiers when copying to new rack and detects unsynced modules', () => {
    const {service} = build();
    const strip = (service as any).removeInformationFromModulesOfCurrentRack.bind(service);
    
    service.rowedRackedModules$.next([[mod(1, 0, 0), mod(2, 0, 1)]]);
    const copied = strip(77);
    
    expect(copied[0][0].rackingData.rackid).toBe(77);
    expect(copied[0][0].rackingData.id).toBeUndefined();
    expect(isAnyModuleWithoutRackingId(copied)).toBeTrue();
  });
  
  it('syncs rack modules through backend and refreshes rack when missing ids exist', () => {
    const {service, backend} = build();
    const sync = (service as any).callBackendToUpdateModulesOfRack.bind(service);
    const rack = {id: 1, name: 'Rack', rows: 2, hp: 84} as any;
    const nextSpy = spyOn(service.singleRackData$, 'next').and.callThrough();
    const rows = [[mod(undefined as any, 0, 0), mod(2, 0, 1)]];
    
    sync(rows, rack).subscribe();
    
    expect(backend.update.rackedModules).toHaveBeenCalledWith(rows.flatMap(x => x));
    expect(nextSpy).toHaveBeenCalledWith(rack);
  });
  
  it('creates duplicated rack payload for current user without reusing preview media and confirms duplication dialog', () => {
    const {service, backend, dialog} = build();
    const create = (service as any).createNewRackOnBackendForCurrentUser.bind(service);
    const ask = (service as any).askForConfirmationWhenDuplicatingRack.bind(service);
    service.singleRackData$.next({
      name: 'Demo Rack',
      hp: 104,
      rows: 3,
      image: 'img.jpg'
    } as any);
    
    create('user-2').subscribe();
    
    expect(backend.add.rack).toHaveBeenCalledWith({
      name: 'Demo Rack V2',
      hp: 104,
      rows: 3,
      public: true,
      locked: false
    });
    
    ask().subscribe(value => {
      expect(value).toEqual({answer: true});
    });
    expect(dialog.open).toHaveBeenCalled();
  });
});
