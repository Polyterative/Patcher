import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output
} from '@angular/core';
import {
  fadeInOnEnterAnimation,
  fadeOutOnLeaveAnimation
} from 'angular-animations';
import { Subject } from 'rxjs';
import {
  filter,
  takeUntil
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
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModuleCVsComponent implements OnInit {
  @Input() data: DbModule;
  
  ins: CV[] = [];
  outs: CV[] = [];
  
  @Output() inClick$ = new EventEmitter<[CV, DbModule]>();
  @Output() outClick$ = new EventEmitter<[CV, DbModule]>();
  
  protected destroyEvent$ = new Subject<void>();
  
  constructor(
    public patchService: PatchDetailDataService
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
        takeUntil(this.destroyEvent$)
      )
      .subscribe(([cv, module]) => {
        this.patchService.clickOnModuleCV$.next({
          cv: {
            ...cv,
            module
          },
          kind: 'in'
        });
      });
    this.outClick$
      .pipe(
        filter(() => this.patchService.patchEditingPanelOpenState$.value),
        takeUntil(this.destroyEvent$)
      )
      .subscribe(([cv, module]) => {
        this.patchService.clickOnModuleCV$.next({
          cv: {
            ...cv,
            module
          },
          kind: 'out'
        });
      });
    
  }
  
  ngOnDestroy(): void {
    this.destroyEvent$.next();
    this.destroyEvent$.complete();
  }
  
}