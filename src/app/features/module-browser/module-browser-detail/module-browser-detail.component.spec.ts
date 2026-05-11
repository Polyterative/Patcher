import {
  NO_ERRORS_SCHEMA
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ComponentFixture,
  TestBed
} from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router } from '@angular/router';
import {
  BehaviorSubject,
  of,
  Subject
} from 'rxjs';
import { ModuleDetailDataService } from 'src/app/components/module-parts/module-detail-data.service';
import { CommentsDataService } from 'src/app/components/shared-atoms/comments/comments-data.service';
import { SeoAndUtilsService } from '../../backbone/seo-and-utils.service';
import { AppStateService } from "src/app/shared-interproject/app-state.service";
import { UserManagementService } from "src/app/features/backbone/login/user-management.service";
import { ModuleBrowserDetailComponent } from './module-browser-detail.component';


describe('ModuleBrowserDetailComponent', () => {
  function build() {
    const routeParams$ = new Subject<any>();
    const singleModuleData$ = new BehaviorSubject<any>(undefined);
    const updateSingleModuleData$ = new Subject<number>();
    const changeModule$ = new Subject<any>();
    const requestModuleEditingToggle$ = new Subject<void>();
    const deleteModuleAndOrphanManufacturer$ = new Subject<any>();
    
    const dataService = {
      singleModuleData$,
      updateSingleModuleData$,
      changeModule$,
      requestModuleEditingToggle$,
      deleteModuleAndOrphanManufacturer$
    };
    
    const route = {
      params: routeParams$.asObservable()
    };
    
    const router = jasmine.createSpyObj('Router', ['navigate']);
    const seoAndUtilsService = {
      updateSeo: jasmine.createSpy('updateSeo')
    };
    const commentsDataService = {
      requestCommentsUpdate$: {next: jasmine.createSpy('requestCommentsUpdate.next')},
      requestReset$: {next: jasmine.createSpy('requestReset.next')}
    };
    
    const component = new ModuleBrowserDetailComponent(
      dataService as any,
      route as any,
      router,
      seoAndUtilsService as any,
      {} as any,
      commentsDataService as any,
      {} as any
    );
    
    return {
      component,
      routeParams$,
      dataService,
      seoAndUtilsService,
      commentsDataService
    };
  }
  
  function moduleFixture() {
    return {
      id: 99,
      name: 'Mega Osc',
      manufacturer: {id: 5, name: 'Maker'},
      manufacturerId: 5,
      hp: 12,
      standard: {id: 0, name: 'Doepfer'},
      created: '2024-01-01',
      updated: '2024-01-02',
      isComplete: true,
      isApproved: false,
      isDIY: false,
      panels: [],
      tags: [{tag: {name: 'fm'}}, {tag: {name: 'analog'}}],
      ins: [{name: 'cv in'}],
      outs: [{name: 'audio out'}],
      manualURL: 'https://example.com/manual'
    };
  }

  async function render(options: {isDev?: boolean; isAdmin?: boolean; user?: any} = {}): Promise<{
    fixture: ComponentFixture<ModuleBrowserDetailComponent>;
    dataService: any;
    loggedUser$: BehaviorSubject<any>;
  }> {
    TestBed.resetTestingModule();

    const loggedUser$ = new BehaviorSubject<any>(options.user ?? {id: 'user-1'});
    const dataService = {
      singleModuleData$: new BehaviorSubject<any>(moduleFixture()),
      racksWithThisModule$: new BehaviorSubject<any[]>([]),
      patchesWithThisModule$: new BehaviorSubject<any[]>([]),
      moduleUsageSummary$: new BehaviorSubject<any>({
        public_rack_count: 0,
        hidden_rack_bucket: 'none',
        public_patch_count: 0,
        hidden_patch_bucket: 'none'
      }),
      modulesBySameManufacturer$: new BehaviorSubject<any[]>([]),
      moduleEditingPanelOpenState$: new BehaviorSubject<boolean>(false),
      moduleEditorHasPendingChanges$: new BehaviorSubject<boolean>(false),
      isAdmin$: new BehaviorSubject<boolean>(!!options.isAdmin),
      updateSingleModuleData$: new Subject<number>(),
      changeModule$: new Subject<any>(),
      requestModuleEditingToggle$: new Subject<void>(),
      deleteModuleAndOrphanManufacturer$: new Subject<any>(),
      deleteModule$: new Subject<number>(),
      deleteLastPanel$: new Subject<any>()
    };
    const commentsDataService = {
      requestCommentsUpdate$: {next: jasmine.createSpy('requestCommentsUpdate.next')},
      requestReset$: {next: jasmine.createSpy('requestReset.next')}
    };

    await TestBed.configureTestingModule({
      declarations: [ModuleBrowserDetailComponent],
      imports: [CommonModule, FormsModule, NoopAnimationsModule],
      providers: [
        {provide: ModuleDetailDataService, useValue: dataService},
        {provide: ActivatedRoute, useValue: {params: of({})}},
        {provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate'])},
        {provide: SeoAndUtilsService, useValue: {updateSeo: jasmine.createSpy('updateSeo')}},
        {
          provide: AppStateService,
          useValue: {
            isDev: !!options.isDev,
            preferredPanelColor$: of(null)
          }
        },
        {provide: UserManagementService, useValue: {loggedUser$}}
      ],
      schemas: [NO_ERRORS_SCHEMA]
    })
      .overrideComponent(ModuleBrowserDetailComponent, {
        set: {
          providers: [{provide: CommentsDataService, useValue: commentsDataService}]
        }
      })
      .compileComponents();

    const fixture = TestBed.createComponent(ModuleBrowserDetailComponent);
    fixture.componentInstance.ignoreSeo = true;
    fixture.detectChanges();

    return {fixture, dataService, loggedUser$};
  }
  
  it('initializes SEO baseline and parses route id updates', () => {
    const {component, routeParams$, dataService, seoAndUtilsService} = build();
    const updateSpy = spyOn(dataService.updateSingleModuleData$, 'next').and.callThrough();
    
    component.ngOnInit();
    routeParams$.next({id: '42'});
    
    expect(seoAndUtilsService.updateSeo).toHaveBeenCalledWith({}, 'Module Details');
    expect(updateSpy).toHaveBeenCalledWith(42);
  });
  
  it('pushes module context to comments service and updates SEO details', () => {
    const {component, dataService, commentsDataService, seoAndUtilsService} = build();
    component.ngOnInit();
    
    dataService.singleModuleData$.next(moduleFixture());
    
    expect(commentsDataService.requestCommentsUpdate$.next).toHaveBeenCalledWith({
      entityId: 99,
      entityType: 1
    });
    expect(seoAndUtilsService.updateSeo).toHaveBeenCalledWith(
      jasmine.objectContaining({
        title: 'Mega Osc - details.'
      }),
      'Mega Osc by Maker - Module Details'
    );
  });
  
  it('resets comments when incoming module id is falsy', () => {
    const {component, dataService, commentsDataService} = build();
    component.ngOnInit();
    
    dataService.updateSingleModuleData$.next(0 as any);
    
    expect(commentsDataService.requestReset$.next).toHaveBeenCalled();
  });

  it('shows hidden rack and patch usage when public lists are empty', async () => {
    const {fixture, dataService} = await render();

    dataService.moduleUsageSummary$.next({
      public_rack_count: 0,
      hidden_rack_bucket: 'some',
      public_patch_count: 0,
      hidden_patch_bucket: 'some'
    });
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('No public racks using this module yet. It still appears in some private or otherwise hidden racks.');
    expect(text).toContain('No public patches using this module yet. It still appears in some private or otherwise hidden patches.');
  });

  it('keeps empty usage states pending until the hidden-usage summary arrives', async () => {
    const {fixture, dataService} = await render();

    dataService.moduleUsageSummary$.next(undefined);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Checking private and hidden rack usage...');
    expect(text).toContain('Checking private and hidden patch usage...');
  });

  it('shows hidden usage supplements alongside public lists', async () => {
    const {fixture, dataService} = await render();

    dataService.racksWithThisModule$.next([{id: 1, name: 'Rack 1'}]);
    dataService.patchesWithThisModule$.next([{id: 1, name: 'Patch 1'}]);
    dataService.moduleUsageSummary$.next({
      public_rack_count: 1,
      hidden_rack_bucket: '10_plus',
      public_patch_count: 1,
      hidden_patch_bucket: '5_plus'
    });
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Plus 10+ private or otherwise hidden racks.');
    expect(text).toContain('Plus 5+ private or otherwise hidden patches.');
  });
  
  it('emits expected patch payloads for dev helpers', () => {
    const {component, dataService} = build();
    const emitted: any[] = [];
    dataService.changeModule$.subscribe(x => emitted.push(x));
    
    component.setDevStandard(2);
    component.setDevComplete(true);
    component.setDevApproved(true);
    component.setDevDIY(true);
    component.adjustDevHp({hp: 12} as any, -5);
    component.adjustDevHp({hp: 12} as any, -1);
    component.adjustDevHp({hp: 12} as any, 1);
    component.adjustDevHp({hp: 12} as any, 5);
    component.adjustDevHp({hp: 0} as any, -1);
    component.adjustDevHp({hp: 3} as any, -5);
    component.trimDevTextFields({
      name: '  My   Module ',
      description: '  rich   text  ',
      manualURL: '  https://manual  '
    } as any);
    component.clearDevManualUrl();
    component.clampDevNumericFields({
      hp: -1,
      depth: NaN,
      weight: 10,
      powerPos12: -5,
      powerNeg12: 1,
      powerPos5: Number.POSITIVE_INFINITY
    } as any);
    
    expect(emitted[0]).toEqual({standard: {id: 2, name: ''}});
    expect(emitted[1]).toEqual({isComplete: true});
    expect(emitted[2]).toEqual({isApproved: true});
    expect(emitted[3]).toEqual({isDIY: true});
    expect(emitted[4]).toEqual({hp: 7});
    expect(emitted[5]).toEqual({hp: 11});
    expect(emitted[6]).toEqual({hp: 13});
    expect(emitted[7]).toEqual({hp: 17});
    expect(emitted[8]).toEqual({hp: 0});
    expect(emitted[9]).toEqual({hp: 0});
    expect(emitted[10]).toEqual({
      name: 'My Module',
      description: 'rich text',
      manualURL: 'https://manual'
    });
    expect(emitted[11]).toEqual({manualURL: ''});
    expect(emitted[12]).toEqual({
      hp: 0,
      depth: 0,
      weight: 10,
      powerPos12: 0,
      powerNeg12: 1,
      powerPos5: 0
    });
  });

  it('clamps null power rails to zero in dev helpers', () => {
    const {component, dataService} = build();
    const emitted: any[] = [];
    dataService.changeModule$.subscribe(x => emitted.push(x));

    component.clampDevNumericFields({
      hp: 4,
      depth: 12,
      weight: 20,
      powerPos12: null,
      powerNeg12: null,
      powerPos5: null
    } as any);

    expect(emitted[0]).toEqual({
      hp: 4,
      depth: 12,
      weight: 20,
      powerPos12: 0,
      powerNeg12: 0,
      powerPos5: 0
    });
  });
  
  it('guards editor close by confirmation when there are pending changes', () => {
    const {component, dataService} = build();
    const toggleSpy = spyOn(dataService.requestModuleEditingToggle$, 'next').and.callThrough();
    const confirmSpy = spyOn(window, 'confirm');
    
    confirmSpy.and.returnValue(false);
    component.onEditorToggleRequest(true, true);
    expect(toggleSpy).not.toHaveBeenCalled();
    
    confirmSpy.and.returnValue(true);
    component.onEditorToggleRequest(true, true);
    expect(toggleSpy).toHaveBeenCalledTimes(1);
    
    component.onEditorToggleRequest(false, false);
    expect(toggleSpy).toHaveBeenCalledTimes(2);
  });

  it('confirms duplicate cleanup before deleting module and orphan manufacturer', () => {
    const {component, dataService} = build();
    const confirmSpy = spyOn(window, 'confirm');
    const deleteSpy = spyOn(dataService.deleteModuleAndOrphanManufacturer$, 'next').and.callThrough();
    const module = moduleFixture();

    confirmSpy.and.returnValue(false);
    component.confirmDeleteModuleAndOrphanManufacturer(module as any);
    expect(deleteSpy).not.toHaveBeenCalled();

    confirmSpy.and.returnValue(true);
    component.confirmDeleteModuleAndOrphanManufacturer(module as any);
    expect(deleteSpy).toHaveBeenCalledWith(module);
  });
  
  it('opens manual/similar/external links via window.open', () => {
    const {component} = build();
    const openSpy = spyOn(window, 'open');
    
    component.submitSimilar({manufacturerId: 3, hp: 8, standard: {id: 1}} as any);
    component.openManual({manualURL: 'https://docs'} as any);
    component.openExternalLink('https://external');
    
    expect(openSpy).toHaveBeenCalledWith('/modules/add?manufacturer=3&HP=8&standard=1', '_blank');
    expect(openSpy).toHaveBeenCalledWith('https://docs', '_blank');
    expect(openSpy).toHaveBeenCalledWith('https://external', '_blank', 'noopener,noreferrer');
  });
  
  it('cleans up local state on destroy', () => {
    const {component, dataService} = build();
    dataService.singleModuleData$.next(moduleFixture());
    
    component.ngOnDestroy();
    
    expect(dataService.singleModuleData$.value).toBeUndefined();
  });

  it('hides dev utils for non-admin users in production', async () => {
    const {fixture} = await render({isDev: false, isAdmin: false});

    expect(fixture.nativeElement.querySelector('lib-hero-content-card[titleNormal="Dev utils"]')).toBeNull();
  });

  it('shows dev utils for admin users in production', async () => {
    const {fixture} = await render({isDev: false, isAdmin: true});

    expect(fixture.nativeElement.querySelector('lib-hero-content-card[titleNormal="Dev utils"]')).not.toBeNull();
  });
});
