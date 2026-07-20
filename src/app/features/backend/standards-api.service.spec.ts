import { of } from 'rxjs';
import { StandardsApiService } from './standards-api.service';

describe('StandardsApiService', () => {
  it('delegates standard list loading to SupabaseService', () => {
    const response$ = of({data: [{id: 1, name: 'Eurorack'}]});
    const backend = {
      get: {
        standards: jasmine.createSpy('standards').and.returnValue(response$)
      }
    };

    const service = new StandardsApiService(backend as unknown as ConstructorParameters<typeof StandardsApiService>[0]);

    expect(service.list()).toBe(response$);
    expect(backend.get.standards).toHaveBeenCalledTimes(1);
  });
});
