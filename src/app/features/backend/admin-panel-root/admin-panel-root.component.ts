import {
  ChangeDetectionStrategy,
  Component,
  OnInit
}                          from '@angular/core';
import { Subject }         from 'rxjs';
import { switchMap }       from 'rxjs/operators';
import { SupabaseService } from '../supabase.service';

@Component({
  selector:        'app-admin-panel-root',
  templateUrl:     './admin-panel-root.component.html',
  styleUrls:       ['./admin-panel-root.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminPanelRootComponent implements OnInit {
  devToProd$ = new Subject();
  downloadProd$ = new Subject();
  downloadDev$ = new Subject();
  prodToDev$ = new Subject();
  click$ = new Subject();
  
  constructor(public backend: SupabaseService) { }
  
  ngOnInit(): void {
  
    this.click$
        .pipe(
          switchMap(x => this.backend.get.modulesFull(0, 9999))
        )
        .subscribe(x => {
    
          // let z = x.data.filter(value => (value.ins.length > 0) || (value.outs.length > 0));
          //
          //
          // z.forEach(m => {
          //
          //   this.backend.add.moduleOUTs(m.outs, m.id)
          //       .subscribe(value => {});
          //
          // });
    
        });
  }
  
}
