import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
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
  firstValueFrom,
  Observable,
  of,
  Subject
} from 'rxjs';
import { NgControl } from '@angular/forms';
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
import {
  ComponentFixture,
  TestBed
} from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { MatFormEntityComponent } from 'src/app/shared-interproject/components/@smart/mat-form-entity/mat-form-entity.component';
import { BrandPrimaryButtonComponent } from 'src/app/shared-interproject/components/@visual/brand-primary-button/brand-primary-button.component';

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

describe('RackModuleAdderDialogComponent rendered dialog', () => {
  let fixture: ComponentFixture<RackModuleAdderDialogComponent>;
  let rackData$: BehaviorSubject<Rack[] | undefined>;
  let updateRackData$: Subject<string | undefined>;
  let addModuleToRack$: jasmine.Spy<(moduleId: number, rackId: string | number) => Observable<unknown>>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<RackModuleAdderDialogComponent, RackModuleAdderOutModel>>;

  const racks = [
    rackFixture({id: 1, name: 'Old Rack', hp: 84, rows: 2, updated: '2024-01-01T00:00:00Z'}),
    rackFixture({id: 2, name: 'Latest Rack', hp: 104, rows: 3, updated: '2025-01-01T00:00:00Z'})
  ];

  beforeEach(async () => {
    rackData$ = new BehaviorSubject<Rack[] | undefined>(undefined);
    updateRackData$ = new Subject<string | undefined>();
    spyOn(updateRackData$, 'next').and.callThrough();
    const userAreaDataService: Pick<UserAreaDataService, 'rackData$' | 'updateRackData$'> = {
      rackData$,
      updateRackData$
    };
    addModuleToRack$ = jasmine.createSpy<(moduleId: number, rackId: string | number) => Observable<unknown>>('addModuleToRack$')
      .and.returnValue(of({}));
    const rackModuleAdderDataService: Pick<RackModuleAdderDataService, 'addModuleToRack$'> = {
      addModuleToRack$
    };
    const snackBarRef = {
      onAction: () => new Subject<void>().asObservable()
    } as MatSnackBarRef<TextOnlySnackBar>;
    const snackBar = jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']);
    snackBar.open.and.returnValue(snackBarRef);
    const timeagoPipe: Pick<TimeagoPipe, 'transform'> = {
      transform: jasmine.createSpy('transform').and.returnValue('recently')
    };
    dialogRef = jasmine.createSpyObj<MatDialogRef<RackModuleAdderDialogComponent, RackModuleAdderOutModel>>(
      'MatDialogRef',
      ['close']
    );

    await TestBed.configureTestingModule({
      declarations: [RackModuleAdderDialogComponent],
      imports: [
        NoopAnimationsModule,
        RouterTestingModule,
        MatFormEntityComponent,
        BrandPrimaryButtonComponent,
        MatDialogModule
      ],
      providers: [
        {provide: MAT_DIALOG_DATA, useValue: {module: moduleFixture()}},
        {provide: MatSnackBar, useValue: snackBar},
        {provide: MatDialogRef, useValue: dialogRef}
      ]
    })
      .overrideComponent(RackModuleAdderDialogComponent, {
        set: {
          providers: [
            {provide: RackModuleAdderDataService, useValue: rackModuleAdderDataService},
            {provide: UserAreaDataService, useValue: userAreaDataService},
            {provide: TimeagoPipe, useValue: timeagoPipe}
          ]
        }
      })
      .compileComponents();

    fixture = TestBed.createComponent(RackModuleAdderDialogComponent);
  });

  afterEach(() => {
    fixture?.destroy();
    document.querySelectorAll('.cdk-overlay-container').forEach(el => el.remove());
  });

  async function settle(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function getRackInput(): HTMLInputElement {
    return fixture.nativeElement.querySelector('input[type="text"]') as HTMLInputElement;
  }

  function getConfirmControl(): HTMLElement {
    return fixture.nativeElement.querySelector('app-brand-primary-button a') as HTMLElement;
  }

  it('preselects the latest rack after async rack data arrives and submits through rendered controls', async () => {
    await settle();

    const inputDebug = fixture.debugElement.query(By.directive(MatAutocompleteTrigger));
    const ngControl = inputDebug.injector.get(NgControl);
    const rackInput = getRackInput();

    expect(updateRackData$.next).toHaveBeenCalledWith(undefined);
    expect(rackInput.disabled)
      .withContext('rack autocomplete should render disabled while rackData$ is initially undefined')
      .toBe(true);
    expect(rackInput)
      .withContext('rack input query should target the rendered Material autocomplete input')
      .toBe(inputDebug.nativeElement as HTMLInputElement);
    expect(ngControl.valueAccessor instanceof MatAutocompleteTrigger)
      .withContext('rendered input must use the real Angular Material autocomplete CVA')
      .toBe(true);

    rackData$.next(racks);
    await settle();

    const expectedOption = {
      id: '2',
      name: 'Latest Rack ( 104 HP , 3 row(s) , recently )'
    };
    const rackControl = fixture.componentInstance.fields.rack.control;
    const confirmControl = getConfirmControl();

    expect(rackInput.value)
      .withContext('rendered Material autocomplete input should show the asynchronously preselected latest rack')
      .toBe(expectedOption.name);
    expect(rackControl.value).toEqual(expectedOption);
    expect(rackControl.status)
      .withContext(JSON.stringify({
        status: rackControl.status,
        errors: rackControl.errors,
        disabled: rackControl.disabled,
        input: rackInput.value
      }))
      .toBe('VALID');
    expect(rackControl.pending)
      .withContext('pre-fix regression left strict autocomplete validation stuck in PENDING after preselection')
      .toBe(false);
    expect(confirmControl.classList.contains('error'))
      .withContext('rendered Confirm control should be usable after preselection validates')
      .toBe(false);
    expect(confirmControl.getAttribute('aria-disabled'))
      .withContext('rendered Confirm anchor should not be Material-disabled')
      .not.toBe('true');

    confirmControl.click();
    await settle();

    expect(addModuleToRack$).toHaveBeenCalledWith(77, '2');
    expect(dialogRef.close).toHaveBeenCalled();
  });
});

describe('RackModuleAdderDialogComponent', () => {
  let createdComponents: RackModuleAdderDialogComponent[];

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
  
  it('builds options and preselects last updated rack', async () => {
    const {component} = build();
    const options = await firstValueFrom(
      component.fields.rack.options$.pipe(
        filter(options => options.length > 0),
        take(1)
      )
    );

    expect(options.length).toBe(2);
    expect(component.fields.rack.control.value.id).toBe('2');
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