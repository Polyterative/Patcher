import { ComponentFixture, TestBed, async } from '@angular/core/testing';
import { PatchMinimalComponent } from './patch-minimal.component';

describe('PatchMinimalComponent', () => {
  let component: PatchMinimalComponent;
  let fixture: ComponentFixture<PatchMinimalComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ PatchMinimalComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PatchMinimalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should generate patch text correctly', () => {
    const mockPatch = {
      name: 'Test Patch',
      connections: [
        { source: 'Source 1', target: 'Target 1' },
        { source: 'Source 2', target: 'Target 2' }
      ]
    };

    component.data = mockPatch;

    const expectedPatchText = `Patch name "Test Patch"\nSource 1 => Target 1\nSource 2 => Target 2\n`;

    expect(component.generatePatchText()).toEqual(expectedPatchText);
  });
});
