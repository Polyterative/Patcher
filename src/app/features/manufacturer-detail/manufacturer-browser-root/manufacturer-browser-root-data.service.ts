import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  BehaviorSubject,
  EMPTY,
  Subject
} from 'rxjs';
import {
  catchError,
  map,
  switchMap,
  takeUntil,
  tap
} from 'rxjs/operators';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';
import { ManufacturerDetail } from '../manufacturer-detail-data.service';


@Injectable()
export class ManufacturerBrowserRootDataService extends SubManager {
  // ACTIONS
  updateList$ = new Subject<void>();
  
  // STATE
  private _manufacturers$ = new BehaviorSubject<ManufacturerDetail[] | null>(null);
  private _isLoading$ = new BehaviorSubject<boolean>(false);
  
  // PUBLIC
  readonly manufacturers$ = this._manufacturers$.asObservable();
  readonly isLoading$ = this._isLoading$.asObservable();
  
  constructor(
    private backend: SupabaseService,
    private snackBar: MatSnackBar
  ) {
    super();
    this.initializeLoadHandler();
  }
  
  private initializeLoadHandler(): void {
    this.updateList$.pipe(
      tap(() => {
        this._isLoading$.next(true);
        this._manufacturers$.next(null);
      }),
      switchMap(() => this.backend.GET.manufacturers(0, 999, 'id,name,logo,websiteURL,adminUser').pipe(
        map(result => (result.data ?? []) as ManufacturerDetail[]),
        tap(manufacturers => {
          this._manufacturers$.next(manufacturers);
          this._isLoading$.next(false);
        }),
        catchError(err => {
          console.error('ManufacturerBrowserRootDataService load error:', err);
          SharedConstants.errorCustom(this.snackBar, 'Failed to load manufacturers');
          this._isLoading$.next(false);
          return EMPTY;
        })
      )),
      takeUntil(this.destroy$)
    ).subscribe();
  }
}