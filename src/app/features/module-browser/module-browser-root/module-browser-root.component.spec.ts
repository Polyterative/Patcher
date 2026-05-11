import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import {
  ComponentFixture,
  TestBed
} from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { MinimalModule } from 'src/app/models/module';
import { SupabaseService } from '../../backend/supabase.service';
import { SeoAndUtilsService } from '../../backbone/seo-and-utils.service';
import { ModuleBrowserDataService } from '../module-browser-data.service';
import { ModuleBrowserRootComponent } from './module-browser-root.component';


describe('ModuleBrowserRootComponent', () => {
  let fixture: ComponentFixture<ModuleBrowserRootComponent>;
  let component: ModuleBrowserRootComponent;

  function buildOwnedModules(count: number): MinimalModule[] {
    return Array.from({length: count}, (_, index) => ({
      id: index + 1,
      name: `Module ${ index + 1 }`,
      description: 'Owned module',
      hp: index + 2,
      public: true,
      created: '2026-01-01T00:00:00.000Z',
      updated: '2026-01-01T00:00:00.000Z',
      manufacturerId: 1,
      manufacturer: {id: 1, name: 'Maker'} as any,
      standard: {id: 0, name: '3U Doepfer'} as any,
      tags: [],
      panels: []
    }));
  }
  
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
    component = fixture.componentInstance;
    fixture.detectChanges();
  });
  
  it('renders recent activity component in filter sidebar', () => {
    const host = fixture.nativeElement as HTMLElement;
    const sidebar = host.querySelector('.filter-sidebar');
    const recentActivity = sidebar?.querySelector('app-recent-activity');
    expect(recentActivity).not.toBeNull();
  });

  it('defaults to full catalog when owned collection is below the adaptive threshold', () => {
    component.enableCollectionBrowseModes = true;
    component.ownedModulesInput = buildOwnedModules(5);
    fixture.detectChanges();

    expect(component.collectionBrowseMode).toBe('all');
  });

  it('defaults to collection mode and hp ordering when collection meets the adaptive threshold with an empty rack', () => {
    component.enableCollectionBrowseModes = true;
    component.ownedModulesInput = buildOwnedModules(20);
    fixture.detectChanges();

    expect(component.collectionBrowseMode).toBe('owned');
    expect(component.dataService.fields.order.control.value).toEqual({id: 'hp', name: 'HP ↑'});
  });

  it('defaults to available mode once the rack already contains modules', () => {
    component.enableCollectionBrowseModes = true;
    component.ownedModulesInput = buildOwnedModules(20);
    component.currentRackModulesInput = [[{
      module: buildOwnedModules(1)[0]
    } as any]];
    fixture.detectChanges();

    expect(component.collectionBrowseMode).toBe('available');
  });

  it('renders the rack-aware mode labels in rack editing context', () => {
    component.enableCollectionBrowseModes = true;
    component.ownedModulesInput = buildOwnedModules(2);
    component.currentRackModulesInput = [[{
      module: buildOwnedModules(1)[0]
    } as any]];
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('Available');
    expect(host.textContent).toContain('Collection');
    expect(host.textContent).toContain('All modules');
  });

  it('falls back to collection mode when available mode is no longer possible', () => {
    component.enableCollectionBrowseModes = true;
    component.ownedModulesInput = buildOwnedModules(20);
    component.currentRackModulesInput = [[{
      module: buildOwnedModules(1)[0]
    } as any]];
    fixture.detectChanges();

    expect(component.collectionBrowseMode).toBe('available');

    component.currentRackModulesInput = [];
    fixture.detectChanges();

    expect(component.collectionBrowseMode).toBe('owned');
  });

  it('resets all-modules mode to the normal module-browser default order', () => {
    component.enableCollectionBrowseModes = true;
    component.ownedModulesInput = buildOwnedModules(20);
    fixture.detectChanges();

    component.setCollectionBrowseMode('all');

    expect(component.dataService.fields.order.control.value).toEqual(component.dataService.orderStartingValue);
    expect(component.dataService.serversideTableRequestData.sort$.value).toEqual(['updated', 'desc']);
  });
});
