import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import {
  ComponentFixture,
  TestBed
} from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { SupabaseService } from '../../backend/supabase.service';
import { SeoAndUtilsService } from '../../backbone/seo-and-utils.service';
import { ModuleBrowserDataService } from '../module-browser-data.service';
import { ModuleBrowserRootComponent } from './module-browser-root.component';


describe('ModuleBrowserRootComponent', () => {
  let fixture: ComponentFixture<ModuleBrowserRootComponent>;
  
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ModuleBrowserRootComponent],
      imports: [
        CommonModule,
        ReactiveFormsModule
      ],
      providers: [
        ModuleBrowserDataService,
        {
          provide: SupabaseService,
          useValue: {
            GET: {
              manufacturers: jasmine.createSpy('manufacturers').and.returnValue(of({data: []})),
              modules: jasmine.createSpy('modules').and.returnValue(of({data: [], count: 0}))
            },
            get: {
              allTags: jasmine.createSpy('allTags').and.returnValue(of([]))
            },
            cacheResetter$: {next: jasmine.createSpy('cacheResetter$.next')}
          }
        },
        {
          provide: SeoAndUtilsService,
          useValue: {updateSeo: jasmine.createSpy('updateSeo')}
        },
        {
          provide: ActivatedRoute,
          useValue: {queryParams: of({})}
        }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();
    
    fixture = TestBed.createComponent(ModuleBrowserRootComponent);
    fixture.detectChanges();
  });
  
  it('renders recent activity component in filter sidebar', () => {
    const host = fixture.nativeElement as HTMLElement;
    const sidebar = host.querySelector('.filter-sidebar');
    const recentActivity = sidebar?.querySelector('app-recent-activity');
    expect(recentActivity).not.toBeNull();
  });
});