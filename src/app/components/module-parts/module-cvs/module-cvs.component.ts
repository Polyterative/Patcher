import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output, OnDestroy
} from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  fadeInOnEnterAnimation,
  fadeOutOnLeaveAnimation
} from 'angular-animations';
import {
  EMPTY,
  of,
  Subject
} from 'rxjs';
import {
  catchError,
  filter,
  switchMap,
  takeUntil,
  tap
} from 'rxjs/operators';
import { PatchDetailDataService } from 'src/app/components/patch-parts/patch-detail-data.service';
import { CV } from 'src/app/models/cv';
import { DbModule } from 'src/app/models/module';


@Component({
  selector: 'app-module-cvs',
  templateUrl: './module-cvs.component.html',
  styleUrls: ['./module-cvs.component.scss'],
  animations: [
    fadeInOnEnterAnimation({
      anchor: 'enter',
      duration: 225,
      animateChildren: 'after'
    }),
    fadeOutOnLeaveAnimation({
      anchor: 'leave',
      duration: 1
    })
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class ModuleCVsComponent implements OnInit, OnDestroy {
  @Input() data: DbModule;
  /** When set, CV clicks will include this instance_id in the emitted CVwithModule */
  @Input() instanceId: number | undefined;
  /** When true, a missing instanceId triggers creation of a new instance (for rack copies) */
  @Input() forceNewInstance = false;
  
  ins: CV[] = [];
  outs: CV[] = [];
  private creatingInstance = false;
  @Output() inClick$ = new EventEmitter<[CV, DbModule]>();
  @Output() outClick$ = new EventEmitter<[CV, DbModule]>();
  
  protected destroyEvent$ = new Subject<void>();
  
  constructor(
    public patchService: PatchDetailDataService,
    private readonly snackBar: MatSnackBar
  ) {
  }
  
  ngOnInit(): void {
    // Custom comparator to sort strings with numeric parts correctly
    const customSort = (a: CV, b: CV) => {
      const aParts = a.name.match(/(\D+|\d+)/g);
      const bParts = b.name.match(/(\D+|\d+)/g);
      
      for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
        const aPart = aParts[i] || '';
        const bPart = bParts[i] || '';
        
        // Check if parts are numbers
        const aNum = parseInt(aPart, 10);
        const bNum = parseInt(bPart, 10);
        
        if (!isNaN(aNum) && !isNaN(bNum)) {
          // Compare as numbers
          if (aNum !== bNum) {
            return aNum - bNum;
          }
        } else {
          // Compare as strings
          const comparison = aPart.localeCompare(bPart);
          if (comparison !== 0) {
            return comparison;
          }
        }
      }
      
      return 0;
    };
    
    // Sort the ins and outs using the custom comparator
    if (this.data.ins) { this.ins = this.data.ins.slice().sort(customSort); }
    if (this.data.outs) { this.outs = this.data.outs.slice().sort(customSort); }
    
    this.inClick$
      .pipe(
        filter(() => this.patchService.patchEditingPanelOpenState$.value),
        switchMap(([cv, module]) =>
          this.resolveInstanceIdForClick$(module).pipe(
            tap(resolvedId => {
              this.patchService.clickOnModuleCV$.next({
                cv: {...cv, module, instance_id: resolvedId},
                kind: 'in'
              });
            }),
            catchError(() => EMPTY)
          )
        ),
        takeUntil(this.destroyEvent$)
      )
      .subscribe();
    
    this.outClick$
      .pipe(
        filter(() => this.patchService.patchEditingPanelOpenState$.value),
        switchMap(([cv, module]) =>
          this.resolveInstanceIdForClick$(module).pipe(
            tap(resolvedId => {
              this.patchService.clickOnModuleCV$.next({
                cv: {...cv, module, instance_id: resolvedId},
                kind: 'out'
              });
            }),
            catchError(() => EMPTY)
          )
        ),
        takeUntil(this.destroyEvent$)
      )
      .subscribe();
    
  }
  
  ngOnDestroy(): void {
    this.destroyEvent$.next();
    this.destroyEvent$.complete();
  }
  
  /**
   * If instanceId is already set (module has an instance), return it immediately.
   * Otherwise, lazily auto-create an instance for this module in the current patch
   * and return the new id.
   */
  private ensureInstanceId$(module: DbModule) {
    if (this.instanceId != null) {
      return of(this.instanceId);
    }
    if (this.creatingInstance) {
      return EMPTY;
    }
    this.creatingInstance = true;
    return this.patchService.ensureModuleInstance$(module, this.forceNewInstance).pipe(
      tap(newId => {
        this.instanceId = newId;
        this.creatingInstance = false;
      }),
      catchError(() => {
        this.creatingInstance = false;
        return EMPTY;
      })
    );
  }

  private resolveInstanceIdForClick$(module: DbModule) {
    if (this.shouldBlockAmbiguousClick(module.id)) {
      this.snackBar.open(
        `"${ module.name }" has multiple copies — wire from a labeled copy instead.`,
        undefined,
        {duration: 4000, panelClass: 'snack-info'}
      );
      return EMPTY;
    }

    return this.ensureInstanceId$(module);
  }

  private shouldBlockAmbiguousClick(moduleId: number): boolean {
    if (this.instanceId != null || this.forceNewInstance) {
      return false;
    }

    const matchingInstances = this.patchService.patchModuleInstances$.value
      .filter(instance => instance.module_id === moduleId);

    return matchingInstances.length > 1;
  }
  
}
