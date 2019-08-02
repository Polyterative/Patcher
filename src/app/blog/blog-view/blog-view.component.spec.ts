import {
  async,
  ComponentFixture,
  TestBed
} from '@angular/core/testing';

import { BlogViewComponent } from './blog-view.component';

describe('BlogViewComponent', () => {
  let component: BlogViewComponent;
  let fixture: ComponentFixture<BlogViewComponent>;
  
  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [BlogViewComponent]
    })
      .compileComponents();
  }));
  
  beforeEach(() => {
    fixture = TestBed.createComponent(BlogViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });
  
  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
