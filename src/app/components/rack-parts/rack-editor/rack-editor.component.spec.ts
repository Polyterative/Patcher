import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { RackEditorComponent } from './rack-editor.component';

describe('RackEditorComponent', () => {
  let component: RackEditorComponent;
  let fixture: ComponentFixture<RackEditorComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ RackEditorComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(RackEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // Identify an important functionality of the 'RackEditorComponent' to test.
  // This could be a method or a property that is crucial for the component's operation.
  // Write a test for the identified functionality. The specifics of this test will depend on the functionality being tested.
});
