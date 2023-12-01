import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UserModulesComponent } from './user-modules.component';
import { ModuleUtilService } from 'src/app/services/module-util.service';

describe('UserModulesComponent', () => {
  let component: UserModulesComponent;
  let fixture: ComponentFixture<UserModulesComponent>;
  let moduleUtilService: ModuleUtilService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ UserModulesComponent ],
      providers: [ ModuleUtilService ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(UserModulesComponent);
    component = fixture.componentInstance;
    moduleUtilService = TestBed.inject(ModuleUtilService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should sort modules correctly', () => {
    const mockModules = [
      { name: 'Module 1', type: 'Type B', manufacturer: 'Manufacturer A' },
      { name: 'Module 2', type: 'Type A', manufacturer: 'Manufacturer B' },
      { name: 'Module 3', type: 'Type C', manufacturer: 'Manufacturer C' }
    ];
    component.onSortChange('type');
    expect(moduleUtilService.sortModules(mockModules, 'type')).toEqual([
      { name: 'Module 2', type: 'Type A', manufacturer: 'Manufacturer B' },
      { name: 'Module 1', type: 'Type B', manufacturer: 'Manufacturer A' },
      { name: 'Module 3', type: 'Type C', manufacturer: 'Manufacturer C' }
    ]);
  });

  it('should group modules correctly', () => {
    const mockModules = [
      { name: 'Module 1', type: 'Type B', manufacturer: 'Manufacturer A' },
      { name: 'Module 2', type: 'Type A', manufacturer: 'Manufacturer B' },
      { name: 'Module 3', type: 'Type B', manufacturer: 'Manufacturer C' }
    ];
    component.onGroupChange('type');
    expect(moduleUtilService.groupModulesByType(mockModules)).toEqual({
      'Type A': [{ name: 'Module 2', type: 'Type A', manufacturer: 'Manufacturer B' }],
      'Type B': [
        { name: 'Module 1', type: 'Type B', manufacturer: 'Manufacturer A' },
        { name: 'Module 3', type: 'Type B', manufacturer: 'Manufacturer C' }
      ]
    });
  });
});
