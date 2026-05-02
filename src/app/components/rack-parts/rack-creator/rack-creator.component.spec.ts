import { of } from 'rxjs';
import { RackCreatorComponent } from './rack-creator.component';
import { STANDARDS } from '../module-collection-analysis.service';


describe('RackCreatorComponent', () => {
  function build(user: any = {id: 'user-1'}, userModules: any[] = []) {
    const backend = {
      auth: {
        getUserSession$: jasmine.createSpy('getUserSession$').and.returnValue(of(user))
      },
      add: {
        rack: jasmine.createSpy('rack').and.returnValue(of({id: 1}))
      }
    };
    const snackBar = {
      open: jasmine.createSpy('open').and.returnValue({
        onAction: () => of(undefined)
      })
    };
    const dialogRef = {
      close: jasmine.createSpy('close')
    };
    const moduleCollectionAnalysisService = {
      analyzeRackConfiguration: jasmine.createSpy('analyzeRackConfiguration').and.returnValue({
        moduleCount: 1
      })
    };
    
    const component = new RackCreatorComponent(
      snackBar as any,
      backend as any,
      dialogRef as any,
      {userModules} as any,
      moduleCollectionAnalysisService as any
    );
    
    return {
      component,
      backend,
      snackBar,
      dialogRef,
      moduleCollectionAnalysisService
    };
  }
  
  it('filters out small 1U formats from rack analysis input', (done) => {
    const modules = [
      {id: 1, standard: {id: STANDARDS.EURORACK_3U.id}, hp: 8},
      {id: 2, standard: {id: STANDARDS.INTELLIJEL_1U.id}, hp: 4},
      {id: 3, standard: {id: STANDARDS.PULPLOGIC_1U.id}, hp: 4}
    ];
    const {component, moduleCollectionAnalysisService} = build({id: 'u1'}, modules);
    
    component.rackAnalysis$.subscribe(() => {
      expect(moduleCollectionAnalysisService.analyzeRackConfiguration).toHaveBeenCalled();
      const args = moduleCollectionAnalysisService.analyzeRackConfiguration.calls.mostRecent().args;
      expect(args[2].map((m: any) => m.id)).toEqual([1]);
      done();
    });
  });
  
  it('creates a rack and closes dialog when save is triggered for logged user', () => {
    const {component, backend, dialogRef} = build({id: 'u1'}, []);
    component.fields.name.control.setValue('My Rack');
    component.fields.hp.control.setValue(84);
    component.fields.rows.control.setValue(3);
    
    component.save$.next();
    
    expect(backend.add.rack).toHaveBeenCalledWith({
      name: 'My Rack',
      hp: 84,
      rows: 3,
      public: true,
      locked: false
    });
    expect(dialogRef.close).toHaveBeenCalled();
  });

  it('defaults new racks to public visibility', () => {
    const {component} = build({id: 'u1'}, []);

    expect(component.fields.public.control.value).toBeTrue();
  });
  
  it('does not create rack when user is not logged in', () => {
    const {component, backend, dialogRef} = build(null, []);
    
    component.save$.next();
    
    expect(backend.add.rack).not.toHaveBeenCalled();
    expect(dialogRef.close).not.toHaveBeenCalled();
  });
});
