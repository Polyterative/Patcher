import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModuleBrowserAdderComponent } from './module-browser-adder.component';

describe('ModuleBrowserAdderComponent', () => {
  let component: ModuleBrowserAdderComponent;
  let fixture: ComponentFixture<ModuleBrowserAdderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ModuleBrowserAdderComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ModuleBrowserAdderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have addModule method and modules array', () => {
    expect(component.addModule).toBeDefined();
    expect(component.modules).toBeDefined();
  });
  
  it('should add a new module', () => {
    const initialModulesLength = component.modules.length;
    component.addModule();
    expect(component.modules.length).toBe(initialModulesLength + 1);
  });
});
