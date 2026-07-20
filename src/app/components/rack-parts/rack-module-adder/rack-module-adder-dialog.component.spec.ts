import {
  MatDialog,
  MatDialogRef
} from '@angular/material/dialog';
import {
  MatSnackBar,
  MatSnackBarRef,
  TextOnlySnackBar
} from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { TimeagoPipe } from 'ngx-timeago';
import {
  BehaviorSubject,
  Observable,
  of,
  Subject
} from 'rxjs';
import {
  filter,
  take
} from 'rxjs/operators';
import { RackModuleAdderDialogComponent } from './rack-module-adder-dialog.component';
import { RackModuleAdderDataService } from './rack-module-adder-data.service';
import {
  RackModuleAdderInModel,
  RackModuleAdderOutModel
} from './rack-module-adder-dialog.types';
import { UserAreaDataService } from 'src/app/features/routes/user-area/user-area-data.service';
import { DbModule } from 'src/app/models/module';
import { Rack } from 'src/app/models/rack';

interface Harness {
  component: RackModuleAdderDialogComponent;
  rackModuleAdderDataService: Pick<RackModuleAdderDataService, 'addModuleToRack$'>;
  snackBar: jasmine.SpyObj<MatSnackBar>;
  action$: Subject<void>;
  userAreaDataService: Pick<UserAreaDataService, 'rackData$' | 'updateRackData$'>;
  timeagoPipe: Pick<TimeagoPipe, 'transform'>;
  dialogRef: jasmine.SpyObj<MatDialogRef<RackModuleAdderDialogComponent, RackModuleAdderOutModel>>;
  router: jasmine.SpyObj<Router>;
}


describe('RackModuleAdderDialogComponent', () => {
  let createdComponents: RackModuleAdderDialogComponent[];

  function moduleFixture(overrides: Partial<DbModule> = {}): DbModule {
    return {
      id: 77,
      name: 'Oscillator',
      description: 'Module',
      hp: 10,
      public: true,
      manufacturer: {id: 1, name: 'Maker'},
      manufacturerId: 1,
      standard: {id: 0, name: 'Eurorack'},
      tags: [],
      panels: [],
      ins: [],
      outs: [],
      switches: [],
      manualURL: '',
      store_url: null,
      additional: null,
      isComplete: true,
      isApproved: true,
      isDIY: false,
      powerPos12: null,
      powerNeg12: null,
      powerPos5: null,
      depth: 0,
      weight: 0,
      created: '2024-01-01T00:00:00Z',
      updated: '2024-01-01T00:00:00Z',
      ...overrides
    };
  }

  function rackFixture(overrides: Partial<Rack> = {}): Rack {
    return {
      id: 1,
      name: 'Rack',
      created: '2024-01-01T00:00:00Z',
      updated: '2024-01-01T00:00:00Z',
      hp: 84,
      rows: 2,
      public: true,
      locked: false,
      author: {id: 'u1', username: 'user'},
      ...overrides
    };
  }

  function build(): Harness {
    const action$ = new Subject<void>();
    const snackBarRef = {
      onAction: () => action$.asObservable()
    } as MatSnackBarRef<TextOnlySnackBar>;
    const snackBar = jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']);
    snackBar.open.and.returnValue(snackBarRef);
    const rackModuleAdderDataService: Pick<RackModuleAdderDataService, 'addModuleToRack$'> = {
      addModuleToRack$: jasmine.createSpy<(moduleId: number, rackId: string | number) => Observable<unknown>>('addModuleToRack$')
        .and.returnValue(of({}))
    };
    const updateRackData$ = new Subject<string | undefined>();
    spyOn(updateRackData$, 'next').and.callThrough();
    const userAreaDataService: Pick<UserAreaDataService, 'rackData$' | 'updateRackData$'> = {
      rackData$: new BehaviorSubject<Rack[] | undefined>([
        rackFixture({id: 1, name: 'Old Rack', hp: 84, rows: 2, updated: '2024-01-01T00:00:00Z'}),
        rackFixture({id: 2, name: 'New Rack', hp: 104, rows: 3, updated: '2025-01-01T00:00:00Z'})
      ]),
      updateRackData$
    };
    const timeagoPipe: Pick<TimeagoPipe, 'transform'> = {
      transform: jasmine.createSpy('transform').and.returnValue('recently')
    };
    const dialogRef = jasmine.createSpyObj<MatDialogRef<RackModuleAdderDialogComponent, RackModuleAdderOutModel>>(
      'MatDialogRef',
      ['close']
    );
    const router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    const data: RackModuleAdderInModel = {module: moduleFixture()};
    
    const component = new RackModuleAdderDialogComponent(
      snackBar,
      rackModuleAdderDataService as unknown as RackModuleAdderDataService,
      timeagoPipe as TimeagoPipe,
      userAreaDataService as unknown as UserAreaDataService,
      dialogRef,
      router,
      data
    );
    createdComponents.push(component);
    
    return {
      component,
      rackModuleAdderDataService,
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
    const {component, rackModuleAdderDataService, dialogRef} = build();
    component.fields.rack.control.patchValue({id: '2', name: 'New Rack'});
    
    component.saveRackedModule$.next();
    
    expect(rackModuleAdderDataService.addModuleToRack$).toHaveBeenCalledWith(77, '2');
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
    const dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    const fakeRef = {} as MatDialogRef<RackModuleAdderDialogComponent, RackModuleAdderOutModel>;
    const data: RackModuleAdderInModel = {module: moduleFixture({id: 1})};
    dialog.open.and.returnValue(fakeRef);
    
    const result = RackModuleAdderDialogComponent.open(dialog, data);
    
    expect(dialog.open).toHaveBeenCalledWith(RackModuleAdderDialogComponent, {
      data,
      width: '70%',
      maxWidth: '40rem'
    });
    expect(result).toBe(fakeRef);
  });
});