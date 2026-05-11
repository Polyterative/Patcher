import { BreakpointObserver } from '@angular/cdk/layout';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  distinctUntilChanged,
  map,
  shareReplay
} from 'rxjs/operators';


export const APP_SHELL_WIDE_QUERY = '(min-width: 31.25rem)';

@Injectable({providedIn: 'root'})
export class AppShellLayoutService {
  public readonly wideShell$: Observable<boolean>;

  constructor(private readonly breakpointObserver: BreakpointObserver) {
    this.wideShell$ = this.breakpointObserver.observe(APP_SHELL_WIDE_QUERY).pipe(
      map((state) => state.matches),
      distinctUntilChanged(),
      shareReplay({bufferSize: 1, refCount: true})
    );
  }
}
