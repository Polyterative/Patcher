import { ChangeDetectionStrategy, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { filter, map, take } from 'rxjs/operators';
import {
  BehaviorSubject,
  Observable,
  of
} from 'rxjs';
import { SeoAndUtilsService } from 'src/app/features/backbone/seo-and-utils.service';
import { SeoSocialShareData } from 'src/app/models/seo.model';
import { ModuleCollectionsDetailDataService } from '../module-collections-detail-data.service';
import { ModuleCollectionsDataService } from '../module-collections-data.service';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';
import { ModuleCollectionDetail } from 'src/app/models/module-collection';
import { ModuleMinimalViewConfig, defaultModuleMinimalViewConfig } from 'src/app/components/module-parts/module-minimal/module-minimal.component';
import { MinimalModule } from 'src/app/models/module';
import { getPublicStorageUrl } from 'src/app/shared-interproject/utils/public-storage-url';
import { UserManagementService } from 'src/app/features/backbone/login/user-management.service';
import { PublicUser } from 'src/app/models/user';
import type { LabelValueData } from 'src/app/components/rack-parts/rack-editor/lib-showcase-grid/lib-showcase-grid.component';

const MODULE_COLLECTIONS_STORAGE_BUCKET = 'module-collections';

@Component({
  selector: 'app-module-collections-browser-detail',
  templateUrl: './module-collections-browser-detail.component.html',
  styleUrls: ['./module-collections-browser-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ModuleCollectionsDetailDataService, ModuleCollectionsDataService],
  standalone: false
})
export class ModuleCollectionsBrowserDetailComponent extends SubManager implements OnInit, OnDestroy {
  readonly collectionEditingPanelOpenState$ = new BehaviorSubject<boolean>(false);
  readonly collectionEditorHasPendingChanges$ = of(false);
  readonly collectionModules$: Observable<MinimalModule[]>;

  readonly viewConfig: ModuleMinimalViewConfig = {
    ...defaultModuleMinimalViewConfig,
    hideButtons: true,
    hideDates: true,
    hideTags: false,
    tagsReadOnly: true
  };

  constructor(
    public dataService: ModuleCollectionsDetailDataService,
    public userManagementService: UserManagementService,
    private route: ActivatedRoute,
    private seoAndUtilsService: SeoAndUtilsService
  ) {
    super();
    this.collectionModules$ = this.dataService.collection$.pipe(
      map(collection => collection?.entries.map(entry => entry.module) ?? [])
    );
  }

  ngOnInit(): void {
    this.route.params
      .pipe(
        map(params => typeof params['publicId'] === 'string' ? params['publicId'] : ''),
        filter(publicId => !!publicId),
        take(1)
      )
      .subscribe(publicId => this.dataService.load$.next(publicId));

    this.dataService.collection$
      .pipe(
        filter((collection): collection is ModuleCollectionDetail => !!collection),
        this.takeUntilDestroyed()
      )
      .subscribe(collection => {
        this.seoAndUtilsService.updateSeo(
          this.buildCollectionSeoData(collection),
          `${ collection.name } — Module collection`
        );
      });
  }

  override ngOnDestroy(): void {
    this.dataService.clearCollection();
    this.collectionEditingPanelOpenState$.next(false);
    super.ngOnDestroy();
  }

  coverImageSrc(image: string | null | undefined): string | null {
    return getPublicStorageUrl(MODULE_COLLECTIONS_STORAGE_BUCKET, image);
  }

  isCollectionOwner(collection: ModuleCollectionDetail | undefined, user: PublicUser | null | undefined): boolean {
    return !!collection && !!user && collection.authorid === user.id;
  }

  collectionStats(collection: ModuleCollectionDetail): LabelValueData[] {
    const modules = collection.entries.map(entry => entry.module);
    const moduleCount = modules.length;
    const totalHp = modules.reduce((sum, module) => sum + (module.hp ?? 0), 0);
    const manufacturerCount = new Set(
      modules
        .map(module => module.manufacturer?.id)
        .filter((id): id is number => typeof id === 'number')
    ).size;
    const standardCount = new Set(
      modules
        .map(module => module.standard?.name)
        .filter((name): name is string => !!name)
    ).size;

    return [
      { label: 'Author', value: collection.author?.username || 'unknown', icon: 'person', size: 'auto' },
      { label: 'Modules', value: moduleCount.toString(), icon: 'view_module', size: 'auto' },
      { label: 'Total width', value: `${ totalHp } HP`, icon: 'straighten', size: 'auto' },
      { label: 'Average width', value: moduleCount > 0 ? `${ Math.round((totalHp / moduleCount) * 10) / 10 } HP` : '0 HP', icon: 'view_week', size: 'auto' },
      { label: 'Manufacturers', value: manufacturerCount.toString(), icon: 'precision_manufacturing', size: 'auto' },
      { label: 'Formats', value: standardCount.toString(), icon: 'view_quilt', size: 'auto' },
      { label: 'Created', value: this.formatCollectionDate(collection.created), icon: 'event', size: 'auto' },
      { label: 'Updated', value: this.formatCollectionDate(collection.updated), icon: 'update', size: 'auto' }
    ];
  }

  toggleEditor(): void {
    this.collectionEditingPanelOpenState$.next(!this.collectionEditingPanelOpenState$.value);
  }

  onCollectionSaved(collection: ModuleCollectionDetail): void {
    this.collectionEditingPanelOpenState$.next(false);
    this.dataService.loadOwnedById$.next(collection.id);
  }

  onCollectionUpdated(collection: ModuleCollectionDetail): void {
    this.dataService.localCollectionUpdated$.next(collection);
  }

  private formatCollectionDate(value: string | null | undefined): string {
    if (!value) {
      return 'Unknown';
    }

    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(value));
  }

  private buildCollectionSeoData(collection: ModuleCollectionDetail): SeoSocialShareData {
    const author = collection.author?.username || 'unknown';
    const moduleCount = collection.module_count ?? collection.entries.length;
    const moduleNames = collection.entries
      .map(entry => entry.module?.name)
      .filter((name): name is string => !!name);
    const manufacturerNames = collection.entries
      .map(entry => entry.module?.manufacturer?.name)
      .filter((name): name is string => !!name);
    const descriptionParts = [
      collection.description?.trim(),
      `Curated module collection by ${ author } with ${ moduleCount } module${ moduleCount === 1 ? '' : 's' }.`,
      moduleNames.length > 0
        ? `Includes ${ moduleNames.join(', ') }.`
        : null
    ].filter((part): part is string => !!part);
    const keywordParts = [
      collection.name,
      author,
      ...moduleNames,
      ...manufacturerNames,
      'module collection',
      'eurorack',
      'modular'
    ];
    const uniqueKeywords = [...new Set(keywordParts.map(keyword => keyword.trim()).filter(Boolean))];
    const image = this.coverImageSrc(collection.image) ?? undefined;

    return {
      title: `${ collection.name } - Module collection`,
      description: descriptionParts.join(' '),
      url: `https://patcher.xyz/collections/${ collection.public_id }`,
      author,
      keywords: uniqueKeywords.join(', '),
      published: collection.created,
      modified: collection.updated,
      ...(image ? {image} : {})
    };
  }
}
