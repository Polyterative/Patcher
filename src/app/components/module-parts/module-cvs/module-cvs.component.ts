import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit,
  Output
}                                 from '@angular/core';
import { Subject }                from 'rxjs';
import { takeUntil }              from 'rxjs/operators';
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
  
  @Output() inClick$ = new Subject<[CV, DbModule]>();
  @Output() outClick$ = new Subject<[CV, DbModule]>();
  
  protected destroyEvent$: Subject<void> = new Subject();
  
  constructor(
    public patchService: PatchDetailDataService
  ) { }
  
  ngOnInit(): void {
    
    if (this.data.ins) { this.ins = this.data.ins; }
    if (this.data.outs) { this.outs = this.data.outs; }
    
    this.inClick$
        .pipe(takeUntil(this.destroyEvent$))
        .subscribe(([cv, module]) => {
          this.patchService.clickOnModuleCV$.next({
            module,
            cv,
            kind: 'in'
          });
        });
    this.outClick$
        .pipe(takeUntil(this.destroyEvent$))
        .subscribe(([cv, module]) => {
          this.patchService.clickOnModuleCV$.next({
            module,
            cv,
            kind: 'out'
          });
        });
  
  }
  
  ngOnDestroy(): void {
    this.destroyEvent$.next();
    this.destroyEvent$.complete();
    
  }
}
