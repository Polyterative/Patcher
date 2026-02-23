import {
  BehaviorSubject,
  Subject
} from 'rxjs';
import { ModuleBrowserDetailComponent } from './module-browser-detail.component';


describe('ModuleBrowserDetailComponent', () => {
  function build() {
    const routeParams$ = new Subject<any>();
    const singleModuleData$ = new BehaviorSubject<any>(undefined);
    const updateSingleModuleData$ = new Subject<number>();
    const changeModule$ = new Subject<any>();
    const requestModuleEditingToggle$ = new Subject<void>();
    
    const dataService = {
      singleModuleData$,
      updateSingleModuleData$,
      changeModule$,
      requestModuleEditingToggle$
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
      created: '2024-01-01',
      updated: '2024-01-02',
      tags: [{tag: {name: 'fm'}}, {tag: {name: 'analog'}}],
      ins: [{name: 'cv in'}],
      outs: [{name: 'audio out'}],
      manualURL: 'https://example.com/manual'
    };
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
  
  it('emits expected patch payloads for dev helpers', () => {
    const {component, dataService} = build();
    const emitted: any[] = [];
    dataService.changeModule$.subscribe(x => emitted.push(x));
    
    component.setDevStandard(2);
    component.setDevComplete(true);
    component.setDevApproved(true);
    component.setDevDIY(true);
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
    expect(emitted[4]).toEqual({
      name: 'My Module',
      description: 'rich text',
      manualURL: 'https://manual'
    });
    expect(emitted[5]).toEqual({manualURL: ''});
    expect(emitted[6]).toEqual({
      hp: 0,
      depth: 0,
      weight: 10,
      powerPos12: 0,
      powerNeg12: 1,
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
});