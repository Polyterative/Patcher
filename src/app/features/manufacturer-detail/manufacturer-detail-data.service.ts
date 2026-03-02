import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  BehaviorSubject,
  EMPTY,
  ReplaySubject
} from 'rxjs';
import {
  catchError,
  switchMap,
  takeUntil,
  tap
} from 'rxjs/operators';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';
import { ModuleList } from 'src/app/features/module-browser/module-browser-data.service';


export interface ManufacturerDetail {
  id: number;
  name: string | null;
  logo: string | null;
  websiteURL: string | null;
  adminUser: string | null;
  moduleCount?: number;
  latestModuleUpdatedAt?: string | null;
  changedModulesLast30Days?: number;
}

@Injectable()
export class ManufacturerDetailDataService extends SubManager {
  // ACTIONS
  readonly updateManufacturer$ = new ReplaySubject<number>(1);
  
  // STATE
  private _manufacturerData$ = new BehaviorSubject<ManufacturerDetail | null>(null);
  private _modulesData$ = new BehaviorSubject<ModuleList>(null);
  private _isLoading$ = new BehaviorSubject<boolean>(false);
  
  // PUBLIC
  readonly manufacturerData$ = this._manufacturerData$.asObservable();
  readonly modulesData$ = this._modulesData$.asObservable();
  readonly isLoading$ = this._isLoading$.asObservable();
  
  constructor(
    private readonly backend: SupabaseService,
    private readonly snackBar: MatSnackBar
  ) {
    super();
    this.initializeLoadHandler();
  }
  
  private initializeLoadHandler(): void {
    this.updateManufacturer$.pipe(
      tap(() => {
        this._isLoading$.next(true);
        this._manufacturerData$.next(null);
        this._modulesData$.next(null);
      }),
      switchMap(id => this.backend.get.manufacturerWithId(id).pipe(
        tap(result => {
          this._manufacturerData$.next(result.data as ManufacturerDetail);
        }),
        switchMap(() => this.backend.get.modulesBySameManufacturer(id, 0, 200)),
        tap(modules => {
          this._modulesData$.next(modules ?? []);
          this._isLoading$.next(false);
        }),
        catchError(err => {
          console.error('ManufacturerDetailDataService load error:', err);
          SharedConstants.errorCustom(this.snackBar, 'Failed to load manufacturer data');
          this._isLoading$.next(false);
          return EMPTY;
        })
      )),
      takeUntil(this.destroy$)
    ).subscribe();
  }
}
