import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { MatDividerModule } from '@angular/material/divider';
import { of } from 'rxjs';

import { BrandPrimaryButtonModule } from '../../../shared-interproject/components/@visual/brand-primary-button/brand-primary-button.module';
import { DeviceFrameWrapperModule } from '../../../shared-interproject/components/@visual/device-frame-wrapper/device-frame-wrapper.module';
import { HeroHeaderModule } from '../../../shared-interproject/components/@visual/hero-header/hero-header.module';
import { HomeComponent } from './home.component';
import { ScreenWrapperModule } from '../../../shared-interproject/components/@visual/screen-wrapper/screen-wrapper.module';
import { SupabaseService } from '../../backend/supabase.service';

beforeEach(() => {
  fixture = TestBed.createComponent(HomeComponent);
  component = fixture.componentInstance;
  fixture.detectChanges();
  spyOn(mockSupabaseService, 'get').and.callThrough();
  mockSupabaseService.get();
});
    
      await TestBed.configureTestingModule({
        declarations: [HomeComponent],
        imports: [
          ScreenWrapperModule,
          MatDividerModule,
          HeroHeaderModule,
          DeviceFrameWrapperModule,
          BrandPrimaryButtonModule
        ],
        providers: [{ provide: SupabaseService, useValue: mockSupabaseService }]
      }).compileComponents();
    });
  
    beforeEach(() => {
      fixture = TestBed.createComponent(HomeComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
      spyOn(mockSupabaseService, 'get').and.callThrough();
    });
    
    // ... rest of the code
  });

  ""
  
  it('should create the HomeComponent', () => {
    expect(component).toBeTruthy();
    fixture.detectChanges();
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
