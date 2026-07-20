import { of } from 'rxjs';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { ManufacturerRowDataService } from './manufacturer-row-data.service';


describe('ManufacturerRowDataService', () => {
  function build() {
    const modules = [{id: 1}];
    const summaries = [{moduleId: 1}];
    const backend = {
      get: {
        modulesBySameManufacturer: jasmine.createSpy('modulesBySameManufacturer').and.returnValue(of(modules))
      },
      GET: {
        recentModuleMarketPrices: jasmine.createSpy('recentModuleMarketPrices').and.returnValue(of(summaries))
      },
      storage: {
        publicUrlBases: {
          manufacturerLogos: 'https://cdn.example.test/manufacturer-logos/'
        }
      }
    };

    return {
      backend,
      modules,
      service: new ManufacturerRowDataService(backend as unknown as SupabaseService),
      summaries,
    };
  }

  it('exposes the backend manufacturer logo storage base', () => {
    const {service} = build();

    expect(service.logoStorageBase).toBe('https://cdn.example.test/manufacturer-logos/');
  });

  it('loads the first manufacturer row module page', () => {
    const {backend, service} = build();

    service.modulesBySameManufacturer(42).subscribe();

    expect(backend.get.modulesBySameManufacturer).toHaveBeenCalledOnceWith(42, 0, 29);
  });

  it('loads recent market prices through the backend API', () => {
    const {backend, service} = build();

    service.recentModuleMarketPrices([2, 1]).subscribe();

    expect(backend.GET.recentModuleMarketPrices).toHaveBeenCalledOnceWith([2, 1]);
  });
});
