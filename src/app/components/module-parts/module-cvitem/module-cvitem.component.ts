import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';
import { PatchDetailDataService } from 'src/app/components/patch-parts/patch-detail-data.service';
import { CV } from 'src/app/models/cv';
import { AppStateService } from 'src/app/shared-interproject/app-state.service';

@Component({
  selector:        'app-module-cvitem',
  templateUrl:     './module-cvitem.component.html',
  styleUrls:       ['./module-cvitem.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModuleCVItemComponent implements OnInit {
  @Input() readonly data: CV;
  @Input() readonly kind: 'in' | 'out';
  @Output() readonly click$ = new EventEmitter<CV>();
  
  highlightedFrom = new BehaviorSubject(false);
  highlightedTo = new BehaviorSubject(false);
  
  protected destroyEvent$ = new Subject<void>();
  
  constructor(
    public appState: AppStateService,
    public patchService: PatchDetailDataService
  ) { }
  
  ngOnInit(): void {
    
    switch (this.kind) {
      case 'in':
        this.patchService.selectedForConnection$
            .pipe(
              map(data => data && data.b ? data.b.cv.id == this.data.id : false),
              takeUntil(this.destroyEvent$)
            )
            .subscribe(this.highlightedFrom);
        break;
      case 'out':
        this.patchService.selectedForConnection$
            .pipe(
              map(data => data && data.a ? data.a.cv.id == this.data.id : false),
              takeUntil(this.destroyEvent$)
            )
            .subscribe(this.highlightedTo);
        break;
    }
    
  }
  
  ngOnDestroy(): void {
    this.destroyEvent$.next();
    this.destroyEvent$.complete();
    
  }
}
