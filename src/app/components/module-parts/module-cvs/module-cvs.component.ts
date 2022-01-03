import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output
}                                 from '@angular/core';
import { Subject }                from 'rxjs';
import {
  filter,
  takeUntil
}                                 from 'rxjs/operators';
import { PatchDetailDataService } from 'src/app/components/patch-parts/patch-detail-data.service';
import {
  CV,
  DbModule
}                                 from 'src/app/models/models';

@Component({
  selector:        'app-module-cvs',
  templateUrl:     './module-cvs.component.html',
  styleUrls:       ['./module-cvs.component.scss'],
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
  ) { }
  
  ngOnInit(): void {
    
    if (this.data.ins) { this.ins = this.data.ins; }
    if (this.data.outs) { this.outs = this.data.outs; }
  
    this.inClick$
        .pipe(
          filter(() => this.patchService.patchEditingPanelOpenState$.value),
          takeUntil(this.destroyEvent$)
        )
        .subscribe(([cv, module]) => {
          this.patchService.clickOnModuleCV$.next({
            cv:   {
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
            cv:   {
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
