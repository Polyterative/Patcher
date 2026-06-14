import {
  DestroyRef,
  Injectable
} from '@angular/core';
import {
  BehaviorSubject,
  ReplaySubject,
  Subject
} from 'rxjs';
import {
  switchMap,
  tap
} from 'rxjs/operators';
import { AnalyticsService } from 'src/app/features/backbone/analytics-integration/analytics.service';
import { SupabaseService } from '../backend/supabase.service';
import { ModuleCollectionDetail } from 'src/app/models/module-collection';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';

@Injectable()
export class ModuleCollectionsDetailDataService extends SubManager {
  private readonly _collection$ = new BehaviorSubject<ModuleCollectionDetail | undefined>(undefined);
  readonly collection$ = this._collection$.asObservable();
  private readonly _unavailableMessage$ = new BehaviorSubject<string | null>(null);
  readonly unavailableMessage$ = this._unavailableMessage$.asObservable();

  readonly load$ = new ReplaySubject<string>(1);
  readonly loadOwnedById$ = new ReplaySubject<number>(1);
  readonly localCollectionUpdated$ = new Subject<ModuleCollectionDetail>();

  constructor(
    private backend: SupabaseService,
    private analytics: AnalyticsService,
    destroyRef?: DestroyRef
  ) {
    super(destroyRef);

    this.load$.pipe(
      tap(() => {
        this._collection$.next(undefined);
        this._unavailableMessage$.next(null);
      }),
      switchMap(publicId => this.backend.GET.publicModuleCollectionByPublicId(publicId)),
      this.takeUntilDestroyed()
    ).subscribe(collection => {
      this._collection$.next(collection);
      if (!collection) {
        this._unavailableMessage$.next('This collection is not publicly available.');
        return;
      }
      this.analytics.capture('module_collection.viewed', {
        collection_id: collection.id,
        source: 'public'
      });
    });

    this.loadOwnedById$.pipe(
      tap(() => {
        this._collection$.next(undefined);
        this._unavailableMessage$.next(null);
      }),
      switchMap(collectionId => this.backend.GET.currentUserModuleCollectionById(collectionId)),
      this.takeUntilDestroyed()
    ).subscribe(collection => {
      this._collection$.next(collection);
      if (!collection) {
        this._unavailableMessage$.next('This collection could not be loaded.');
      }
    });

    this.localCollectionUpdated$
      .pipe(this.takeUntilDestroyed())
      .subscribe(collection => this._collection$.next(collection));
  }

  clearCollection(): void {
    this._collection$.next(undefined);
  }
}
