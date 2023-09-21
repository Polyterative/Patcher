import { TestBed } from '@angular/core/testing';
import { ModuleAdderDataService } from './module-adder-data.service';

describe('ModuleAdderDataService', () => {
  let service: ModuleAdderDataService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ModuleAdderDataService);
  });

  it('should always return true', () => {
    const result = service.alwaysTrue();
    expect(result).toBeTrue();
  });
});
