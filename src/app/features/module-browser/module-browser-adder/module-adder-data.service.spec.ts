import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute } from '@angular/router';

import { ModuleAdderDataService } from './module-adder-data.service';
import { SupabaseService } from '../../backend/supabase.service';

describe('ModuleAdderDataService', () => {
  let service: ModuleAdderDataService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ModuleAdderDataService, SupabaseService, ActivatedRoute]
    });
    service = TestBed.inject(ModuleAdderDataService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
  
  it('should return the list of modules', () => {
    // Arrange
    const expectedModules = [
      { id: 1, name: 'Module 1' },
      { id: 2, name: 'Module 2' },
      { id: 3, name: 'Module 3' }
    ];
    spyOn(service, 'getModules').and.returnValue(expectedModules);
  
    // Act
    const result = service.getModules();
  
    // Assert
    expect(result).toEqual(expectedModules);
  });
  
  it('should add a new module', () => {
    // Arrange
    const newModule = { id: 4, name: 'Module 4' };
    spyOn(service, 'addModule');
  
    // Act
    service.addModule(newModule);
  
    // Assert
    expect(service.addModule).toHaveBeenCalledWith(newModule);
  });
  
  it('should delete a module', () => {
    // Arrange
    const moduleId = 3;
    spyOn(service, 'deleteModule');
  
    // Act
    service.deleteModule(moduleId);
  
    // Assert
    expect(service.deleteModule).toHaveBeenCalledWith(moduleId);
  });

  // Add more test cases to cover the desired functionality of the ModuleAdderDataService class

});
