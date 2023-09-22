import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModuleEditorComponent } from '../module-editor.component';

describe('ModuleEditorComponent', () => {
  let component: ModuleEditorComponent;
  let fixture: ComponentFixture<ModuleEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ModuleEditorComponent]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ModuleEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should do something', () => {
    // Write your test case here
  });
});
