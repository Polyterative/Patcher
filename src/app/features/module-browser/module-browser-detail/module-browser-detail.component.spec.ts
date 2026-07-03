import {
  Component,
  Input,
  NO_ERRORS_SCHEMA
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ComponentFixture,
  TestBed
} from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import {
  BehaviorSubject,
  of,
  Subject
} from 'rxjs';
import { ModuleDetailDataService } from 'src/app/components/module-parts/module-detail-data.service';
import { CommentsDataService } from 'src/app/components/shared-atoms/comments/comments-data.service';
import { COOL_REACTIONS_ENABLED } from 'src/app/components/shared-atoms/cool-button/cool-button-feature.token';
import { CoolButtonComponent } from 'src/app/components/shared-atoms/cool-button/cool-button.component';
import { ModuleMinimalViewConfig } from 'src/app/components/module-parts/module-minimal/module-minimal.component';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { DbModule } from 'src/app/models/module';
import { SeoAndUtilsService } from '../../backbone/seo-and-utils.service';
import { AppStateService } from "src/app/shared-interproject/app-state.service";
import { UserManagementService } from "src/app/features/backbone/login/user-management.service";
import {
  calculateModulePanelRatioResult,
  MODULE_PANEL_RATIO_ACCEPTANCE_THRESHOLD,
  ModuleBrowserDetailComponent
} from './module-browser-detail.component';
import { ModuleUsageCardComponent } from './module-usage-card/module-usage-card.component';
import { ModulePriceListing } from '../../backend/supabase-queries.models';

@Component({
  selector: 'app-module-composite',
  template: '<ng-content></ng-content>',
  standalone: false
})
class ModuleCompositeStubComponent {
  @Input() data: DbModule | undefined;
  @Input() viewConfig: ModuleMinimalViewConfig | undefined;
  @Input() showCoolAction = false;
}

@Component({
  selector: 'app-manufacturer-row',
  template: '',
  standalone: false
})
class ManufacturerRowStubComponent {
  @Input() manufacturer: unknown;
  @Input() hideRowLink = false;
  @Input() showPriceSummary = false;
}


