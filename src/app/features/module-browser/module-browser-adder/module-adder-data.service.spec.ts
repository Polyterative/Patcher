import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { ModuleAdderDataService } from './module-adder-data.service';

describe('ModuleAdderDataService', () => {
  let service: ModuleAdderDataService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ModuleAdderDataService]
    });
    service = TestBed.inject(ModuleAdderDataService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize similarModulesData$ BehaviorSubject', () => {
    expect(service.similarModulesData$).toBeDefined();
    expect(service.similarModulesData$.getValue()).toBeUndefined();
  });

  // Add more test cases as needed

});
