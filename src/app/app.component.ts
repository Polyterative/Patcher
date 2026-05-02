import {
  ChangeDetectionStrategy,
  Component
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


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class AppComponent {
  readonly routeLoading$;

  constructor(private router: Router) {
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
