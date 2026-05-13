import { of } from 'rxjs';
import { RackCreatorComponent } from './rack-creator.component';
import { STANDARDS } from '../module-collection-analysis.service';


describe('RackCreatorComponent - uncovered branches', () => {
  let createdComponents: RackCreatorComponent[];

  function build(userModules?: any[]) {
    const backend = {
      auth: {getUserSession$: jasmine.createSpy().and.returnValue(of({id: 'u1'}))},
      add: {rack: jasmine.createSpy().and.returnValue(of({id: 1}))}
    };
    const snackBar = {open: jasmine.createSpy().and.returnValue({onAction: () => of(undefined)})};
    const dialogRef = {close: jasmine.createSpy()};
    const mca = {
      analyzeRackConfiguration: jasmine.createSpy().and.returnValue({moduleCount: 0})
    };
    
    const component = new RackCreatorComponent(
      snackBar as any,
      backend as any,
      dialogRef as any,
      {userModules} as any,
      mca as any
    );
    createdComponents.push(component);
    return {component, backend, snackBar, dialogRef, mca};
  }

  beforeEach(() => {
    createdComponents = [];
  });

  afterEach(() => {
    createdComponents.forEach((component) => component.ngOnDestroy());
  });
  
  it('rackAnalysis$ still works when data.userModules is not provided (undefined)', (done) => {
    const {component, mca} = build(undefined);
    
    component.rackAnalysis$.subscribe(() => {
      expect(mca.analyzeRackConfiguration).toHaveBeenCalled();
      done();
    });
  });
  
  it('filters out null entries in the module list gracefully', (done) => {
    const modules = [null, {id: 1, standard: {id: STANDARDS.EURORACK_3U.id}, hp: 8}];
    const {component, mca} = build(modules as any);
    
    component.rackAnalysis$.subscribe(() => {
      const args = mca.analyzeRackConfiguration.calls.mostRecent().args;
      // Only the valid (non-null) eurorack module should pass through
      expect(args[2].length).toBe(1);
      done();
    });
  });
  
  it('uses EURORACK_3U as default standard when standard.id is undefined', (done) => {
    const modules = [
      {id: 1, standard: undefined, hp: 8},  // no standard → falls back to 3U
      {id: 2, standard: {id: STANDARDS.INTELLIJEL_1U.id}, hp: 4}
    ];
    const {component, mca} = build(modules as any);
    
    component.rackAnalysis$.subscribe(() => {
      const args = mca.analyzeRackConfiguration.calls.mostRecent().args;
      // module 1 (no standard) should be treated as 3U and included
      // module 2 (Intellijel 1U) should be filtered out
      expect(args[2].some((m: any) => m.id === 1)).toBeTrue();
      expect(args[2].some((m: any) => m.id === 2)).toBeFalse();
      done();
    });
  });
  
  it('generates a non-empty rack name by default', () => {
    const {component} = build();
    const nameValue: string = component.fields.name.control.value;
    expect(typeof nameValue).toBe('string');
    expect(nameValue.length).toBeGreaterThan(0);
  });
  
  it('ngOnInit can be called without error', () => {
    const {component} = build();
    expect(() => component.ngOnInit()).not.toThrow();
  });
});