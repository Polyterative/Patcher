import { ChangeDetectionStrategy, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { filter, map, take, takeUntil } from 'rxjs/operators';
import { SeoAndUtilsService } from 'src/app/features/backbone/seo-and-utils.service';
import { ModuleCollectionDetail } from 'src/app/models/module-collection';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';
import { ModuleCollectionsDataService } from '../module-collections-data.service';

@Component({
  selector: 'app-module-collections-owned-detail',
  templateUrl: './module-collections-owned-detail.component.html',
  styleUrls: ['./module-collections-owned-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ModuleCollectionsDataService],
  standalone: false
})
export class ModuleCollectionsOwnedDetailComponent extends SubManager implements OnInit, OnDestroy {
  private collectionId: number | null = null;

  constructor(
    public readonly dataService: ModuleCollectionsDataService,
    private readonly route: ActivatedRoute,
    private readonly seoAndUtilsService: SeoAndUtilsService
  ) {
    super();
  }

  ngOnInit(): void {
    this.route.params
      .pipe(
        map(params => Number(params['collectionId'])),
        filter(collectionId => Number.isInteger(collectionId) && collectionId > 0),
        take(1)
      )
      .subscribe(collectionId => {
        this.collectionId = collectionId;
        this.dataService.updateCurrentUserCollectionById$.next(collectionId);
      });

    this.dataService.currentUserCollection$
      .pipe(
        filter((collection): collection is ModuleCollectionDetail => !!collection),
        takeUntil(this.destroy$)
      )
      .subscribe(collection => {
        this.seoAndUtilsService.updateSeo({
          title: collection.name,
          description: collection.description ?? 'Manage your module collection.',
          noindex: true
        }, collection.name);
      });
  }

  reloadCollection(): void {
    if (this.collectionId) {
      this.dataService.updateCurrentUserCollectionById$.next(this.collectionId);
    }
  }

  onCollectionUpdated(collection: ModuleCollectionDetail): void {
    this.dataService.localCurrentUserCollectionUpdated$.next(collection);
  }

  override ngOnDestroy(): void {
    this.dataService.clearCurrentUserCollection();
    super.ngOnDestroy();
  }
}
