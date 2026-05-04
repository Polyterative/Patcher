import {
  ChangeDetectionStrategy,
  Component
} from '@angular/core';
import {
  isPlatformBrowser
} from '@angular/common';
import {
  PLATFORM_ID,
  inject
} from '@angular/core';
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  Router
} from '@angular/router';
import {
  distinctUntilChanged,
  filter,
  map,
  startWith
} from 'rxjs/operators';
import { AppViewportService } from './shared-interproject/app-viewport.service';


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[@.disabled]': 'animationsDisabled'
  },
  standalone: false
})
export class AppComponent {
  readonly routeLoading$;
  readonly animationsDisabled: boolean;
  private readonly platformId = inject(PLATFORM_ID);

  constructor(
    private router: Router,
    private readonly appViewportService: AppViewportService
  ) {
    this.animationsDisabled = isPlatformBrowser(this.platformId)
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.appViewportService.initialize();
    this.routeLoading$ = this.router.events.pipe(
      filter((event) =>
        event instanceof NavigationStart
        || event instanceof NavigationEnd
        || event instanceof NavigationCancel
        || event instanceof NavigationError
      ),
      map((event) => event instanceof NavigationStart),
      startWith(false),
      distinctUntilChanged()
    );
  }
}
