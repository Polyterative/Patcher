import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnDestroy,
  OnInit
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SeoSocialShareData } from 'src/app/models/seo.model';
import {
  BehaviorSubject,
  combineLatest,
  delay,
  Observable
} from 'rxjs';
import {
  defaultModuleMinimalViewConfig,
  ModuleMinimalViewConfig
} from 'src/app/components/module-parts/module-minimal/module-minimal.component';
import { FileDragHostService } from 'src/app/shared-interproject/components/@smart/file-drag-host/file-drag-host.service';
import { SeoAndUtilsService } from '../../backbone/seo-and-utils.service';
import { ModuleAdderDataService } from './module-adder-data.service';
import { UserManagementService } from "src/app/features/backbone/login/user-management.service";
import {
  filter,
  map,
  startWith,
  takeUntil
} from "rxjs/operators";
import { SubManager } from "src/app/shared-interproject/directives/subscription-manager";


export type AdderWizardStep = 'intro' | 'fill';
export type SidebarState = 'idle' | 'searching' | 'results' | 'clear';


@Component({
  selector: 'app-module-browser-adder',
  templateUrl: './module-browser-adder.component.html',
  styleUrls: ['./module-browser-adder.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    ModuleAdderDataService,
    FileDragHostService
  ],
  standalone: false
})
export class ModuleBrowserAdderComponent extends SubManager implements OnInit, OnDestroy {

  @Input() ignoreSeo = false;

  readonly step$ = new BehaviorSubject<AdderWizardStep>('intro');

  /** derived from name input — used to progressively reveal specs */
  identityReady$: Observable<boolean>;

  /** sidebar UI state during the FILL step */
  sidebarState$: Observable<SidebarState>;

  /** progress checklist for the sidebar */
  progressSteps$: Observable<{ id: string; label: string; done: boolean }[]>;
  progressDone$: Observable<number>;
  progressTotal$: Observable<number>;

  /** celebration overlay — emits the submitted module name briefly after success */
  readonly celebration$ = new BehaviorSubject<{
    name: string;
    manufacturer?: string;
    hp?: number;
    standard?: string;
    isDIY?: boolean;
  } | null>(null);

  /** "Safety cover" two-stage submit: 'safe' → 'armed' → fire. Disarms on any form change. */
  readonly armed$ = new BehaviorSubject<boolean>(false);

  readonly viewConfig: ModuleMinimalViewConfig = {
    ...defaultModuleMinimalViewConfig,
    hideTags:    true,
    hideButtons: true,
    hideDates:   false
  };

  readonly guidelinesData: Array<{ label: string; value: string; icon: string }> = [
    {
      label: 'Check for Duplicates',
      value: 'Use the live similar-modules panel that appears as you type. If a match exists, please use that one.',
      icon: 'search'
    },
    {
      label: 'No Panel Variations',
      value: 'Submit one entry per module — different finishes (silver, black, …) are considered the same module.',
      icon: 'layers_clear'
    },
    {
      label: 'Details After Submission',
      value: 'Panel images, power specs and I/O are added on the module detail page right after you submit.',
      icon: 'add_circle_outline'
    },
    {
      label: 'Instant Publish, Reviewed Later',
      value: 'Your module is usable immediately. Our team reviews submissions afterwards.',
      icon: 'flash_on'
    },
    {
      label: 'Manufacturer Missing?',
      value: 'You can create a new manufacturer inline from the form on the next step.',
      icon: 'factory'
    }
  ];

  constructor(
    public dataService: ModuleAdderDataService,
    public route: ActivatedRoute,
    readonly seoAndUtilsService: SeoAndUtilsService,
    public userService: UserManagementService,
  ) {
    super();
  }

