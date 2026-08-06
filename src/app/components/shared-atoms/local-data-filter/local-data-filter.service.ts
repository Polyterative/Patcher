import {
  DestroyRef,
  Injectable
} from '@angular/core';
import { UntypedFormControl } from '@angular/forms';
import {
  of,
  Subject
} from 'rxjs';
import {
  debounceTime
} from 'rxjs/operators';
import {
  FormTypes,
  ISelectable
} from 'src/app/shared-interproject/components/@smart/mat-form-entity/form-element-models';
import { IMatFormEntityConfig } from 'src/app/shared-interproject/components/@smart/mat-form-entity/mat-form-entity.component';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';


@Injectable()
export class LocalDataFilterService extends SubManager {
  
  filterEvent$ = new Subject<string>();
  orderEvent$ = new Subject<ISelectable>();
  
  readonly search: IMatFormEntityConfig = {
    label: 'Search ...',
    code: 'search',
    flex: '6rem',
    control: new UntypedFormControl(''),
    type: FormTypes.TEXT,
    iconL1: 'search'
  };
  readonly order: IMatFormEntityConfig = {
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
  
  constructor(destroyRef?: DestroyRef) {
    super(destroyRef);
    
    this.search.control.valueChanges
      .pipe(
        debounceTime(350),
        this.takeUntilDestroyed()
      )
      .subscribe(x => this.filterEvent$.next(x));
    
    this.order.control.valueChanges
      .pipe(
        this.takeUntilDestroyed()
      )
      .subscribe(x => this.orderEvent$.next(x));
    
  }
  
}
