import {
  Injectable,
  OnDestroy
} from '@angular/core';
import {
  FormControl,
  UntypedFormControl,
  Validators
} from '@angular/forms';
import {
  BehaviorSubject,
  merge,
  Observable,
  of,
  Subject
} from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  map,
  share,
  shareReplay,
  startWith,
  switchMap,
  takeUntil
} from 'rxjs/operators';
import { MinimalModule } from '../../models/module';
import {
  FormTypes,
  getCleanedValueId,
  isOption
} from '../../shared-interproject/components/@smart/mat-form-entity/form-element-models';
import { SupabaseService } from '../backend/supabase.service';
import { PageEvent } from "@angular/material/paginator";


export type ModuleList = MinimalModule[] | null;

const DEFAULT_HP_CONDITION = {id: '=', name: 'exactly'};
const DEFAULT_STANDARD = {id: undefined, name: 'All'};

@Injectable()
export class ModuleBrowserDataService implements OnDestroy {
  protected destroyEvent$ = new Subject<void>();
  
  modulesList$ = new BehaviorSubject<ModuleList>(null);
  updateModulesList$ = new Subject<void>();
  
  serversideTableRequestData = {
    skip$: new BehaviorSubject<number>(0),
    take$: new BehaviorSubject<number>(20),
    filter$: new BehaviorSubject<string>(''),
    sort$: new BehaviorSubject<[string, string]>(['', ''])
  };
  serversideAdditionalData = {
    itemsCount$: new BehaviorSubject<number>(0)
  };
  
  readonly orderStartingValue = {id: 'updated', name: 'Updated ↓'};
  
  fields: {
    name: {
      code: string;
      flex: string;
      control: FormControl<any>;
      label: string;
      type: FormTypes
    };
    description: {
      code: string;
      flex: string;
      control: FormControl<any>;
      label: string;
      type: FormTypes
    };
    manufacturers: {
      code: string;
      flex: string;
      control: FormControl<any>;
      label: string;
      type: FormTypes;
      options$: Observable<any>
    };
    hpCondition: {
      code: string;
      flex: string;
      control: FormControl<any>;
      label: string;
      type: FormTypes;
      options$: Observable<({
        name: string;
        id: string
      })[]>
    };
    hp: {
      code: string;
      flex: string;
      control: FormControl<any>;
      label: string;
      type: FormTypes
    };
    order: {
      code: string;
      flex: string;
      control: FormControl<any>;
      label: string;
      type: FormTypes;
      options$: Observable<({
        name: string;
        id: string
      })[]>
    },
    standard: {
      code: string;
      flex: string;
      control: FormControl<any>;
      label: string;
      type: FormTypes;
      options$: Observable<({
        name: string;
        id: number
      })[]>
    }
  }
  
  paginatorToFistPage$ = new Subject<void>();
  canReset$: Observable<boolean>;
  resetForm$: Subject<void> = new Subject<void>();
  
  onPageEvent($event: PageEvent) {
    this.serversideTableRequestData.take$.next($event.pageSize);
    this.serversideTableRequestData.skip$.next(($event.pageIndex) * $event.pageSize);
    this.updateModulesList$.next();
  }
  
