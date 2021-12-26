import {
  Injectable,
  OnDestroy
}                                from '@angular/core';
import { FormControl }           from '@angular/forms';
import { PageEvent }             from '@angular/material/paginator';
import { MatSnackBar }           from '@angular/material/snack-bar';
import {
  BehaviorSubject,
  combineLatest,
  of,
  Subject
}                                from 'rxjs';
import {
  distinctUntilChanged,
  startWith,
  switchMap,
  takeUntil,
  withLatestFrom
}                                from 'rxjs/operators';
import { Rack }                  from '../../models/models';
import { FormTypes }             from '../../shared-interproject/components/@smart/mat-form-entity/form-element-models';
import { UserManagementService } from '../backbone/login/user-management.service';
import { SupabaseService }       from '../backend/supabase.service';

export type RackList = Rack[] | null;

@Injectable()
export class RackBrowserDataService implements OnDestroy {
  racksList$ = new BehaviorSubject<RackList>(null);
  userRacksList$ = new BehaviorSubject<RackList>(null);
  updateRacksList$ = new Subject<void>();
  
  ////
  serversideTableRequestData = {
    skip$:   new BehaviorSubject<number>(0),
    take$:   new BehaviorSubject<number>(10),
    filter$: new BehaviorSubject<string>(''),
    sort$:   new BehaviorSubject<[string, string]>([
      '',
      ''
    ]) // { example:  "active": "name",// "direction": "desc"// }
  };
  serversideAdditionalData = {
    itemsCount$: new BehaviorSubject<number>(0)
  };
  
  formTypes = FormTypes;
  
  fields = {
    
    search: {
      label:   'search',
      code:    'search',
      flex:    '6rem',
      control: new FormControl(''),
      type:    FormTypes.TEXT
      
    },
    order: {
      label:    'order',
      code:     'order',
      flex:     '6rem',
      control:  new FormControl({
        id:   'updated',
        name: 'Updated'
      }),
      type:     FormTypes.SELECT,
      options$: of([
        {
          id:   'name',
          name: 'Name ↑'
        },
        {
          id:   'name',
          name: 'Name ↓'
        },
        {
          id:   'created',
          name: 'Created ↑'
        },
        {
          id:   'created',
          name: 'Created ↓'
        },
        {
          id:   'updated',
          name: 'Updated ↑'
        },
        {
          id:   'updated',
          name: 'Updated ↓'
        }
      ])
                  .pipe(
                    startWith([]))
  
    }
  };
  
  paginatorToFistPage$ = new Subject<void>();
  protected destroyEvent$ = new Subject<void>();
  private serversideDataPackage$ = combineLatest([
    this.serversideTableRequestData.skip$.pipe(distinctUntilChanged()),
    this.serversideTableRequestData.take$.pipe(distinctUntilChanged()),
    this.serversideTableRequestData.filter$.pipe(distinctUntilChanged()),
    this.serversideTableRequestData.sort$.pipe(distinctUntilChanged())
  ]);
  dirty = false;
  
  onPageEvent($event: PageEvent) {
    this.serversideTableRequestData.take$.next($event.pageSize);
    this.serversideTableRequestData.skip$.next(($event.pageIndex) * $event.pageSize);
    this.updateRacksList$.next();
  }
  
  onFilterEvent(userText: string) {
    this.serversideTableRequestData.skip$.next(0);
    this.serversideTableRequestData.filter$.next(userText);
    this.updateRacksList$.next();
  }
  
  onSortEvent(column: string, direction = 'asc'): void {
    this.serversideTableRequestData.sort$.next([
      column,
      direction
    ]);
    this.updateRacksList$.next();
  }
  
  constructor(
    private userService: UserManagementService,
    private snackBar: MatSnackBar,
    private backend: SupabaseService
  ) {
  
    this.fields.order.control.valueChanges.subscribe(data => this.onSortEvent(data.id, data.name.includes('↑') ? 'asc' : 'desc'));
  
    this.updateRacksList$
        .pipe(
          withLatestFrom(this.serversideDataPackage$),
          switchMap(([z, [skip, take, filter, sort]]) => {
            const sortColumnName: string = sort[0] ? sort[0] : null;
            const sortDirection = sort[1];
  
            // return this.backend.get.racks(skip, (skip + take) - 1, filter, sortColumnName);
            return this.backend.get.racksMinimal(skip, (skip + take) - 1, filter, sortColumnName, sortDirection);
          }),
          takeUntil(this.destroyEvent$)
        )
        .subscribe(x => {
          this.serversideAdditionalData.itemsCount$.next(x.count);
          this.racksList$.next(x.data);
      
          this.dirty = true;
        });
    
    this.fields.search.control.valueChanges.pipe(takeUntil(this.destroyEvent$))
        .subscribe(x => {
          this.paginatorToFistPage$.next();
          this.onFilterEvent(x);
          // this.updateData$.next();
        });
  }
  
  ngOnDestroy(): void {
    this.destroyEvent$.next();
    this.destroyEvent$.complete();
    
  }
}
