src/app/components/module-parts/module-cv-icon/module-cv-icon.component.spec.ts

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModuleCvIconComponent } from './module-cv-icon.component';

describe('ModuleCvIconComponent', () => {
  let component: ModuleCvIconComponent;
  let fixture: ComponentFixture<ModuleCvIconComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ModuleCvIconComponent]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ModuleCvIconComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
