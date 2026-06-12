import {
  ChangeDetectionStrategy,
  Component,
  OnInit
} from '@angular/core';
import {
  Meta,
  Title
} from '@angular/platform-browser';
import {
  combineLatest,
  Observable
} from 'rxjs';
import { map } from 'rxjs/operators';
import { UserManagementService } from 'src/app/features/backbone/login/user-management.service';
import { EmptyStateComponent } from '../../../shared-interproject/components/@smart/empty-state/empty-state.component';
import { MatCardTitle } from '@angular/material/card';
import { MatButton } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { AsyncPipe } from '@angular/common';

@Component({
    selector: 'app-legacy-link-gone-page',
    templateUrl: './legacy-link-gone-page.component.html',
    styleUrls: ['./legacy-link-gone-page.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [EmptyStateComponent, MatCardTitle, MatButton, RouterLink, AsyncPipe]
})
export class LegacyLinkGonePageComponent implements OnInit {
  readonly profileLink$: Observable<string[]>;

  constructor(
    private readonly meta: Meta,
    private readonly title: Title,
    private readonly userService: UserManagementService
  ) {
    this.profileLink$ = combineLatest([
      this.userService.loggedUser$,
      this.userService.loggedUserFullProfile$
    ]).pipe(
      map(([user, profile]) => {
        const username = profile?.username?.trim();
        if (user && username) {
          return ['/u', username];
        }

        return user ? ['/user/area'] : ['/auth/login'];
      })
    );
  }

  ngOnInit(): void {
    this.title.setTitle('Retired Share Link | patcher.xyz');
    this.meta.updateTag({name: 'robots', content: 'noindex, nofollow'});
    this.meta.updateTag({name: 'description', content: 'This share link has been retired.'});
    this.meta.updateTag({property: 'og:title', content: 'Retired Share Link | patcher.xyz'});
    this.meta.updateTag({property: 'og:description', content: 'This share link has been retired.'});
  }
}
