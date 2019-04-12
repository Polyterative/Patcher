import {
  async,
  ComponentFixture,
  TestBed
} from '@angular/core/testing';

import { LandingPageComponent } from 'src/app/Pages/landing-page/landing-page.component';

describe('LandingPageComponent', () => {
  let component: LandingPageComponent;
  let fixture: ComponentFixture<LandingPageComponent>;
  
  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [LandingPageComponent]
    })
      .compileComponents();
  }));
  
  beforeEach(() => {
    fixture = TestBed.createComponent(LandingPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });
  
  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
