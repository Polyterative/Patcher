import { BehaviorSubject } from 'rxjs';
import { ModuleMinimalComponent } from './module-minimal.component';


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
});
