import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  Input,
  OnDestroy,
  OnInit
} from '@angular/core';
import {
  combineLatest,
  Observable,
  of
} from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  filter,
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
import { UrlCreatorService } from 'src/app/features/backend/url-creator.service';
import { CurrentUserContributorStats } from 'src/app/features/backend/supabase-queries';
import { COOL_REACTIONS_ENABLED } from 'src/app/components/shared-atoms/cool-button/cool-button-feature.token';
import { environment } from 'src/environments/environment';
import { MinimalModule } from 'src/app/models/module';
import { Rack } from 'src/app/models/rack';
import { Patch } from 'src/app/models/patch';

type CoreWorkspaceData = [
  MinimalModule[] | undefined,
  Rack[] | undefined,
  Patch[] | undefined
];

type LoadedCoreWorkspaceData = [
  MinimalModule[],
  Rack[],
  Patch[]
];

function isCoreWorkspaceDataLoaded(data: CoreWorkspaceData): data is LoadedCoreWorkspaceData {
  return data[0] !== undefined
    && data[1] !== undefined
    && data[2] !== undefined;
}


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

  readonly marketplaceEnabled = environment.features.marketplaceEnabled;
  readonly emptyWorkspaceDescription =
    'Your private workspace. Nothing here is public until you choose to share it.';
  
  miscStats$ = of([]);
  readonly isEmptyWorkspace$: Observable<boolean>;
  contributorStats$: Observable<{name: string; value: number; icon: string}[] | null> = of(null);
  readonly contributorStatsEmptyMessage =
    'Submit a module, leave a useful comment, or flag an issue to start building your contribution profile.';
  
  constructor(
    public userService: UserManagementService,
    public backend: SupabaseService,
    public dataService: UserAreaDataService,
    readonly seoAndUtilsService: SeoAndUtilsService,
    public urlCreatorService: UrlCreatorService,
    @Inject(COOL_REACTIONS_ENABLED) public readonly coolReactionsEnabled: boolean
  ) {
    super();
    this.isEmptyWorkspace$ = combineLatest([
      this.dataService.modulesData$,
      this.dataService.rackData$,
      this.dataService.patchesData$
    ]).pipe(
      filter(isCoreWorkspaceDataLoaded),
      map(([modules, racks, patches]) =>
        modules.length === 0
        && racks.length === 0
        && patches.length === 0
      ),
      distinctUntilChanged()
    );

    this.miscStats$ = combineLatest([
      this.dataService.modulesData$,
      this.dataService.rackData$,
      this.dataService.patchesData$,
      this.dataService.commentsData$,
      this.dataService.manualsData$
    ]).pipe(
      map(([modules, racks, patches, comments, manuals]) => [
        {name: 'Modules', value: modules?.length ?? 0, icon: 'view_module'},
        {name: 'Racks', value: racks?.length ?? 0, icon: 'view_stream'},
        {name: 'Patches', value: patches?.length ?? 0, icon: 'settings_input_composite'},
        {name: 'Comments', value: comments?.length ?? 0, icon: 'comment'},
        {name: 'Manual links', value: manuals?.length ?? 0, icon: 'book'}
      ])
    );

    this.contributorStats$ = this.dataService.contributorStats$.pipe(
      map((stats: CurrentUserContributorStats | undefined) => stats
        ? [
          {name: 'Modules submitted', value: stats.modulesSubmitted, icon: 'upload'},
          {name: 'Approved modules', value: stats.approvedModules, icon: 'check_circle'},
          {name: 'Pending review', value: stats.pendingModules, icon: 'schedule'},
          {name: 'Comments posted', value: stats.commentsPosted, icon: 'comment'},
          {name: 'Issue reports', value: stats.moduleFlagsSubmitted, icon: 'bug_report'}
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
    this.dataService.updateModulesData$.next();
    this.dataService.updateRackData$.next(undefined);
    this.dataService.updatePatchesData$.next();
    this.dataService.updateManualsData$.next();
    this.dataService.updateCommentsData$.next();
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

  profileVisibilityDescription(isPublic: boolean): string {
    return isPublic
      ? 'Public profile is visible to everyone.'
      : 'Public profile is hidden from visitors.';
  }

  toggleProfileVisibility(isPublic: boolean): void {
    this.userService.updateProfileVisibility$(isPublic).subscribe();
  }

}
