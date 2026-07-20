import {
  firstValueFrom,
  of
} from 'rxjs';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { RackModuleAdderDataService } from './rack-module-adder-data.service';

describe('RackModuleAdderDataService', () => {
  function build() {
    const backend = {
      add: {
        rackModule: jasmine.createSpy('rackModule').and.returnValue(of({data: [{id: 1}]}))
      }
    };

    return {
      service: new RackModuleAdderDataService(backend as unknown as SupabaseService),
      backend
    };
  }

  it('adds the selected module to the selected rack through the backend API', async () => {
    const {service, backend} = build();

    await firstValueFrom(service.addModuleToRack$(77, '2'));

    expect(backend.add.rackModule).toHaveBeenCalledOnceWith(77, 2);
  });

  it('rejects invalid rack ids before calling the backend API', async () => {
    const {service, backend} = build();

    await expectAsync(firstValueFrom(service.addModuleToRack$(77, 'not-a-rack'))).toBeRejectedWithError(
      'A valid rack id is required.'
    );
    expect(backend.add.rackModule).not.toHaveBeenCalled();
  });
});
