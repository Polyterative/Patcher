import {
  async,
  ComponentFixture,
  TestBed
} from '@angular/core/testing';

import { LangingPageComponent } from 'src/app/Pages/landing-page/langing-page.component';

describe('LangingPageComponent', () => {
  let component: LangingPageComponent;
  let fixture: ComponentFixture<LangingPageComponent>;
  
  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [LangingPageComponent]
    })
      .compileComponents();
  }));
  
  beforeEach(() => {
    fixture = TestBed.createComponent(LangingPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });
  
  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
