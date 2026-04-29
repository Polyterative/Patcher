import {
  BehaviorSubject,
  of,
  Subject,
  throwError
} from 'rxjs';
import { ModuleCVsComponent } from './module-cvs.component';


describe('ModuleCVsComponent', () => {
  function build() {
    const clickOnModuleCV$ = new Subject<any>();
    const snackBar = {
      open: jasmine.createSpy('open')
    };
    const patchService = {
      patchEditingPanelOpenState$: new BehaviorSubject<boolean>(true),
      patchModuleInstances$: new BehaviorSubject<any[]>([]),
      clickOnModuleCV$,
      ensureModuleInstance$: jasmine.createSpy('ensureModuleInstance$').and.returnValue(of(77))
    };
    const component = new ModuleCVsComponent(patchService as any, snackBar as any);
    component.data = {
      id: 10,
      name: 'Module',
      ins: [{id: 1, name: 'In10'}, {id: 2, name: 'In2'}, {id: 3, name: 'In1'}],
      outs: [{id: 4, name: 'Out2'}, {id: 5, name: 'Out10'}, {id: 6, name: 'Out1'}]
    } as any;
    return {component, patchService, clickOnModuleCV$, snackBar};
  }
  
  it('sorts ins/outs using numeric-aware comparator', () => {
    const {component} = build();
    
    component.ngOnInit();
    
    expect(component.ins.map(x => x.name)).toEqual(['In1', 'In2', 'In10']);
    expect(component.outs.map(x => x.name)).toEqual(['Out1', 'Out2', 'Out10']);
  });
  
  it('handles equal and pure-string CV names in sort comparator', () => {
    const {component} = build();
    component.data = {
      id: 10,
      name: 'Module',
      ins: [{id: 1, name: 'Alpha'}, {id: 2, name: 'Alpha'}, {id: 3, name: 'Beta'}],
      outs: []
    } as any;
    
    component.ngOnInit();
    
    expect(component.ins.map(x => x.name)).toEqual(['Alpha', 'Alpha', 'Beta']);
  });
  
  it('auto-creates and caches instance id on first click when missing', () => {
    const {component, patchService, clickOnModuleCV$} = build();
    const emissions: any[] = [];
    clickOnModuleCV$.subscribe(v => emissions.push(v));
    component.instanceId = undefined;
    component.ngOnInit();
    
    const cv = {id: 1, name: 'In1'} as any;
    const mod = {id: 10, name: 'Module'} as any;
    component.inClick$.next([cv, mod]);
    component.outClick$.next([{id: 2, name: 'Out1'} as any, mod]);
    
    expect(patchService.ensureModuleInstance$).toHaveBeenCalledTimes(1);
    expect(component.instanceId).toBe(77);
    expect(emissions[0].kind).toBe('in');
    expect(emissions[0].cv.instance_id).toBe(77);
    expect(emissions[1].kind).toBe('out');
    expect(emissions[1].cv.instance_id).toBe(77);
  });
  
  it('does not emit click events when editing panel is closed', () => {
    const {component, patchService, clickOnModuleCV$} = build();
    const nextSpy = spyOn(clickOnModuleCV$, 'next').and.callThrough();
    patchService.patchEditingPanelOpenState$.next(false);
    
    component.ngOnInit();
    component.inClick$.next([{id: 1, name: 'In1'} as any, {id: 10, name: 'Module'} as any]);
    
    expect(nextSpy).not.toHaveBeenCalled();
    expect(patchService.ensureModuleInstance$).not.toHaveBeenCalled();
  });
  
  it('swallows ensure-instance errors for both in/out click streams', () => {
    const {component, patchService, clickOnModuleCV$} = build();
    const nextSpy = spyOn(clickOnModuleCV$, 'next').and.callThrough();
    patchService.ensureModuleInstance$.and.returnValue(throwError(() => new Error('fail')));
    component.instanceId = undefined;
    component.ngOnInit();
    
    const module = {id: 10, name: 'Module'} as any;
    component.inClick$.next([{id: 1, name: 'In'} as any, module]);
    component.outClick$.next([{id: 2, name: 'Out'} as any, module]);
    
    expect(nextSpy).not.toHaveBeenCalled();
  });

  it('blocks ambiguous clicks on an unlabeled card when multiple instances exist', () => {
    const {component, patchService, clickOnModuleCV$, snackBar} = build();
    const nextSpy = spyOn(clickOnModuleCV$, 'next').and.callThrough();
    patchService.patchModuleInstances$.next([
      {id: 101, module_id: 10},
      {id: 102, module_id: 10}
    ]);
    component.instanceId = undefined;
    component.ngOnInit();

    component.outClick$.next([{id: 2, name: 'Out'} as any, {id: 10, name: 'Module'} as any]);

    expect(patchService.ensureModuleInstance$).not.toHaveBeenCalled();
    expect(nextSpy).not.toHaveBeenCalled();
    expect(snackBar.open).toHaveBeenCalledWith(
      '"Module" has multiple copies — wire from a labeled copy instead.',
      undefined,
      {duration: 4000, panelClass: 'snack-info'}
    );
  });

  it('allows clicks on a labeled card even when multiple instances exist', () => {
    const {component, patchService, clickOnModuleCV$, snackBar} = build();
    const emissions: any[] = [];
    clickOnModuleCV$.subscribe(v => emissions.push(v));
    patchService.patchModuleInstances$.next([
      {id: 101, module_id: 10},
      {id: 102, module_id: 10}
    ]);
    component.instanceId = 102;
    component.ngOnInit();

    component.inClick$.next([{id: 1, name: 'In1'} as any, {id: 10, name: 'Module'} as any]);

    expect(patchService.ensureModuleInstance$).not.toHaveBeenCalled();
    expect(emissions.length).toBe(1);
    expect(emissions[0].cv.instance_id).toBe(102);
    expect(snackBar.open).not.toHaveBeenCalled();
  });
  
  it('emits and completes destroy subject on ngOnDestroy', () => {
    const {component} = build();
    const nextSpy = spyOn((component as any).destroyEvent$, 'next').and.callThrough();
    const completeSpy = spyOn((component as any).destroyEvent$, 'complete').and.callThrough();
    
    component.ngOnDestroy();
    
    expect(nextSpy).toHaveBeenCalled();
    expect(completeSpy).toHaveBeenCalled();
  });
});
