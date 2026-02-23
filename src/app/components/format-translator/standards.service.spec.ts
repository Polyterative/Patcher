import {
  Observable,
  of
} from 'rxjs';
import { StandardsService } from './standards.service';


describe('StandardsService', () => {
  it('loads standards on init and sorts by id', () => {
    const backend = {
      get: {
        standards: jasmine.createSpy('standards').and.returnValue(
          of({
            data: [
              {id: 3, name: 'c'},
              {id: 1, name: 'a'},
              {id: 2, name: 'b'}
            ]
          })
        )
      }
    };
    
    const service = new StandardsService(backend as any);
    
    expect(backend.get.standards).toHaveBeenCalledTimes(1);
    expect(service.standards.data$.value?.map(x => x.id)).toEqual([1, 2, 3]);
  });
  
  it('resets data before each update request', () => {
    const backend = {
      get: {
        standards: jasmine.createSpy('standards').and.returnValue(of({data: []}))
      }
    };
    const service = new StandardsService(backend as any);
    service.standards.data$.next([{id: 99} as any]);
    
    backend.get.standards.and.returnValue(
      new Observable(observer => {
        expect(service.standards.data$.value).toBeUndefined();
        observer.next({data: [{id: 2}, {id: 1}]});
        observer.complete();
      })
    );
    
    service.standards.update$.next();
    
    expect(service.standards.data$.value?.map(x => x.id)).toEqual([1, 2]);
  });
});