import {
  Observable,
  of
} from 'rxjs';
import { StandardsService } from './standards.service';


describe('StandardsService', () => {
  it('loads standards on init and sorts by id', () => {
    const standardsApi = {
      list: jasmine.createSpy('list').and.returnValue(
        of({
          data: [
            {id: 3, name: 'c'},
            {id: 1, name: 'a'},
            {id: 2, name: 'b'}
          ]
        })
      )
    };
    
    const service = new StandardsService(standardsApi as unknown as ConstructorParameters<typeof StandardsService>[0]);
    
    expect(standardsApi.list).toHaveBeenCalledTimes(1);
    expect(service.standards.data$.value?.map(x => x.id)).toEqual([1, 2, 3]);
  });
  
  it('initialises standards data as undefined before the first backend response', () => {
    let resolveStandards!: (val: unknown) => void;
    const pendingStandards = new Promise(resolve => { resolveStandards = resolve; });

    const standardsApi = {
      list: jasmine.createSpy('list').and.returnValue(
        new Observable(observer => {
          pendingStandards.then(() => {
            observer.next({ data: [{ id: 1, name: 'Eurorack' }] });
            observer.complete();
          });
        })
      )
    };

    const service = new StandardsService(standardsApi as unknown as ConstructorParameters<typeof StandardsService>[0]);
    expect(service.standards.data$.value).toBeUndefined();
    resolveStandards(null);
  });

  it('handles empty standards list gracefully', () => {
    const standardsApi = {
      list: jasmine.createSpy('list').and.returnValue(of({ data: [] }))
    };
    const service = new StandardsService(standardsApi as unknown as ConstructorParameters<typeof StandardsService>[0]);
    expect(service.standards.data$.value).toEqual([]);
  });

  it('handles null standards responses gracefully', () => {
    const standardsApi = {
      list: jasmine.createSpy('list').and.returnValue(of({ data: null }))
    };
    const service = new StandardsService(standardsApi as unknown as ConstructorParameters<typeof StandardsService>[0]);
    expect(service.standards.data$.value).toEqual([]);
  });

  it('resets data before each update request', () => {
    const standardsApi = {
      list: jasmine.createSpy('list').and.returnValue(of({data: []}))
    };
    const service = new StandardsService(standardsApi as unknown as ConstructorParameters<typeof StandardsService>[0]);
    service.standards.data$.next([{id: 99, name: 'legacy'}]);
    
    standardsApi.list.and.returnValue(
      new Observable(observer => {
        expect(service.standards.data$.value).toBeUndefined();
        observer.next({data: [{id: 2, name: 'b'}, {id: 1, name: 'a'}]});
        observer.complete();
      })
    );
    
    service.standards.update$.next();
    
    expect(service.standards.data$.value?.map(x => x.id)).toEqual([1, 2]);
  });
});