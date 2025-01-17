import {
  Injectable,
  OnDestroy
} from '@angular/core';
import {
  FormControl,
  UntypedFormControl
} from '@angular/forms';
import { PageEvent } from "@angular/material/paginator";
import { MatSnackBar } from "@angular/material/snack-bar";
import {
  BehaviorSubject,
  combineLatest,
  Observable,
  of,
  Subject
} from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  startWith,
  switchMap,
  takeUntil,
  withLatestFrom
} from 'rxjs/operators';
import { PatchMinimal } from '../../models/patch';
import { FormTypes } from '../../shared-interproject/components/@smart/mat-form-entity/form-element-models';
import { UserManagementService } from '../backbone/login/user-management.service';
import { SupabaseService } from '../backend/supabase.service';


export type PatchList = PatchMinimal[] | null;

@Injectable()
export class PatchBrowserDataService implements OnDestroy {
  patchesList$ = new BehaviorSubject<PatchList>(null);
  updatePatchesList$ = new Subject<void>();
  
  ////
  serversideTableRequestData = {
    skip$:   new BehaviorSubject<number>(0),
    take$: new BehaviorSubject<number>(20),
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
  
  fields: {
    search: {
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
      options$: Observable<{
        name: string;
        id: string
      }[]>
    }
  };
  
  paginatorToFistPage$ = new Subject<void>();
  protected destroyEvent$ = new Subject<void>();
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
    this.updatePatchesList$.next();
  }
  
  onFilterEvent(userText: string) {
    this.serversideTableRequestData.skip$.next(0);
    this.serversideTableRequestData.filter$.next(userText);
    this.updatePatchesList$.next();
  }
  
  onSortEvent(column: string, direction = 'asc'): void {
    this.serversideTableRequestData.sort$.next([
      column,
      direction
    ]);
    this.updatePatchesList$.next();
  }
  
  constructor(
    private userService: UserManagementService,
    private snackBar: MatSnackBar,
    private backend: SupabaseService
  ) {
    
    this.fields = {
      search: {
        label: 'Search patch...',
        code: 'search',
        flex: '6rem',
        control: new UntypedFormControl(''),
        type: FormTypes.TEXT
        
      },
      order: {
        label: 'Order by',
        code: 'order',
        flex: '6rem',
        control: new UntypedFormControl({
          id: 'updated',
          name: 'Updated'
        }),
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
          }
        ])
          .pipe(
            startWith([]))
        
      }
    }
  
    this.fields.order.control.valueChanges.subscribe(data => this.onSortEvent(data.id, data.name.includes('↑') ? 'asc' : 'desc'));
  
    this.updatePatchesList$
        .pipe(
          withLatestFrom(this.serversideDataPackage$),
          switchMap(([z, [skip, take, filter, sort]]) => {
            const sortColumnName: string = sort[0] ? sort[0] : null;
            const sortDirection = sort[1];
            
            return this.backend.GET.patches(skip, (skip + take) - 1, filter, sortColumnName, sortDirection);
          }),
          takeUntil(this.destroyEvent$)
        )
        .subscribe(x => {
          this.serversideAdditionalData.itemsCount$.next(x.count);
          this.patchesList$.next(x.data);
  
          this.dirty = true;
        });
  
    this.fields.search.control.valueChanges.pipe(
      debounceTime(750),
      takeUntil(this.destroyEvent$)
    )
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