  constructor(
    // private userService: UserManagementService,
    // private snackBar: MatSnackBar,
    private backend: SupabaseService
  ) {
    
    // executing this in the constructor because of new execution ordering in angular 15
    this.fields = {
      name: {
        label: 'Search module...',
        code: 'search',
        flex: '14rem',
        control: new UntypedFormControl(''),
        type: FormTypes.TEXT
      },
      description: {
        label: 'Description',
        code: 'description',
        flex: '14rem',
        control: new UntypedFormControl(''),
        type: FormTypes.TEXT
      },
      order: {
        label: 'Order by',
        code: 'order',
        flex: '10rem',
        control: new UntypedFormControl(this.orderStartingValue),
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
      },
      manufacturers: {
        label: 'Made by...',
        code: 'manufacturers',
        flex: '12rem',
        control: new UntypedFormControl(),
        type: FormTypes.AUTOCOMPLETE,
        options$: this.backend.GET.manufacturers(0, 9999, 'id,name')
          .pipe(
            map(x => x.data.map(z => ({
              id: z.id.toString(),
              name: z.name
            }))),
            startWith([]),
            takeUntil(this.destroyEvent$),
            share()
          )
        
      },
      hp: {
        label: 'HP',
        code: 'hp',
        flex: '6rem',
        control: new UntypedFormControl('',
          Validators.compose([
            Validators.min(1),
            // only integers
            Validators.pattern(/^-?\d+$/),
          ])
        ),
        type: FormTypes.NUMBER
      },
      hpCondition: {
        label: 'HP must be...',
        code: 'hpCondition',
        flex: '8rem',
        control: new UntypedFormControl(DEFAULT_HP_CONDITION),
        type: FormTypes.SELECT,
        options$: of([
          {id: '=', name: 'exactly'},
          {id: '!=', name: 'different than'},
          {id: '>', name: 'more than'},
          {id: '<', name: 'less than'},
          {id: '>=', name: 'more or exactly'},
          {id: '<=', name: 'less or exactly'},
        ])
      },
      standard: {
        label: 'Standard',
        code: 'standard',
        flex: '8rem',
        control: new UntypedFormControl(DEFAULT_STANDARD),
        type: FormTypes.SELECT,
        options$: of([
          {
            id:   undefined,
            name: 'All'
          },
          {
            id: 0,
            name: '3U Doepfer'
          },
          {
            id: 1,
            name: '1U Intellijel'
          },
          {
            id: 2,
            name: '1U Pulp Logic'
          },
        ])
      }
    };
    
    this.canReset$ = merge(
      this.fields.name.control.valueChanges,
      this.fields.description.control.valueChanges,
      this.fields.manufacturers.control.valueChanges,
      this.fields.hp.control.valueChanges,
      this.fields.hpCondition.control.valueChanges,
      this.fields.standard.control.valueChanges,
      this.fields.order.control.valueChanges
    ).pipe(
      startWith(null),
      map(() => {
        const hp = this.fields.hp.control.value;
        const hpCondition = this.fields.hpCondition.control.value;
        const standard = this.fields.standard.control.value;
        const order = this.fields.order.control.value;
        return (
          this.fields.name.control.value !== '' ||
          this.fields.description.control.value !== '' ||
          isOption(this.fields.manufacturers.control.value) ||
          (hp !== '' && hp !== null) ||
          (hpCondition && hpCondition.id !== '=') ||
          (standard && standard.id !== undefined) ||
          (order && order.id !== this.orderStartingValue.id)
        );
      }),
      distinctUntilChanged(),
      shareReplay(1)
    );
    
    // Single merged pipeline drives all filter-field side-effects.
    // debounceTime collapses the burst of setValue() calls from a reset into one fetch.
    merge(
      this.fields.name.control.valueChanges,
      this.fields.description.control.valueChanges,
      this.fields.manufacturers.control.valueChanges,
      this.fields.hp.control.valueChanges,
      this.fields.hpCondition.control.valueChanges,
      this.fields.standard.control.valueChanges,
      this.fields.order.control.valueChanges
    ).pipe(
      debounceTime(750),
      takeUntil(this.destroyEvent$)
    ).subscribe(() => {
      const orderVal = this.fields.order.control.value;
      const nameVal = this.fields.name.control.value ?? '';
      this.serversideTableRequestData.filter$.next(nameVal);
      this.serversideTableRequestData.sort$.next([
        orderVal?.id ?? '',
        orderVal?.name?.includes('↑') ? 'asc' : 'desc'
      ]);
      this.serversideTableRequestData.skip$.next(0);
      this.paginatorToFistPage$.next();
      this.updateModulesList$.next();
    });
    
    this.updateModulesList$
      .pipe(
        switchMap(() => {
          const skip = this.serversideTableRequestData.skip$.value;
          const take = this.serversideTableRequestData.take$.value;
          const filter = this.serversideTableRequestData.filter$.value;
          const [sortCol, sortDir] = this.serversideTableRequestData.sort$.value;
          const standard = this.fields.standard.control.value?.id;
          
          return this.backend.GET.modules(
            skip,
            (skip + take) - 1,
            filter,
            sortCol || null,
            sortDir,
            parseInt(getCleanedValueId(this.fields.manufacturers.control)),
            parseInt(this.fields.hp.control.value),
            this.fields.hpCondition.control.value?.id,
            standard,
            this.fields.description.control.value
          );
        }),
        takeUntil(this.destroyEvent$)
      )
      .subscribe(x => {
        this.serversideAdditionalData.itemsCount$.next(x.count);
        this.modulesList$.next(x.data);
      });
    
    this.resetForm$
      .pipe(takeUntil(this.destroyEvent$))
      .subscribe(() => {
        this.backend.cacheResetter$.next(['modules']);

        this.fields.name.control.setValue('');
        this.fields.description.control.setValue('');
        this.fields.order.control.setValue(this.orderStartingValue);
        this.fields.manufacturers.control.setValue('');
        this.fields.hp.control.setValue('');
        this.fields.hpCondition.control.setValue(DEFAULT_HP_CONDITION);
        this.fields.standard.control.setValue(DEFAULT_STANDARD);

        this.serversideTableRequestData.filter$.next('');
        this.serversideTableRequestData.sort$.next([this.orderStartingValue.id, 'desc']);
        this.serversideTableRequestData.skip$.next(0);
        this.paginatorToFistPage$.next();
        this.updateModulesList$.next();
      });
  }
  
  ngOnDestroy(): void {
    this.destroyEvent$.next();
    this.destroyEvent$.complete();
    
  }
}