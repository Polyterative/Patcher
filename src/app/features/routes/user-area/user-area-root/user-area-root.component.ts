import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnDestroy,
  OnInit
} from '@angular/core';
import {
  combineLatest,
  of
} from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  map,
  startWith
} from 'rxjs/operators';
import {
  defaultModuleMinimalViewConfig,
  ModuleMinimalViewConfig
} from 'src/app/components/module-parts/module-minimal/module-minimal.component';
import { UserManagementService } from 'src/app/features/backbone/login/user-management.service';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { SeoAndUtilsService } from 'src/app/features/backbone/seo-and-utils.service';
import { UserAreaDataService } from 'src/app/features/routes/user-area/user-area-data.service';
import { UntypedFormControl } from '@angular/forms';
import { FormTypes } from 'src/app/shared-interproject/components/@smart/mat-form-entity/form-element-models';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';
import { AppStateService } from 'src/app/shared-interproject/app-state.service';
import { UrlCreatorService } from 'src/app/features/backend/url-creator.service';
import { CurrentUserContributorStats } from 'src/app/features/backend/supabase-queries';


@Component({
  selector: 'app-user-area-root',
  templateUrl: './user-area-root.component.html',
  styleUrls: ['./user-area-root.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class UserAreaRootComponent extends SubManager implements OnInit, OnDestroy {
  readonly formTypes = FormTypes;
  readonly globalSearchControl = new UntypedFormControl('');
  readonly globalSearchQuery$ = this.globalSearchControl.valueChanges.pipe(
    startWith(''),
    debounceTime(120),
    map(value => value ?? ''),
    map(value => `${ value }`),
    distinctUntilChanged()
  );

  @Input() viewConfig: ModuleMinimalViewConfig = {
    ...defaultModuleMinimalViewConfig,
    hideLabels:       false,
    hideManufacturer: false,
    hideDescription:  false,
    hideButtons:      true,
    hideHP:           false,
    hideDates:        true,
    hideTags:         true
  };
  
  @Input() ignoreSeo = false;
  
  miscStats$ = of([]);
  contributorStats$ = of<any[] | null>(null);
  readonly contributorStatsEmptyMessage =
    'No contributor activity yet. Submit a module, leave a useful comment, or flag an issue to start building your contribution profile.';
  
  constructor(
    public userService: UserManagementService,
    public backend: SupabaseService,
    public dataService: UserAreaDataService,
    readonly seoAndUtilsService: SeoAndUtilsService,
    public appState: AppStateService,
    public urlCreatorService: UrlCreatorService
  ) {
    super();
    this.miscStats$ = combineLatest([
      this.dataService.modulesData$,
      this.dataService.rackData$,
      this.dataService.patchesData$,
      this.dataService.commentsData$,
      this.dataService.manualsData$
    ]).pipe(
      map(([modules, racks, patches, comments, manuals]) => [
        {name: 'Modules', value: modules?.length ?? 0, icon: 'memory'},
        {name: 'Racks', value: racks?.length ?? 0, icon: 'dashboard'},
        {name: 'Patches', value: patches?.length ?? 0, icon: 'cable'},
        {name: 'Comments', value: comments?.length ?? 0, icon: 'chat'},
        {name: 'Manual links', value: manuals?.length ?? 0, icon: 'menu_book'}
      ])
    );

    this.contributorStats$ = this.dataService.contributorStats$.pipe(
      map((stats: CurrentUserContributorStats | undefined) => stats
        ? [
          {name: 'Modules submitted', value: stats.modulesSubmitted, icon: 'upload_file'},
          {name: 'Approved modules', value: stats.approvedModules, icon: 'check_circle'},
          {name: 'Pending review', value: stats.pendingModules, icon: 'schedule'},
          {name: 'Comments posted', value: stats.commentsPosted, icon: 'chat'},
          {name: 'Issue reports', value: stats.moduleFlagsSubmitted, icon: 'report'}
        ]
        : null
      )
    );
  }
  
  ngOnInit(): void {
    //TODO: change this when user can see other profiles
    if (!this.ignoreSeo) {
      this.seoAndUtilsService.updateSeo({
        title:       'User collection',
        description: 'Personal user collection',
        noindex:     true
      }, 'My collection');
    }
    
    this.dataService.connectDiscovery(this.globalSearchQuery$);
    this.dataService.updateContributorStats$.next();
  }

  override ngOnDestroy(): void {
    this.dataService.resetUiState();
    super.ngOnDestroy();
  }

  copyPublicProfileLink(username: string): void {
    this.urlCreatorService.copyLinkToClipboard(this.publicProfilePath(username));
  }

  publicProfilePath(username: string): string {
    return `/u/${ username }`;
  }

  toggleProfileVisibility(isPublic: boolean): void {
    this.userService.updateProfileVisibility$(isPublic).subscribe();
  }

}
