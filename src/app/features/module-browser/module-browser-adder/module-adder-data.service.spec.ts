import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { ModuleAdderDataService } from './module-adder-data.service';
import { SupabaseService } from '../../backend/supabase.service';

describe('ModuleAdderDataService', () => {
  let service: ModuleAdderDataService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ModuleAdderDataService, SupabaseService]
    });
    service = TestBed.inject(ModuleAdderDataService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // Add more test cases to cover the desired functionality of the ModuleAdderDataService class

});
