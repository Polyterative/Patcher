import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import {
  BehaviorSubject,
  of,
  Subject,
  throwError
} from 'rxjs';
import { PatchModuleInstance } from 'src/app/models/connection';
import {
  CV,
  CVConnectionEntity
} from 'src/app/models/cv';
import { DbModule } from 'src/app/models/module';
import { PatchDetailDataService } from '../../patch-parts/patch-detail-data.service';
import { dbModuleFixture } from '../../patch-parts/patch-graph/patch-graph-test-fixtures';
import { ModuleCVsComponent } from './module-cvs.component';


describe('ModuleCVsComponent', () => {
  const emptyStateMessage = 'No inputs or outputs are listed for this module yet.';
  type EnsureModuleInstance = PatchDetailDataService['ensureModuleInstance$'];

  type ModuleCvsPatchServiceDouble = PatchDetailDataService & {
    patchEditingPanelOpenState$: BehaviorSubject<boolean>;
    patchModuleInstances$: BehaviorSubject<PatchModuleInstance[]>;
    clickOnModuleCV$: Subject<CVConnectionEntity>;
    ensureModuleInstance$: jasmine.Spy<EnsureModuleInstance>;
  };

  function cvFixture(id: number, name: string): CV {
    return {id, name};
  }

  function moduleFixture(
    id = 10,
    name = 'Module',
    ins: CV[] = [],
    outs: CV[] = []
  ): DbModule {
    return dbModuleFixture(id, name, ins, outs);
  }

  function patchModuleInstanceFixture(id: number, moduleId = 10): PatchModuleInstance {
    return {
      id,
      patch_id: 1,
      module_id: moduleId,
      instance_label: null
    };
  }

  function createPatchServiceDouble(clickOnModuleCV$: Subject<CVConnectionEntity>): ModuleCvsPatchServiceDouble {
    return Object.assign(
      Object.create(PatchDetailDataService.prototype) as PatchDetailDataService,
      {
        patchEditingPanelOpenState$: new BehaviorSubject<boolean>(true),
        patchModuleInstances$: new BehaviorSubject<PatchModuleInstance[]>([]),
        clickOnModuleCV$,
        ensureModuleInstance$: jasmine.createSpy<EnsureModuleInstance>('ensureModuleInstance$')
          .and.returnValue(of(77))
      }
    );
  }

  function build() {
    const clickOnModuleCV$ = new Subject<CVConnectionEntity>();
    const snackBar = jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']);
    const patchService = createPatchServiceDouble(clickOnModuleCV$);
    const component = new ModuleCVsComponent(patchService, snackBar);
    component.data = moduleFixture(
      10,
      'Module',
      [cvFixture(1, 'In10'), cvFixture(2, 'In2'), cvFixture(3, 'In1')],
      [cvFixture(4, 'Out2'), cvFixture(5, 'Out10'), cvFixture(6, 'Out1')]
    );
    return {component, patchService, clickOnModuleCV$, snackBar};
  }

  describe('template CV availability state', () => {
    let fixture: ComponentFixture<ModuleCVsComponent>;

    beforeEach(async () => {
      const clickOnModuleCV$ = new Subject<CVConnectionEntity>();
      const snackBar = jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']);
      const patchService = createPatchServiceDouble(clickOnModuleCV$);

      await TestBed.configureTestingModule({
        declarations: [ModuleCVsComponent],
        imports: [NoopAnimationsModule],
        providers: [
          {provide: PatchDetailDataService, useValue: patchService},
          {provide: MatSnackBar, useValue: snackBar}
        ],
        schemas: [NO_ERRORS_SCHEMA]
      }).compileComponents();
    });

    function render(ins: CV[], outs: CV[]): HTMLElement {
      fixture = TestBed.createComponent(ModuleCVsComponent);
      fixture.componentInstance.data = moduleFixture(10, 'Module', ins, outs);
      fixture.detectChanges();

      return fixture.nativeElement as HTMLElement;
    }

    it('shows the empty state when no inputs or outputs are listed', () => {
      const host = render([], []);

      expect(host.textContent).toContain(emptyStateMessage);
      expect(host.querySelector('.ins')).toBeNull();
      expect(host.querySelector('.outs')).toBeNull();
    });

    it('shows inputs without the empty state for inputs-only modules', () => {
      const host = render([cvFixture(1, 'In1')], []);

      expect(host.textContent).toContain('1 INs ↘');
      expect(host.textContent).not.toContain(emptyStateMessage);
      expect(host.querySelector('.ins')).not.toBeNull();
      expect(host.querySelector('.outs')).toBeNull();
    });

    it('shows outputs without the empty state for outputs-only modules', () => {
      const host = render([], [cvFixture(1, 'Out1')]);

      expect(host.textContent).toContain('1 OUTs ↗');
      expect(host.textContent).not.toContain(emptyStateMessage);
      expect(host.querySelector('.outs')).not.toBeNull();
      expect(host.querySelector('.ins')).toBeNull();
    });
  });
  
  it('sorts ins/outs using numeric-aware comparator', () => {
    const {component} = build();
    
    component.ngOnInit();
    
    expect(component.ins.map(x => x.name)).toEqual(['In1', 'In2', 'In10']);
    expect(component.outs.map(x => x.name)).toEqual(['Out1', 'Out2', 'Out10']);
  });
  
  it('handles equal and pure-string CV names in sort comparator', () => {
    const {component} = build();
    component.data = moduleFixture(
      10,
      'Module',
      [cvFixture(1, 'Alpha'), cvFixture(2, 'Alpha'), cvFixture(3, 'Beta')]
    );
    
    component.ngOnInit();
    
    expect(component.ins.map(x => x.name)).toEqual(['Alpha', 'Alpha', 'Beta']);
  });
  
  it('auto-creates and caches instance id on first click when missing', () => {
    const {component, patchService, clickOnModuleCV$} = build();
    const emissions: CVConnectionEntity[] = [];
    clickOnModuleCV$.subscribe(v => emissions.push(v));
    component.instanceId = undefined;
    component.ngOnInit();
    
    const cv = cvFixture(1, 'In1');
    const mod = moduleFixture();
    component.inClick$.next([cv, mod]);
    component.outClick$.next([cvFixture(2, 'Out1'), mod]);
    
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
    component.inClick$.next([cvFixture(1, 'In1'), moduleFixture()]);
    
    expect(nextSpy).not.toHaveBeenCalled();
    expect(patchService.ensureModuleInstance$).not.toHaveBeenCalled();
  });
  
  it('swallows ensure-instance errors for both in/out click streams', () => {
    const {component, patchService, clickOnModuleCV$} = build();
    const nextSpy = spyOn(clickOnModuleCV$, 'next').and.callThrough();
    patchService.ensureModuleInstance$.and.returnValue(throwError(() => new Error('fail')));
    component.instanceId = undefined;
    component.ngOnInit();
    
    const moduleData = moduleFixture();
    component.inClick$.next([cvFixture(1, 'In'), moduleData]);
    component.outClick$.next([cvFixture(2, 'Out'), moduleData]);
    
    expect(nextSpy).not.toHaveBeenCalled();
  });

  it('blocks ambiguous clicks on an unlabeled card when multiple instances exist', () => {
    const {component, patchService, clickOnModuleCV$, snackBar} = build();
    const nextSpy = spyOn(clickOnModuleCV$, 'next').and.callThrough();
    patchService.patchModuleInstances$.next([
      patchModuleInstanceFixture(101),
      patchModuleInstanceFixture(102)
    ]);
    component.instanceId = undefined;
    component.ngOnInit();

    component.outClick$.next([cvFixture(2, 'Out'), moduleFixture()]);

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
    const emissions: CVConnectionEntity[] = [];
    clickOnModuleCV$.subscribe(v => emissions.push(v));
    patchService.patchModuleInstances$.next([
      patchModuleInstanceFixture(101),
      patchModuleInstanceFixture(102)
    ]);
    component.instanceId = 102;
    component.ngOnInit();

    component.inClick$.next([cvFixture(1, 'In1'), moduleFixture()]);

    expect(patchService.ensureModuleInstance$).not.toHaveBeenCalled();
    expect(emissions.length).toBe(1);
    expect(emissions[0].cv.instance_id).toBe(102);
    expect(snackBar.open).not.toHaveBeenCalled();
  });
  
  it('emits and completes inherited destroy subject on ngOnDestroy', () => {
    const {component} = build();
    const nextSpy = spyOn(component.destroy$, 'next').and.callThrough();
    const completeSpy = spyOn(component.destroy$, 'complete').and.callThrough();
    
    component.ngOnDestroy();
    
    expect(nextSpy).toHaveBeenCalled();
    expect(completeSpy).toHaveBeenCalled();
  });
});
