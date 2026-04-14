import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  combineLatest,
  map,
  Observable,
} from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { defaultPatchMinimalViewConfig } from 'src/app/components/patch-parts/patch-minimal/patch-minimal.component';
import {
  defaultRackMinimalViewConfig,
  RackMinimalViewConfig,
} from 'src/app/components/rack-parts/rack-minimal/rack-minimal.component';
import { SeoAndUtilsService } from 'src/app/features/backbone/seo-and-utils.service';
import { UserManagementService } from 'src/app/features/backbone/login/user-management.service';
import { UrlCreatorService } from 'src/app/features/backend/url-creator.service';
import { PublicProfileDataService } from 'src/app/features/routes/public-profile/public-profile-data.service';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';

@Component({
  selector: 'app-public-profile',
  templateUrl: './public-profile.component.html',
  styleUrls: ['./public-profile.component.scss'],
  providers: [PublicProfileDataService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class PublicProfileComponent extends SubManager {
  readonly patchViewConfig = {
    ...defaultPatchMinimalViewConfig,
    hideButtons: true,
  };

  readonly rackViewConfig: RackMinimalViewConfig = {
    ...defaultRackMinimalViewConfig,
    hideButtons: true,
    containImage: true,
  };

  readonly publicStats$: Observable<{name: string; value: number; icon: string}[]>;
  readonly isOwnProfile$: Observable<boolean>;

  constructor(
    public readonly dataService: PublicProfileDataService,
    public readonly userService: UserManagementService,
    private readonly route: ActivatedRoute,
    private readonly seoAndUtilsService: SeoAndUtilsService,
    private readonly urlCreatorService: UrlCreatorService,
  ) {
    super();

    this.publicStats$ = combineLatest([
      this.dataService.racksCount$,
      this.dataService.patchesCount$,
    ]).pipe(
      map(([racks, patches]) => [
        {name: 'Racks', value: racks, icon: 'dashboard'},
        {name: 'Patches', value: patches, icon: 'cable'},
      ]),
    );

    this.isOwnProfile$ = combineLatest([
      this.dataService.profile$,
      this.userService.loggedUserFullProfile$,
    ]).pipe(
      map(([profile, loggedUser]) => !!profile && !!loggedUser && profile.id === loggedUser.id),
    );

    this.route.params
      .pipe(takeUntil(this.destroy$))
      .subscribe((params) => {
        const username = `${ params?.['username'] ?? '' }`.trim();
        this.dataService.loadProfile$.next(username);
      });

    combineLatest([
      this.dataService.routeState$,
      this.dataService.profile$,
      this.dataService.racksCount$,
      this.dataService.patchesCount$,
    ]).pipe(
      takeUntil(this.destroy$),
    ).subscribe(([state, profile, racksCount, patchesCount]) => {
      if (state === 'ready' && profile) {
        const descriptionParts = [
          `${ profile.username }'s public Eurorack profile on patcher.xyz.`,
          racksCount > 0 ? `${ racksCount } public rack${ racksCount === 1 ? '' : 's' }.` : null,
          patchesCount > 0 ? `${ patchesCount } public patch${ patchesCount === 1 ? '' : 'es' }.` : null,
        ].filter(Boolean);

        this.seoAndUtilsService.updateSeo(
          {
            title: `${ profile.username } - Public profile`,
            description: descriptionParts.join(' '),
            url: `https://patcher.xyz/u/${ profile.username }`,
            author: profile.username,
          },
          `${ profile.username } — Public profile`,
        );
        return;
      }

      if (state === 'private') {
        this.seoAndUtilsService.updateSeo(
          {
            title: 'Private profile',
            description: 'This user has not made their public profile visible.',
            noindex: true,
          },
          'Private profile',
        );
        return;
      }

      if (state === 'incomplete') {
        this.seoAndUtilsService.updateSeo(
          {
            title: 'Profile unavailable',
            description: 'This profile is not publicly available yet.',
            noindex: true,
          },
          'Profile unavailable',
        );
        return;
      }

      if (state === 'not-found' || state === 'error') {
        this.seoAndUtilsService.updateSeo(
          {
            title: 'Profile not found',
            description: 'The requested public profile could not be found.',
            noindex: true,
          },
          'Profile not found',
        );
        return;
      }

      this.seoAndUtilsService.updateSeo(
        {
          title: 'Public profile',
          description: 'Browse a public Eurorack profile on patcher.xyz.',
          noindex: true,
        },
        'Public profile',
      );
    });
  }

  copyProfileLink(username: string): void {
    this.urlCreatorService.copyLinkToClipboard(this.profilePath(username));
  }

  profilePath(username: string): string {
    return `/u/${ username }`;
  }

  makeProfilePublic(username: string): void {
    this.userService.updateProfileVisibility$(true).subscribe(() => {
      this.dataService.loadProfile$.next(username);
    });
  }
}
