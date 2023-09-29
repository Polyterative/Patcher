import { TestBed, ComponentFixture } from '@angular/core/testing';
import { HomeComponent } from './home.component';
import { By } from '@angular/platform-browser';
import { SupabaseService } from '../../backend/supabase.service';

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;
  let mockSupabaseService;

  beforeEach(async () => {
    mockSupabaseService = jasmine.createSpyObj(['get']);

    await TestBed.configureTestingModule({
      declarations: [HomeComponent],
      providers: [
        { provide: SupabaseService, useValue: mockSupabaseService }
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the HomeComponent', () => {
    expect(component).toBeTruthy();
  });

  it('should display the correct title', () => {
    const titleElement = fixture.debugElement.query(By.css('h1')).nativeElement;
    expect(titleElement.textContent).toContain('PATCHER.XYZ');
  });

  it('should display the homepage content correctly', () => {
    const contentElement = fixture.debugElement.query(By.css('.homeBG')).nativeElement;
    expect(contentElement.textContent).toContain('the modern way to manage everything modular');
  });

  it('should call SupabaseService correctly', () => {
    expect(mockSupabaseService.get).toHaveBeenCalled();
  });
});
