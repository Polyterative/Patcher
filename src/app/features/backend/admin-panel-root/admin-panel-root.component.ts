import { HttpClient }      from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit
}                          from '@angular/core';
import { Subject }         from 'rxjs';
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
  
    // this.click$
    //     .pipe(
    //       switchMap(x => zip(
    //           this.http.get('https://api.martinpas.com/products?published=true&_limit=99999')
    //         )
    //       )
    //     )
    //     .subscribe(x => {
    //       console.clear();
    //       console.log(x);
    //
    //
    //     });
  
  
  }
  
  similarity(s1, s2) {
    let longer = s1;
    var shorter = s2;
    if (s1.length < s2.length) {
      longer = s2;
      shorter = s1;
    }
    var longerLength = longer.length;
    if (longerLength == 0) {
      return 1.0;
    }
    return (longerLength - this.editDistance(longer, shorter)) / parseFloat(longerLength);
  }
  
  editDistance(s1, s2) {
    s1 = s1.toLowerCase();
    s2 = s2.toLowerCase();
    
    var costs = new Array();
    for (var i = 0; i <= s1.length; i++) {
      var lastValue = i;
      for (var j = 0; j <= s2.length; j++) {
        if (i == 0)
          costs[j] = j;
        else {
          if (j > 0) {
            var newValue = costs[j - 1];
            if (s1.charAt(i - 1) != s2.charAt(j - 1))
              newValue = Math.min(Math.min(newValue, lastValue),
                costs[j]) + 1;
            costs[j - 1] = lastValue;
            lastValue = newValue;
          }
        }
      }
      if (i > 0)
        costs[s2.length] = lastValue;
    }
    return costs[s2.length];
  }
  
}
