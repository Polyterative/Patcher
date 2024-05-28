import { Injectable } from '@angular/core';
import { UntypedFormControl } from '@angular/forms';
import {
  of,
  Subject
} from 'rxjs';
import {
  debounceTime,
  takeUntil
} from 'rxjs/operators';
import { FormTypes } from 'src/app/shared-interproject/components/@smart/mat-form-entity/form-element-models';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';


@Injectable()
export class LocalDataFilterService extends SubManager {
  
  filterEvent$ = new Subject<string>();
  orderEvent$ = new Subject<string>();
  
  search = {
    label: 'Search ...',
    code: 'search',
    flex: '6rem',
    control: new UntypedFormControl(''),
    type: FormTypes.TEXT
  };
  order  = {
    label: 'Order by',
    code: 'order',
    flex: '10rem',
    control: new UntypedFormControl(
      {
        id: 'updated',
        name: 'Updated ↓'
      }
    ),
    type: FormTypes.SELECT,
    options$: of([
      {
        id: 'name',
        name: 'Name ↑'
      },
      {
        id: 'name',
        name: 'Name ↓'
      },
      {
        id: 'hp',
        name: 'HP ↑'
      },
      {
        id: 'hp',
        name: 'HP ↓'
      },
      {
        id: 'manufacturerId',
        name: 'Manufacturer ↑'
      },
      {
        id: 'manufacturerId',
        name: 'Manufacturer ↓'
      },
      {
        id: 'created',
        name: 'Created ↑'
      },
      {
        id: 'created',
        name: 'Created ↓'
      },
      {
        id: 'updated',
        name: 'Updated ↑'
      },
      {
        id: 'updated',
        name: 'Updated ↓'
      },
      {
        id: 'isComplete',
        name: 'Data Complete ↓'
      }
    ])
  };
  
  constructor() {
    super();
    
    this.search.control.valueChanges
      .pipe(
        debounceTime(350),
        takeUntil(this.destroy$)
      )
      .subscribe(x => this.filterEvent$.next(x))
    
    this.order.control.valueChanges
      .pipe(
        takeUntil(this.destroy$)
      )
      .subscribe(x => this.orderEvent$.next(x))
    
  }
  
}