describe('ModuleBrowserDetailComponent', () => {
  type RatioModuleFixture = Pick<DbModule, 'hp' | 'standard'>;
  type SearchLinkPriceListing = Pick<ModulePriceListing, 'storeId' | 'storeSlug'>;

  function makeReactionBackendSpy() {
    return {
      get: {
        currentUserReactions: jasmine.createSpy('currentUserReactions').and.returnValue(of([])),
        reactionCount: jasmine.createSpy('reactionCount').and.returnValue(of(0)),
      },
      add: {
        reaction: jasmine.createSpy('addReaction').and.returnValue(of(null)),
      },
      delete: {
        reaction: jasmine.createSpy('deleteReaction').and.returnValue(of(null)),
      }
    };
  }

  function build() {
    const routeParams$ = new Subject<any>();
    const singleModuleData$ = new BehaviorSubject<any>(undefined);
    const updateSingleModuleData$ = new Subject<number>();
    const changeModule$ = new Subject<any>();
    const requestModuleEditingToggle$ = new Subject<void>();
    const deleteModuleAndOrphanManufacturer$ = new Subject<any>();
    const mergeIntoTargetModule$ = new Subject<{ sourceId: number; targetId: number }>();
    const moduleMergeResult$ = new Subject<unknown>();
    
    const dataService = {
      singleModuleData$,
      modulePriceListings$: new BehaviorSubject<SearchLinkPriceListing[] | undefined>(undefined),
      updateSingleModuleData$,
      changeModule$,
      isAdmin$: new BehaviorSubject<boolean>(false),
      requestModuleEditingToggle$,
      deleteModuleAndOrphanManufacturer$,
      mergeIntoTargetModule$,
      moduleMergeResult$
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
      manualURL: 'https://example.com/manual',
      public: true
    };
  }

  async function render(options: {isDev?: boolean; isAdmin?: boolean; user?: unknown; coolToken?: boolean} = {}): Promise<{
    fixture: ComponentFixture<ModuleBrowserDetailComponent>;
    dataService: any;
    loggedUser$: BehaviorSubject<unknown>;
    reactionBackend: ReturnType<typeof makeReactionBackendSpy>;
  }> {
    TestBed.resetTestingModule();

    const loggedUser$ = new BehaviorSubject<unknown>(options.user ?? {id: 'user-1'});
    const coolCount$ = new BehaviorSubject<number | undefined>(0);
    const coolCountUpdate$ = new Subject<number | null>();
    coolCountUpdate$.subscribe(count => {
      if (count !== null) {
        coolCount$.next(count);
      }
    });
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
      possessionCounts$: new BehaviorSubject<any>({
        hasCount: 0,
        wantsCount: 0,
        sellsCount: 0
      }),
      coolCount$,
      coolCountUpdate$,
      currentModulePossession$: new BehaviorSubject<any>(null),
      modulesBySameManufacturer$: new BehaviorSubject<any[]>([]),
      modulePriceListings$: new BehaviorSubject<SearchLinkPriceListing[] | undefined>(undefined),
      moduleEditingPanelOpenState$: new BehaviorSubject<boolean>(false),
      moduleEditorHasPendingChanges$: new BehaviorSubject<boolean>(false),
      isAdmin$: new BehaviorSubject<boolean>(!!options.isAdmin),
      updateSingleModuleData$: new Subject<number>(),
      changeModule$: new Subject<any>(),
      requestModuleEditingToggle$: new Subject<void>(),
      deleteModuleAndOrphanManufacturer$: new Subject<any>(),
      mergeIntoTargetModule$: new Subject<{ sourceId: number; targetId: number }>(),
      moduleMergeResult$: new Subject<unknown>(),
      deleteModule$: new Subject<number>(),
      deletePanel$: new Subject<any>()
    };
    const commentsDataService = {
      requestCommentsUpdate$: {next: jasmine.createSpy('requestCommentsUpdate.next')},
      requestReset$: {next: jasmine.createSpy('requestReset.next')}
    };
    const reactionBackend = makeReactionBackendSpy();

    await TestBed.configureTestingModule({
      declarations: [
        ModuleBrowserDetailComponent,
        ModuleUsageCardComponent,
        ModuleCompositeStubComponent,
        ManufacturerRowStubComponent
      ],
      imports: [CommonModule, FormsModule, NoopAnimationsModule, CoolButtonComponent],
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
        {provide: UserManagementService, useValue: {loggedUser$}},
        {provide: COOL_REACTIONS_ENABLED, useValue: options.coolToken ?? false},
        {provide: SupabaseService, useValue: reactionBackend},
        {provide: MatSnackBar, useValue: jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open'])}
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

    return {fixture, dataService, loggedUser$, reactionBackend};
  }

  it('enables description keyword highlights for the primary detail card', async () => {
    const {fixture} = await render();

    const moduleComposite = fixture.debugElement.query(By.directive(ModuleCompositeStubComponent))
      .componentInstance as ModuleCompositeStubComponent;

    expect(moduleComposite.viewConfig?.highlightDescriptionKeywords).toBeTrue();
  });

  it('enables description analysis only for the primary detail card', async () => {
    const {fixture} = await render();

    const moduleComposite = fixture.debugElement.query(By.directive(ModuleCompositeStubComponent))
      .componentInstance as ModuleCompositeStubComponent;

    expect(moduleComposite.viewConfig?.showDescriptionAnalysis).toBeTrue();
    expect(moduleComposite.viewConfig?.showFrequencyAnalysis).toBeTrue();
    expect(fixture.componentInstance.bySameManufacturerViewConfig.showDescriptionAnalysis).toBeFalse();
    expect(fixture.componentInstance.bySameManufacturerViewConfig.showFrequencyAnalysis).toBeFalse();
  });

  it('keeps price summaries hidden in the same-manufacturer detail strip', async () => {
    const {fixture} = await render();

    const manufacturerRow = fixture.debugElement.query(By.directive(ManufacturerRowStubComponent))
      .componentInstance as ManufacturerRowStubComponent;

    expect(manufacturerRow.showPriceSummary).toBeFalse();
  });

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

  it('adds current possession state to the module detail page title', () => {
    const {component} = build();

    expect(component.getModuleDetailTitleSub('Mega Osc', 'HAS')).toBe('Mega Osc (Owned)');
    expect(component.getModuleDetailTitleSub('Mega Osc', 'WANTS')).toBe('Mega Osc (Wanted)');
    expect(component.getModuleDetailTitleSub('Mega Osc', 'SELLS')).toBe('Mega Osc (For sale)');
  });

  it('leaves the module detail page title unchanged without possession state', () => {
    const {component} = build();

    expect(component.getModuleDetailTitleSub('Mega Osc', null)).toBe('Mega Osc');
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

  it('renders community search links while suppressing retailers with current price listings', async () => {
    const {fixture, dataService} = await render();

    dataService.modulePriceListings$.next([{storeId: 1, storeSlug: 'control'}]);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Community');
    expect(text).toContain('Google');
    expect(text).toContain('Wigglehunt');
    expect(text).toContain('Other stores');
    expect(text).not.toContain('Control 🇺🇸');
    expect(text).toContain('Patchwerks 🇺🇸');
  });

  it('hides the Other Stores search group when every retailer has a current price listing', async () => {
    const {fixture, dataService} = await render();
    const listings = fixture.componentInstance.retailerSearchLinks.map((link, index) => ({
      storeId: index + 1,
      storeSlug: link.storeSlugs![0]
    }));

    dataService.modulePriceListings$.next(listings);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Community');
    expect(text).toContain('Google');
    expect(text).not.toContain('Other stores');
  });

  it('does not render or query Cool reactions when the feature flag is off', async () => {
    const {fixture, reactionBackend} = await render();

    expect(fixture.nativeElement.querySelector('.coolButton')).toBeNull();
    expect(reactionBackend.get.currentUserReactions).not.toHaveBeenCalled();
    expect(reactionBackend.get.reactionCount).not.toHaveBeenCalled();
    expect(reactionBackend.add.reaction).not.toHaveBeenCalled();
    expect(reactionBackend.delete.reaction).not.toHaveBeenCalled();
  });

  it('renders Cool as a floating action instead of inside the primary module card', async () => {
    const {fixture} = await render();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('lib-hero-content-card[titleNormal="Community"] app-cool-button')).toBeNull();
    const composite = fixture.debugElement.query(By.directive(ModuleCompositeStubComponent));
    expect(composite.componentInstance.showCoolAction).toBeFalse();
    expect(fixture.nativeElement.querySelector('.module-detail-editor-floating-actions .module-detail-cool-floating-action')).not.toBeNull();
  });

  it('keeps the floating Cool action visible for owned modules', async () => {
    const {fixture, dataService} = await render();
    dataService.currentModulePossession$.next('HAS');

    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.module-detail-editor-floating-actions .module-detail-cool-floating-action')).not.toBeNull();
  });

  it('updates the page Cool count from the floating Cool action success event', async () => {
    const {fixture, dataService} = await render({coolToken: true});
    const countUpdateSpy = spyOn(dataService.coolCountUpdate$, 'next').and.callThrough();

    fixture.debugElement.query(By.css('.module-detail-cool-floating-action button.coolButton')).triggerEventHandler('click');
    fixture.detectChanges();

    expect(countUpdateSpy).toHaveBeenCalledWith(1);
    expect(dataService.coolCount$.value).toBe(1);
  });

  it('builds raw public stats for the Community data card', () => {
    const {component} = build();

    expect(component.getCommunityData({
      hasCount: 8,
      wantsCount: 4,
      sellsCount: 3
    }, 6)).toEqual([
      { label: 'Cool', value: '6', icon: 'auto_awesome', size: 'auto' },
      { label: 'Owners', value: '8', icon: 'inventory_2', size: 'auto' },
      { label: 'Wishlist', value: '4', icon: 'star_outline', size: 'auto' },
      { label: 'For Sale', value: '3', icon: 'sell', size: 'auto' }
    ]);
  });

  it('hides zero public possession counts once loaded', () => {
    const {component} = build();

    expect(component.getCommunityData({
      hasCount: 1,
      wantsCount: 0,
      sellsCount: 2
    }, 0)).toEqual([
      { label: 'Owners', value: '1', icon: 'inventory_2', size: 'auto' },
      { label: 'For Sale', value: '2', icon: 'sell', size: 'auto' }
    ]);
  });

  it('waits to render public community stats until counts load', () => {
    const {component} = build();

    expect(component.getCommunityData(undefined, 1)).toBeUndefined();
    expect(component.getCommunityData({hasCount: 1, wantsCount: 0, sellsCount: 0}, undefined)).toBeUndefined();
  });

  it('hides the Community card when every count is zero', () => {
    const {component} = build();

    expect(component.getCommunityData({
      hasCount: 0,
      wantsCount: 0,
      sellsCount: 0
    }, 0)).toBeUndefined();
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

  it('calculates panel image ratio diagnostics for 3U modules within threshold', () => {
    const result = calculateModulePanelRatioResult(
      {hp: 14, standard: {id: 0, name: '3U'}} as RatioModuleFixture,
      {width: 1006, height: 1837}
    );

    expect(result?.expectedRatio).toBeCloseTo(14 / 25.4, 6);
    expect(result?.imageRatio).toBeCloseTo(1006 / 1837, 6);
    expect(result?.deltaPercent).toBeCloseTo(-0.64, 1);
    expect(result?.accepted).toBeTrue();
  });

  it('calculates panel image ratio diagnostics for supported 1U standards', () => {
    const intellijelResult = calculateModulePanelRatioResult(
      {hp: 10, standard: {id: 1, name: 'Intellijel 1U'}} as RatioModuleFixture,
      {width: 1000, height: 784}
    );
    const pulpLogicResult = calculateModulePanelRatioResult(
      {hp: 10, standard: {id: 2, name: 'Pulp Logic 1U'}} as RatioModuleFixture,
      {width: 1000, height: 854}
    );

    expect(intellijelResult?.expectedRatio).toBeCloseTo(10 / 7.8374, 6);
    expect(pulpLogicResult?.expectedRatio).toBeCloseTo(10 / 8.5352, 6);
  });

  it('marks panel ratios outside the acceptance threshold as mismatches', () => {
    const result = calculateModulePanelRatioResult(
      {hp: 14, standard: {id: 0, name: '3U'}} as RatioModuleFixture,
      {width: 800, height: 1837}
    );

    expect(MODULE_PANEL_RATIO_ACCEPTANCE_THRESHOLD).toBe(0.01);
    expect(result?.accepted).toBeFalse();
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

  it('validates and dispatches merge into target module requests', () => {
    const {component, dataService} = build();
    const mergeSpy = spyOn(dataService.mergeIntoTargetModule$, 'next').and.callThrough();
    const confirmSpy = spyOn(window, 'confirm').and.returnValue(true);
    const module = moduleFixture() as DbModule;

    component.ngOnInit();
    component.openMergeIntoTargetForm();
    component.mergeTargetModuleIdDraft = 'abc';
    component.confirmMergeIntoTarget(module);
    expect(component.mergeIntoTargetError$.value).toContain('valid positive');
    expect(mergeSpy).not.toHaveBeenCalled();

    component.mergeTargetModuleIdDraft = '99';
    component.confirmMergeIntoTarget(module);
    expect(component.mergeIntoTargetError$.value).toContain('different');
    expect(mergeSpy).not.toHaveBeenCalled();

    component.mergeTargetModuleIdDraft = '1896';
    component.confirmMergeIntoTarget(module);
    expect(confirmSpy).toHaveBeenCalled();
    expect(mergeSpy).toHaveBeenCalledOnceWith({sourceId: 99, targetId: 1896});
    expect(component.mergeIntoTargetOpen$.value).toBeTrue();
    dataService.moduleMergeResult$.next({sourceId: 99, targetId: 1896});
    expect(component.mergeIntoTargetOpen$.value).toBeFalse();
  });

  it('cancels merge into target module without dispatching', () => {
    const {component, dataService} = build();
    const mergeSpy = spyOn(dataService.mergeIntoTargetModule$, 'next').and.callThrough();

    component.openMergeIntoTargetForm();
    component.mergeTargetModuleIdDraft = '1896';
    component.cancelMergeIntoTarget();

    expect(mergeSpy).not.toHaveBeenCalled();
    expect(component.mergeIntoTargetOpen$.value).toBeFalse();
    expect(component.mergeTargetModuleIdDraft).toBe('');
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
    expect(fixture.nativeElement.textContent).toContain('Merge into target module');
  });

  it('renders compact labeled dev utility groups', async () => {
    const {fixture} = await render({isDev: true});

    const labels = Array.from(
      fixture.nativeElement.querySelectorAll('.module-detail-dev-group__label')
    ).map((label: Element) => label.textContent?.trim());

    expect(labels).toEqual([
      'Danger',
      'Merge',
      'Convert',
      'Status',
      'Dimensions',
      'Data hygiene'
    ]);
    expect(fixture.nativeElement.querySelector('.module-detail-dev-group--danger')?.textContent).toContain('Delete module');
    expect(fixture.nativeElement.querySelector('[aria-labelledby="module-detail-dev-merge-label"]')?.textContent)
      .toContain('Merge into target module');
  });

  it('renders specific dev panel delete buttons for present panels only', async () => {
    const {fixture, dataService} = await render({isDev: true});
    const deleteSpy = spyOn(dataService.deletePanel$, 'next').and.callThrough();
    const darkPanel = {id: 11, moduleid: 99, filename: 'mega-osc-dark.jpg', description: 'Dark', color: 2};
    const silverPanel = {id: 12, moduleid: 99, filename: 'mega-osc-silver.jpg', description: 'Silver', color: 1};

    dataService.singleModuleData$.next({
      ...moduleFixture(),
      panels: [darkPanel, silverPanel]
    });
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).not.toContain('Delete last panel');
    expect(text).toContain('Delete Dark panel');
    expect(text).toContain('Delete Silver panel');
    expect(fixture.nativeElement.querySelector('.module-detail-dev-group--danger')?.textContent).toContain('Delete Dark panel');

    const panelDeleteButton = fixture.debugElement
      .queryAll(By.css('.module-detail-dev-group--danger app-brand-primary-button'))
      .find(button => button.nativeElement.textContent.includes('Delete Dark panel'));
    expect(panelDeleteButton).toBeTruthy();

    panelDeleteButton!.triggerEventHandler('click$', undefined);

    expect(deleteSpy).toHaveBeenCalledWith(darkPanel);
  });

  it('does not render panel delete controls when the module has no panels', async () => {
    const {fixture} = await render({isDev: true});

    expect(fixture.nativeElement.textContent).not.toContain('Delete last panel');
    expect(fixture.nativeElement.textContent).not.toContain('Delete Panel 1 panel');
  });

  it('getUsagePendingCopy describes pending rack check', () => {
    const {component} = build();
    expect(component.getUsagePendingCopy('rack')).toContain('rack');
    expect(component.getUsagePendingCopy('rack')).toContain('Checking');
  });

  it('getUsagePendingCopy describes pending patch check', () => {
    const {component} = build();
    expect(component.getUsagePendingCopy('patch')).toContain('patch');
  });

  it('getNoPublicUsageCopy with no hidden usage returns try-adding copy', () => {
    const {component} = build();
    const copy = component.getNoPublicUsageCopy('rack', null);
    expect(copy).toContain('Try adding it to yours');
  });

  it('getNoPublicUsageCopy with some hidden usage mentions hidden racks', () => {
    const {component} = build();
    const copy = component.getNoPublicUsageCopy('rack', 'some');
    expect(copy).toContain('some');
    expect(copy).toContain('racks');
  });

  it('getHiddenUsageSupplementCopy mentions the bucket descriptor', () => {
    const {component} = build();
    expect(component.getHiddenUsageSupplementCopy('patch', '5_plus')).toContain('5+');
    expect(component.getHiddenUsageSupplementCopy('patch', '5_plus')).toContain('patches');
  });

  it('searchLinks is non-empty', () => {
    const {component} = build();
    expect(component.searchLinks.length).toBeGreaterThan(0);
  });
});
