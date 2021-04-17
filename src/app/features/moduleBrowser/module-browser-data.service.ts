import {
  Injectable,
  OnDestroy
}                                from '@angular/core';
import {
  FormControl,
  Validators
}                                from '@angular/forms';
import { PageEvent }             from '@angular/material/paginator';
import { MatSnackBar }           from '@angular/material/snack-bar';
import {
  BehaviorSubject,
  combineLatest,
  ReplaySubject,
  Subject
}                                from 'rxjs';
import { of }                    from 'rxjs/internal/observable/of';
import {
  distinctUntilChanged,
  startWith,
  switchMap,
  takeUntil,
  withLatestFrom
}                                from 'rxjs/operators';
import {
  DbModule,
  MinimalModule
}                                from '../../models/models';
import { FormTypes }             from '../../shared-interproject/components/@smart/mat-form-entity/form-element-models';
import { SharedConstants }       from '../../shared-interproject/SharedConstants';
import { UserManagementService } from '../backbone/login/user-management.service';
import { SupabaseService }       from '../backend/supabase.service';

@Injectable()
export class ModuleBrowserDataService implements OnDestroy {
  modulesList$ = new BehaviorSubject<MinimalModule[]>([]);
  updateModulesList$ = new Subject();
  addModuleToCollection$ = new Subject<number>();
  moduleEditingPanelOpenState$ = new BehaviorSubject<boolean>(false);
  singleModuleData$ = new BehaviorSubject<DbModule | undefined>(undefined);
  updateSingleModuleData$ = new ReplaySubject<number>();
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
      control: new FormControl('', Validators.compose([
        Validators.required
      ])),
      type:    FormTypes.TEXT
    
    },
    order:  {
      label:    'order',
      code:     'order',
      flex:     '6rem',
      control:  new FormControl({
        id:   'name',
        name: 'Name'
      }, Validators.compose([
        Validators.required
      ])),
      type:     FormTypes.SELECT,
      options$: of([
        {
          id:   'name',
          name: 'Name'
        },
        {
          id:   'hp',
          name: 'HP'
        },
        {
          id:   'manufacturerId',
          name: 'Manufacturer'
        },
        {
          id:   'created',
          name: 'Created'
        },
        {
          id:   'updated',
          name: 'Updated'
        }
      ])
                  .pipe(
                    startWith([]))
  
    }
  };
  
  paginatorToFistPage$ = new Subject();
  protected destroyEvent$: Subject<void> = new Subject();
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
    public backend: SupabaseService
  ) {
  
    this.updateSingleModuleData$
        .pipe(switchMap(x => this.backend.get.moduleWithId(x)))
        .subscribe(x => this.singleModuleData$.next(x.data));
  
    this.fields.order.control.valueChanges.subscribe(data => this.onSortEvent(data.id, 'asc'));
  
    this.serversideDataPackage$
        .pipe(
          // skip(1),
          distinctUntilChanged(),
          switchMap(([a, b, c]) => this.backend.get.modulesCount()),
          distinctUntilChanged()
        )
        .subscribe(x => this.serversideAdditionalData.itemsCount$.next(x));
  
    this.updateModulesList$
        .pipe(
          withLatestFrom(this.serversideDataPackage$),
          switchMap(([z, [skip, take, filter, sort]]) => {
            const sortColumnName: string = sort[0] ? sort[0] : null, sortDirection = sort[1];
            return this.backend.get.modulesMinimal(skip, skip + take, filter, sortColumnName)
                       .pipe(SharedConstants.errorHandlerOperation(snackBar));
          }),
          takeUntil(this.destroyEvent$)
        )
        .subscribe(x => this.modulesList$.next(x.data));
  
    this.fields.search.control.valueChanges.pipe(takeUntil(this.destroyEvent$))
        .subscribe(x => {
          this.paginatorToFistPage$.next();
          this.onFilterEvent(x);
          // this.updateData$.next();
        });
  
  
    this.addModuleToCollection$
        .pipe(
          switchMap(x => this.backend.add.userModule(x)),
          withLatestFrom(this.updateSingleModuleData$)
        )
        .subscribe(([a, b]) => {
          snackBar.open('Added', undefined, {duration: 1000});
          this.updateSingleModuleData$.next(b);
        });
  }
  
  ngOnDestroy(): void {
    this.destroyEvent$.next();
    this.destroyEvent$.complete();
    
  }
}
