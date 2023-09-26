src/app/features/backbone/home/home.component.spec.ts

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HomeComponent } from './home.component';

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [HomeComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the app', () => {
    expect(component).toBeTruthy();
  });

  it('should display the homepage correctly', () => {
    // Access necessary elements in the component's HTML template
    const homepageElement = fixture.nativeElement.querySelector('.homepage');
    const titleElement = fixture.nativeElement.querySelector('.title');
  
    // Assert presence or values of elements
    expect(homepageElement).toBeTruthy();
    expect(titleElement.textContent).toEqual('Welcome to the Homepage');
  });
});
