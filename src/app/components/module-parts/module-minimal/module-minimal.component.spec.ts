import { BehaviorSubject } from 'rxjs';
import {
  defaultModuleMinimalViewConfig,
  ModuleMinimalComponent
} from './module-minimal.component';


describe('ModuleMinimalComponent', () => {
  function build() {
    const userModulesList$ = new BehaviorSubject<any[]>([]);
    const setModulePossession$ = new BehaviorSubject<any>(undefined);
    const dialog = {
      open: jasmine.createSpy('open').and.returnValue({
        afterClosed: () => new BehaviorSubject<any>(undefined)
      })
    };
    const component = new ModuleMinimalComponent(
      {} as any,
      {
        userModulesList$,
        setModulePossession$
      } as any,
      {} as any,
      dialog as any
    );
    component.data = {id: 42, name: 'Maths'} as any;
    return {component, userModulesList$, setModulePossession$, dialog};
  }
  
  it('maps owned membership state from userModulesList$', () => {
    const {component, userModulesList$} = build();
    let latest: boolean | undefined;

    component.ngOnInit();
    component.isInCollection$.subscribe(v => latest = v);

    userModulesList$.next([{id: 42, possessionKind: 'HAS'}]);
    expect(latest).toBeTrue();

    userModulesList$.next([{id: 42, possessionKind: 'SELLS'}]);
    expect(latest).toBeTrue();

    userModulesList$.next([{id: 42, possessionKind: 'WANTS'}]);
    expect(latest).toBeFalse();

    userModulesList$.next([{id: 1}]);
    expect(latest).toBeFalse();
  });

  it('maps possession kind from userModulesList$', () => {
    const {component, userModulesList$} = build();
    let latest: string | null | undefined;

    component.ngOnInit();
    component.possessionKind$.subscribe(v => latest = v);

    userModulesList$.next([{id: 42, possessionKind: 'WANTS'}]);
    expect(latest).toBe('WANTS');

    userModulesList$.next([{id: 1}]);
    expect(latest).toBeNull();
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

  it('insCount and outsCount return CV port totals from data', () => {
    const {component} = build();
    component.data = {id: 1, ins: [{id: 1}, {id: 2}], outs: [{id: 3}]} as any;
    expect(component.insCount).toBe(2);
    expect(component.outsCount).toBe(1);
    expect(component.hasIO).toBeTrue();
  });

  it('hasIO is false when ins and outs are empty', () => {
    const {component} = build();
    component.data = {id: 1, ins: [], outs: []} as any;
    expect(component.hasIO).toBeFalse();
  });

  it('insCount and outsCount return 0 when data is undefined', () => {
    const {component} = build();
    component.data = undefined as any;
    expect(component.insCount).toBe(0);
    expect(component.outsCount).toBe(0);
  });

  it('shouldShowPanelVariantsBadge is false when only one panel exists', () => {
    const {component} = build();
    component.data = {id: 42, panels: [{id: 1}]} as any;
    expect(component.shouldShowPanelVariantsBadge()).toBeFalse();
  });

  it('opens the possession dialog from the add action', () => {
    const {component, dialog} = build();

    component.openPossessionDialog();

    expect(dialog.open).toHaveBeenCalled();
  });

  it('removes non-selling possession immediately', () => {
    const {component, setModulePossession$} = build();
    const nextSpy = spyOn(setModulePossession$, 'next');

    component.removePossession('WANTS');

    expect(nextSpy).toHaveBeenCalledWith(null);
  });
});
