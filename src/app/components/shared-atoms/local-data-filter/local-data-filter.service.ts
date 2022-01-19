import { Injectable }   from '@angular/core';
import { FormControl }  from '@angular/forms';
import { Subject }      from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { FormTypes }    from '../../../shared-interproject/components/@smart/mat-form-entity/form-element-models';
import { SubManager }   from '../../../shared-interproject/directives/subscription-manager';

@Injectable()
export class LocalDataFilterService extends SubManager {
  
  filterEvent$ = new Subject<string>();
  
  search = {
    label:   'Search ...',
    code:    'search',
    flex:    '6rem',
    control: new FormControl(''),
    type:    FormTypes.TEXT
  };
  
  constructor() {
    super();
    
    this.manageSub(
      this.search.control.valueChanges.pipe(debounceTime(500))
          .subscribe(x => this.filterEvent$.next(x))
    );
    
  }
  
}
