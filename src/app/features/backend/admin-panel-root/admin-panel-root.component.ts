import { HttpClient }      from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit
}                          from '@angular/core';
import {
  Subject,
  zip
}                          from 'rxjs';
import { switchMap }       from 'rxjs/operators';
import { SupabaseService } from '../supabase.service';

@Component({
  selector:        'app-admin-panel-root',
  templateUrl:     './admin-panel-root.component.html',
  styleUrls:       ['./admin-panel-root.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminPanelRootComponent implements OnInit {
  devToProd$ = new Subject<void>();
  downloadProd$ = new Subject<void>();
  downloadDev$ = new Subject<void>();
  prodToDev$ = new Subject<void>();
  click$ = new Subject<void>();
  
  constructor(public http: HttpClient, public backend: SupabaseService) { }
  
  ngOnInit(): void {
    
    this.click$
        .pipe(
          switchMap(x => zip(
              this.http.get('https://api.martinpas.com/products?published=true&_limit=99999')
            )
          )
        )
        .subscribe(x => {
          console.clear();
          console.log(x);
      
      
        });
    
    // this.click$.next();
  }
  
}
