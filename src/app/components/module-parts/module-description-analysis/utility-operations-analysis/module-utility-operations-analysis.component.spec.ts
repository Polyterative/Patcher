import {
  ComponentFixture,
  TestBed
} from '@angular/core/testing';
import { ModuleUtilityOperationsAnalysisComponent } from './module-utility-operations-analysis.component';

describe('ModuleUtilityOperationsAnalysisComponent', () => {
  let fixture: ComponentFixture<ModuleUtilityOperationsAnalysisComponent>;
  let component: ModuleUtilityOperationsAnalysisComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModuleUtilityOperationsAnalysisComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ModuleUtilityOperationsAnalysisComponent);
    component = fixture.componentInstance;
  });

  it('renders operation matrix tokens', () => {
    component.description = 'Logic AND plus slew and offset utilities.';
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.moduleUtilityOperationsAnalysis')).toBeTruthy();
    expect(fixture.nativeElement.querySelectorAll('.moduleUtilityOperationsAnalysis__token').length).toBe(3);
    expect(fixture.nativeElement.textContent).toContain('AND');
    expect(fixture.nativeElement.textContent).toContain('Slew');
  });
});
