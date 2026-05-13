import { BehaviorSubject } from 'rxjs';
import {
  defaultModuleMinimalViewConfig,
  ModuleMinimalComponent
} from './module-minimal.component';


describe('ModuleMinimalComponent', () => {
  function build() {
    const userModulesList$ = new BehaviorSubject<any[]>([]);
    const component = new ModuleMinimalComponent(
      {} as any,
      {userModulesList$} as any,
      {} as any
    );
    component.data = {id: 42} as any;
    return {component, userModulesList$};
  }
  
  it('maps membership state from userModulesList$', () => {
    const {component, userModulesList$} = build();
    let latest: boolean | undefined;
    
    component.ngOnInit();
    component.isInCollection$.subscribe(v => latest = v);
    
    userModulesList$.next([{id: 1}, {id: 42}]);
    expect(latest).toBeTrue();
    
    userModulesList$.next([{id: 1}]);
    expect(latest).toBeFalse();
  });
  
  it('emits and completes destroy subject on ngOnDestroy', () => {
    const {component} = build();
    const nextSpy = spyOn((component as any).destroyEvent$, 'next').and.callThrough();
    const completeSpy = spyOn((component as any).destroyEvent$, 'complete').and.callThrough();
    
    component.ngOnDestroy();
    
    expect(nextSpy).toHaveBeenCalled();
    expect(completeSpy).toHaveBeenCalled();
  });

  it('hides the footer when no module-detail or rack actions are available', () => {
    const {component} = build();

    expect(component.shouldRenderActionFooter(undefined, undefined, false)).toBeFalse();
  });

  it('shows the footer when module-detail actions are available', () => {
    const {component} = build();

    expect(component.shouldRenderActionFooter({id: 42} as any, undefined, false)).toBeTrue();
  });

  it('shows the footer when rack actions are available from an editable rack', () => {
    const {component} = build();

    expect(component.shouldRenderActionFooter(undefined, {id: 7, name: 'Perf Rack'} as any, true)).toBeTrue();
  });

  it('hides the panel variants badge when the view config disables panel options', () => {
    const {component} = build();
    component.data = {id: 42, panels: [{id: 1}, {id: 2}]} as any;
    component.viewConfig = {
      ...defaultModuleMinimalViewConfig,
      hidePanelsOptions: true
    };

    expect(component.shouldShowPanelVariantsBadge()).toBeFalse();
  });

  it('shows the panel variants badge when multiple panels exist and panel options are visible', () => {
    const {component} = build();
    component.data = {id: 42, panels: [{id: 1}, {id: 2}]} as any;
    component.viewConfig = {
      ...defaultModuleMinimalViewConfig,
      hidePanelsOptions: false
    };

    expect(component.shouldShowPanelVariantsBadge()).toBeTrue();
  });
});
