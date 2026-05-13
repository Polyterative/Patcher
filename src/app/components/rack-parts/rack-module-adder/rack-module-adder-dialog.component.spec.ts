import {
  BehaviorSubject,
  of,
  Subject
} from 'rxjs';
import {
  filter,
  take
} from 'rxjs/operators';
import { RackModuleAdderDialogComponent } from './rack-module-adder-dialog.component';


describe('RackModuleAdderDialogComponent', () => {
  let createdComponents: RackModuleAdderDialogComponent[];

  function build() {
    const action$ = new Subject<void>();
    const snackBar = {
      open: jasmine.createSpy('open').and.returnValue({
        onAction: () => action$.asObservable()
      })
    };
    const backend = {
      add: {
        rackModule: jasmine.createSpy('rackModule').and.returnValue(of({}))
      }
    };
    const userAreaDataService = {
      rackData$: new BehaviorSubject<any[]>([
        {id: 1, name: 'Old Rack', hp: 84, rows: 2, updated: '2024-01-01T00:00:00Z'},
        {id: 2, name: 'New Rack', hp: 104, rows: 3, updated: '2025-01-01T00:00:00Z'}
      ]),
      updateRackData$: {next: jasmine.createSpy('updateRackData.next')}
    };
    const timeagoPipe = {
      transform: jasmine.createSpy('transform').and.returnValue('recently')
    };
    const dialogRef = {
      close: jasmine.createSpy('close')
    };
    const router = jasmine.createSpyObj('Router', ['navigate']);
    
    const component = new RackModuleAdderDialogComponent(
      snackBar as any,
      backend as any,
      timeagoPipe as any,
      userAreaDataService as any,
      dialogRef as any,
      router,
      {module: {id: 77, name: 'Oscillator'}} as any
    );
    createdComponents.push(component);
    
    return {
      component,
      backend,
      snackBar,
      action$,
      userAreaDataService,
      timeagoPipe,
      dialogRef,
      router
    };
  }

  beforeEach(() => {
    createdComponents = [];
  });

  afterEach(() => {
    createdComponents.forEach((component) => component.ngOnDestroy());
  });
  
  it('requests rack refresh on initialization', () => {
    const {userAreaDataService} = build();
    expect(userAreaDataService.updateRackData$.next).toHaveBeenCalledWith(undefined);
  });
  
  it('builds options and preselects last updated rack', (done) => {
    const {component} = build();
    component.fields.rack.options$
      .pipe(
        filter(options => options.length > 0),
        take(1)
      )
      .subscribe(options => {
        expect(options.length).toBe(2);
        expect(component.fields.rack.control.value.id).toBe('2');
        done();
      });
  });
  
  it('adds selected module to selected rack and closes dialog', () => {
    const {component, backend, dialogRef} = build();
    component.fields.rack.control.patchValue({id: '2', name: 'New Rack'});
    
    component.saveRackedModule$.next();
    
    expect(backend.add.rackModule).toHaveBeenCalledWith(77, '2');
    expect(dialogRef.close).toHaveBeenCalled();
  });
  
  it('navigates to rack when snackbar action is clicked', () => {
    const {component, action$, router} = build();
    component.fields.rack.control.patchValue({id: '2', name: 'New Rack'});
    
    component.saveRackedModule$.next();
    action$.next();
    
    expect(router.navigate).toHaveBeenCalledWith(['/racks', 'details', '2']);
  });
  
  it('uses static open helper with expected dialog config', () => {
    const dialog = jasmine.createSpyObj('MatDialog', ['open']);
    const fakeRef = {} as any;
    dialog.open.and.returnValue(fakeRef);
    
    const result = RackModuleAdderDialogComponent.open(dialog as any, {module: {id: 1}} as any);
    
    expect(dialog.open).toHaveBeenCalledWith(RackModuleAdderDialogComponent, {
      data: {module: {id: 1}},
      width: '70%',
      maxWidth: '40rem'
    });
    expect(result).toBe(fakeRef);
  });
});