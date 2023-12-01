import { Injectable, OnDestroy } from '@angular/core';
import { UntypedFormControl } from '@angular/forms';
import { PageEvent } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BehaviorSubject, combineLatest, of, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, map, share, startWith, switchMap, takeUntil, withLatestFrom } from 'rxjs/operators';
import { DbModule, MinimalModule } from '../../models/module';
import { FormTypes, getCleanedValueId } from '../../shared-interproject/components/@smart/mat-form-entity/form-element-models';
import { UserManagementService } from '../backbone/login/user-management.service';
import { SupabaseService } from '../backend/supabase.service';

export type ModuleList = MinimalModule[] | null;

@Injectable()
export class ModuleBrowserDataService implements OnDestroy {
  protected destroyEvent$ = new Subject<void>();
  //
  modulesList$ = new BehaviorSubject<ModuleList>(null);
  userModulesList$ = new BehaviorSubject<DbModule[]>([]);
  updateModulesList$ = new Subject<void>();
  
  ////
  serversideTableRequestData = {
    skip$:   new BehaviorSubject<number>(0),
    take$:   new BehaviorSubject<number>(20),
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
    search:        {
      label:   'Search module...',
      code:    'search',
      flex:    '6rem',
      control: new UntypedFormControl(''),
      type:    FormTypes.TEXT
    },
    order:         {
      label:    'order',
      code:     'order',
      flex:     '6rem',
      control: new UntypedFormControl({
        id:   'name',
        name: 'Name'
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
          id:   'hp',
          name: 'HP ↑'
        },
        {
          id:   'hp',
          name: 'HP ↓'
        },
        {
          id:   'manufacturerId',
          name: 'Manufacturer ↑'
        },
        {
          id:   'manufacturerId',
          name: 'Manufacturer ↓'
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
        },
        {
          id:   'isComplete',
          name: 'Data Complete ↓'
        }
      ])
      
    },
    manufacturers: {
      label:    '...made by',
      code:     'manufacturers',
      flex:     '6rem',
      control:  new UntypedFormControl(),
      type:     FormTypes.AUTOCOMPLETE,
      options$: this.backend.get.manufacturers(0, 9999, 'id,name')
                    .pipe(
                      map(x => x.data.map(z => ({
                        id:   z.id.toString(),
                        name: z.name
                      }))),
                      startWith([]),
                      takeUntil(this.destroyEvent$),
                      share()
                    )
      
    }
  };
  
  paginatorToFistPage$ = new Subject<void>();
  dirty = false;
  private serversideDataPackage$ = combineLatest([
    this.serversideTableRequestData.skip$.pipe(distinctUntilChanged()),
    this.serversideTableRequestData.take$.pipe(distinctUntilChanged()),
    this.serversideTableRequestData.filter$.pipe(distinctUntilChanged()),
    this.serversideTableRequestData.sort$.pipe(distinctUntilChanged())
  ]);
  
  onPageEvent($event: PageEvent) {
    this.serversideTableRequestData.take$.next($event.pageSize);
    this.serversideTableRequestData.skip$.next(($event.pageIndex) * $event.pageSize);
    this.updateModulesList$.next();
  }
  
  onFilterEvent(userText: string) {
    this.serversideTableRequestData.skip$.next(0);
    this.serversideTableRequestData.filter$.next(userText);
    this.updateModulesList$.next();
  }
  
  onSortEvent(column: string, direction = 'asc'): void {
    this.serversideTableRequestData.sort$.next([
      column,
      direction
    ]);
    this.updateModulesList$.next();
  }
  
  constructor(
    private userService: UserManagementService,
    private snackBar: MatSnackBar,
    private backend: SupabaseService
  ) {
  
    this.fields.order.control.valueChanges.subscribe(data => this.onSortEvent(data.id, data.name.includes('↑') ? 'asc' : 'desc'));
  
    this.updateModulesList$
        .pipe(
          withLatestFrom(this.serversideDataPackage$),
          switchMap(([z, [skip, take, filter, sort]]) => {
            const sortColumnName: string = sort[0] ? sort[0] : null;
            const sortDirection = sort[1];
  
            return this.backend.get.modulesMinimal(
              skip, (skip + take) - 1, filter, sortColumnName, sortDirection,
              parseInt(getCleanedValueId(this.fields.manufacturers.control))
            );
          }),
          takeUntil(this.destroyEvent$)
        )
        .subscribe(x => {
          this.serversideAdditionalData.itemsCount$.next(x.count);
          this.modulesList$.next(x.data);
  
          this.dirty = true;
        });
  
    this.fields.search.control.valueChanges.pipe(
      debounceTime(500),
      takeUntil(this.destroyEvent$)
    )
        .subscribe(x => {
          this.paginatorToFistPage$.next();
          this.onFilterEvent(x);
        });
  
    this.fields.manufacturers.control.valueChanges.pipe(takeUntil(this.destroyEvent$))
        .subscribe(x => {
          this.updateModulesList$.next();
        });
  }
  
  ngOnDestroy(): void {
    this.destroyEvent$.next();
    this.destroyEvent$.complete();
    
  }
}