  goToFill(): void {
    this.step$.next('fill');
    queueMicrotask(() => {
      const el = document.querySelector('.fill-stage');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  backToIntro(): void {
    this.step$.next('intro');
    this.disarm();
    queueMicrotask(() => {
      const el = document.querySelector('.intro-stage');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  /** First click arms, second click fires. Any form change disarms. */
  handleSubmitClick(): void {
    if (!this.dataService.formGroup.valid) return;
    if (this.armed$.value) {
      this.disarm();
      this.dataService.submitModuleForm$.next();
      return;
    }
    this.armed$.next(true);
  }

  private disarm(): void {
    if (this.armed$.value) this.armed$.next(false);
  }

  ngOnInit(): void {

    // Identity readiness — true when name has been entered
    this.identityReady$ = this.dataService.formData.name.control.valueChanges.pipe(
      startWith(this.dataService.formData.name.control.value),
      map((v: string) => !!v && v.trim().length > 0)
    );

    // Sidebar state machine driven by name input + similar-modules results
    const name$ = this.dataService.formData.name.control.valueChanges.pipe(
      startWith(this.dataService.formData.name.control.value),
      map((v: string) => (v ?? '').trim())
    );

    this.sidebarState$ = combineLatest([
      name$,
      this.dataService.similarModulesData$
    ]).pipe(
      map(([name, data]): SidebarState => {
        if (name.length === 0) return 'idle';
        if (data === undefined) return 'searching';
        if (data.length > 0)    return 'results';
        return 'clear';
      })
    );

    // Progress checklist — based on required form controls
    const fd = this.dataService.formData;
    const mfr$  = fd.manufacturer.control.valueChanges.pipe(startWith(fd.manufacturer.control.value));
    const nm$   = fd.name.control.valueChanges.pipe(startWith(fd.name.control.value));
    const hp$   = fd.hp.control.valueChanges.pipe(startWith(fd.hp.control.value));
    const std$  = fd.standard.control.valueChanges.pipe(startWith(fd.standard.control.value));

    const isFilled = (v: any): boolean => {
      if (v === null || v === undefined) return false;
      if (typeof v === 'string') return v.trim().length > 0;
      if (typeof v === 'object') return !!v.id;
      return !!v;
    };

    this.progressSteps$ = combineLatest([mfr$, nm$, hp$, std$]).pipe(
      map(([mfr, nm, hp, std]) => [
        { id: 'manufacturer', label: 'Manufacturer', done: isFilled(mfr) },
        { id: 'name',         label: 'Name',         done: isFilled(nm) },
        { id: 'hp',           label: 'HP',           done: isFilled(hp) && parseInt(hp) > 0 },
        { id: 'standard',     label: 'Standard',     done: isFilled(std) }
      ])
    );
    this.progressDone$  = this.progressSteps$.pipe(map(s => s.filter(x => x.done).length));
    this.progressTotal$ = this.progressSteps$.pipe(map(s => s.length));

    // celebration overlay on successful submission
    this.dataService.submitSuccess$
      .pipe(takeUntil(this.destroy$))
      .subscribe(payload => this.celebration$.next(payload));

    // any edit to the form disarms the two-step submit
    this.dataService.formGroup.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.armed$.value) this.armed$.next(false);
      });

    // prefill from query params
    combineLatest([
      this.route.queryParams,
      this.dataService.formData.manufacturer.options$.pipe(
        filter(x => x.length > 0),
        takeUntil(this.destroy$)
      ),
      this.dataService.formData.standard.options$.pipe(
        filter(x => x.length > 0),
        takeUntil(this.destroy$)
      ),
    ])
      .pipe(
        delay(200),
        takeUntil(this.destroy$),
      )
      .subscribe(([params, manufacturersList, standardsList]) => {
          if (parseInt(params.manufacturer)) {
            this.dataService.formData.manufacturer.control.patchValue(
              manufacturersList.find(x => x.id === params.manufacturer)
            );
          }

          if (parseInt(params.HP)) {
            this.dataService.formData.hp.control.patchValue(parseInt(params.HP));
          }

          if (parseInt(params.standard)) {
            this.dataService.formData.standard.control.patchValue(
              standardsList.find(x => x.id === params.standard)
            );
          }
        }
      );

    this.updateSeo();
  }

  private updateSeo(): void {
    const seoData: SeoSocialShareData = {
      title:       'Submit a module',
      description: 'Submit a module - details',
      keywords:    'add,submit, module, eurorack,'
    };
    this.seoAndUtilsService.updateSeo(seoData,
      'Submit a module');
  }

  override ngOnDestroy(): void {
    super.ngOnDestroy();
  }

}
