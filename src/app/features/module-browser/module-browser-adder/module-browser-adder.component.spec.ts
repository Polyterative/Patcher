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

  it('should add a new module', () => {
    // Assuming addModule is a method in the component that adds a new module
    component.addModule();
    // Assuming modules is an array in the component that holds the modules
    expect(component.modules.length).toBeGreaterThan(0);
  });
});
