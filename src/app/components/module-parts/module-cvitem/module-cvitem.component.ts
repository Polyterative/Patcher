import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit,
  Output
}                                 from '@angular/core';
import {
  BehaviorSubject,
  Subject
}                                 from 'rxjs';
import {
  map,
  takeUntil
}                                 from 'rxjs/operators';
import { PatchDetailDataService } from 'src/app/components/patch-parts/patch-detail-data.service';
import { CV }                     from 'src/app/models/models';

@Component({
  selector:        'app-module-cvitem',
  templateUrl:     './module-cvitem.component.html',
  styleUrls:       ['./module-cvitem.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModuleCVItemComponent implements OnInit {
  @Input()
  public readonly data: CV;
  @Input()
  public readonly kind: 'in' | 'out';
  @Output() click$ = new Subject<CV>();
  
  highlightedFrom = new BehaviorSubject(false);
  highlightedTo = new BehaviorSubject(false);
  
  constructor(
    public patchService: PatchDetailDataService
  ) { }
  
  ngOnInit(): void {
    
    
    switch (this.kind) {
      case 'in':
        this.patchService.selectedForConnection$
            .pipe(
              map((data) => {
                return data && data.b ? data.b.cv.id == this.data.id : false;
              }),
              takeUntil(this.destroyEvent$)
            )
            .subscribe(this.highlightedFrom);
        break;
      case 'out':
        this.patchService.selectedForConnection$
            .pipe(
              map((data) => {
                return data && data.a ? data.a.cv.id == this.data.id : false;
              }),
              takeUntil(this.destroyEvent$)
            )
            .subscribe(this.highlightedTo);
        break;
    }
    
    ;
  }
  
  protected destroyEvent$: Subject<void> = new Subject();
  
  ngOnDestroy(): void {
    this.destroyEvent$.next();
    this.destroyEvent$.complete();
    
  }
}
