import {
  ChangeDetectionStrategy,
  Component
} from '@angular/core';
import { Subject } from 'rxjs';
import { normalizeForSearch } from 'src/app/shared-interproject/components/@smart/mat-form-entity/string-utils';
import { SupabaseService } from '../supabase.service';


@Component({
  selector: 'app-admin-panel-root',
  templateUrl: './admin-panel-root.component.html',
  styleUrls: ['./admin-panel-root.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class AdminPanelRootComponent {
  devToProd$ = new Subject<void>();
  downloadProd$ = new Subject<void>();
  downloadDev$ = new Subject<void>();
  prodToDev$ = new Subject<void>();
  click$ = new Subject<void>();
  
  constructor(public backend: SupabaseService) {}

  similarity(s1: string, s2: string): number {
    let longer = s1;
    let shorter = s2;
    if (s1.length < s2.length) {
      longer = s2;
      shorter = s1;
    }
    const longerLength = longer.length;
    if (longerLength === 0) {
      return 1.0;
    }
    return (longerLength - this.editDistance(longer, shorter)) / longerLength;
  }
  
  editDistance(s1: string, s2: string): number {
    s1 = normalizeForSearch(s1);
    s2 = normalizeForSearch(s2);
    
    const costs: number[] = [];
    for (let i = 0; i <= s1.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= s2.length; j++) {
        if (i === 0) {
          costs[j] = j;
        } else {
          if (j > 0) {
            let newValue = costs[j - 1];
            if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
              newValue = Math.min(Math.min(newValue, lastValue),
                costs[j]) + 1;
            }
            costs[j - 1] = lastValue;
            lastValue = newValue;
          }
        }
      }
      if (i > 0) {
        costs[s2.length] = lastValue;
      }
    }
    return costs[s2.length];
  }
  
}
