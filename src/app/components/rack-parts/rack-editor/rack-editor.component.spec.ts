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
  
  it('should update rack details', () => {
    // Arrange
    const rackDetails = { id: 1, name: 'Rack 1', location: 'Location 1' };
    component.rack = { id: 2, name: 'Rack 2', location: 'Location 2' };
  
    // Act
    component.updateRack(rackDetails);
  
    // Assert
    expect(component.rack).toEqual(rackDetails);
  });
});

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
  
  // Let's assume that the RackEditorComponent has a method called 'updateRack' that updates the rack details.
  // We will write a test to verify that this method is working as expected.
  it('should update rack details', () => {
    // Arrange
    const rackDetails = { id: 1, name: 'Rack 1', location: 'Location 1' };
    component.rack = { id: 2, name: 'Rack 2', location: 'Location 2' };
  
    // Act
    component.updateRack(rackDetails);
  
    // Assert
    expect(component.rack).toEqual(rackDetails);
  });
