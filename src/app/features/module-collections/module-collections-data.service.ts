import {
  DestroyRef,
  Injectable
} from '@angular/core';
import {
  BehaviorSubject,
  Observable,
  ReplaySubject,
  Subject,
  of
} from 'rxjs';
import {
  catchError,
  map,
  tap,
  switchMap,
} from 'rxjs/operators';
import { AnalyticsService } from 'src/app/features/backbone/analytics-integration/analytics.service';
import { SupabaseService } from '../backend/supabase.service';
import {
  ModuleCollectionDetail,
  ModuleCollectionPage,
  ModuleCollectionSummary
} from 'src/app/models/module-collection';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';

const USER_COLLECTIONS_PAGE_SIZE = 25;

interface UserCollectionsPageResult extends ModuleCollectionPage {
  from: number;
  failed: boolean;
}

@Injectable()
export class ModuleCollectionsDataService extends SubManager {
  private readonly _publicCollections$ = new BehaviorSubject<ModuleCollectionSummary[] | undefined>(undefined);
  readonly publicCollections$ = this._publicCollections$.asObservable();
  private readonly _currentUserCollections$ = new BehaviorSubject<ModuleCollectionSummary[] | undefined>(undefined);
  readonly currentUserCollections$ = this._currentUserCollections$.asObservable();
  private readonly _publicCollection$ = new BehaviorSubject<ModuleCollectionDetail | undefined>(undefined);
  readonly publicCollection$ = this._publicCollection$.asObservable();
  private readonly _currentUserCollection$ = new BehaviorSubject<ModuleCollectionDetail | undefined>(undefined);
  readonly currentUserCollection$ = this._currentUserCollection$.asObservable();
  private readonly _moduleCollectionsForModule$ = new BehaviorSubject<ModuleCollectionSummary[] | undefined>(undefined);
  readonly moduleCollectionsForModule$ = this._moduleCollectionsForModule$.asObservable();
  private readonly _publicCollectionUnavailableMessage$ = new BehaviorSubject<string | null>(null);
  readonly publicCollectionUnavailableMessage$ = this._publicCollectionUnavailableMessage$.asObservable();
  private readonly _currentUserCollectionUnavailableMessage$ = new BehaviorSubject<string | null>(null);
  readonly currentUserCollectionUnavailableMessage$ = this._currentUserCollectionUnavailableMessage$.asObservable();
  private readonly _currentUserCollectionsLoading$ = new BehaviorSubject<boolean>(false);
  readonly currentUserCollectionsLoading$ = this._currentUserCollectionsLoading$.asObservable();
  private readonly _currentUserCollectionsHasMore$ = new BehaviorSubject<boolean>(false);
  readonly currentUserCollectionsHasMore$ = this._currentUserCollectionsHasMore$.asObservable();
  private readonly _currentUserCollectionsRemaining$ = new BehaviorSubject<number>(0);
  readonly currentUserCollectionsRemaining$ = this._currentUserCollectionsRemaining$.asObservable();

  readonly updatePublicCollections$ = new Subject<void>();
  readonly updateCurrentUserCollections$ = new Subject<void>();
  readonly loadMoreCurrentUserCollections$ = new Subject<void>();
  readonly updatePublicCollectionByPublicId$ = new ReplaySubject<string>(1);
  readonly updateCurrentUserCollectionById$ = new ReplaySubject<number>(1);
  readonly updateModuleCollectionsForModule$ = new ReplaySubject<number>(1);
  readonly localCurrentUserCollectionUpdated$ = new Subject<ModuleCollectionDetail>();

  private readonly _userCollectionsSkip$ = new BehaviorSubject<number>(0);
  private userCollectionsVersion = 0;

  constructor(
    private backend: SupabaseService,
    private analytics: AnalyticsService,
    destroyRef?: DestroyRef
  ) {
    super(destroyRef);

    this.updatePublicCollections$
      .pipe(
        tap(() => this._publicCollections$.next(undefined)),
        switchMap(() => this.backend.GET.publicModuleCollections()),
        this.takeUntilDestroyed()
      )
      .subscribe(collections => {
        this._publicCollections$.next(collections);
        this.analytics.capture('module_collection.browser_viewed', { view: 'public' });
      });

    this.updateCurrentUserCollections$
      .pipe(
        tap(() => {
          this.userCollectionsVersion++;
          this._userCollectionsSkip$.next(0);
          this._currentUserCollections$.next(undefined);
          this._currentUserCollectionsHasMore$.next(false);
          this._currentUserCollectionsRemaining$.next(0);
          this._currentUserCollectionsLoading$.next(true);
        }),
        switchMap(() => this.fetchCurrentUserCollectionsPage(0)),
        this.takeUntilDestroyed()
      )
      .subscribe(page => {
        this.applyFirstUserCollectionsPage(page);
        this.analytics.capture('module_collection.browser_viewed', { view: 'user_area' });
      });

    this.loadMoreCurrentUserCollections$.pipe(
      tap(() => {
        this._currentUserCollectionsLoading$.next(true);
        this.analytics.capture('module_collection.user_area_load_more', {
          loaded_count: this._currentUserCollections$.getValue()?.length ?? 0,
          remaining: this._currentUserCollectionsRemaining$.getValue()
        });
      }),
      switchMap(() => {
        const nextSkip = this._userCollectionsSkip$.getValue() + USER_COLLECTIONS_PAGE_SIZE;
        const version = this.userCollectionsVersion;
        return this.fetchCurrentUserCollectionsPage(nextSkip).pipe(
          map(page => ({page, version}))
        );
      }),
      this.takeUntilDestroyed()
    ).subscribe(({page, version}) => {
      if (version !== this.userCollectionsVersion) {
        return;
      }
      this._currentUserCollectionsLoading$.next(false);
      if (!page.failed) {
        this._userCollectionsSkip$.next(page.from);
      }
      const current = this._currentUserCollections$.getValue() ?? [];
      this._currentUserCollections$.next(this.appendUniqueCollections(current, page.items));
      this._currentUserCollectionsHasMore$.next(page.remaining > 0);
      this._currentUserCollectionsRemaining$.next(page.remaining);
    });

    this.updatePublicCollectionByPublicId$
      .pipe(
        tap(() => {
          this._publicCollectionUnavailableMessage$.next(null);
          this._publicCollection$.next(undefined);
        }),
        switchMap(publicId => this.backend.GET.publicModuleCollectionByPublicId(publicId)),
        this.takeUntilDestroyed()
      )
      .subscribe(collection => {
        this._publicCollection$.next(collection);
        if (!collection) {
          this._publicCollectionUnavailableMessage$.next('This collection is not publicly available.');
          return;
        }
        this.analytics.capture('module_collection.viewed', {
          collection_id: collection.id,
          source: 'public'
        });
      });

    this.updateCurrentUserCollectionById$
      .pipe(
        tap(() => {
          this._currentUserCollectionUnavailableMessage$.next(null);
          this._currentUserCollection$.next(undefined);
        }),
        switchMap(collectionId => this.backend.GET.currentUserModuleCollectionById(collectionId)),
        this.takeUntilDestroyed()
      )
      .subscribe(collection => {
        this._currentUserCollection$.next(collection);
        if (!collection) {
          this._currentUserCollectionUnavailableMessage$.next('This collection could not be loaded.');
          return;
        }
        this.analytics.capture('module_collection.viewed', {
          collection_id: collection.id,
          source: 'user_area'
        });
      });

    this.updateModuleCollectionsForModule$
      .pipe(
        tap(() => this._moduleCollectionsForModule$.next(undefined)),
        switchMap(moduleId => this.backend.GET.moduleCollectionsForModule(moduleId)),
        this.takeUntilDestroyed()
      )
      .subscribe(collections => this._moduleCollectionsForModule$.next(collections));

    this.localCurrentUserCollectionUpdated$
      .pipe(this.takeUntilDestroyed())
      .subscribe(collection => this._currentUserCollection$.next(collection));
  }

  clearCurrentUserCollection(): void {
    this._currentUserCollection$.next(undefined);
  }

  fetchCurrentUserCollectionById(collectionId: number) {
    return this.backend.GET.currentUserModuleCollectionById(collectionId);
  }

  fetchPublicCollectionByPublicId(publicId: string) {
    return this.backend.GET.publicModuleCollectionByPublicId(publicId);
  }

  saveCollection(data: {
    id?: number;
    name: string;
    description?: string | null;
    public?: boolean;
    image?: string | null;
    moduleIds?: number[];
  }) {
    return data.id
      ? this.backend.update.moduleCollection({
        id: data.id,
        name: data.name,
        description: data.description ?? null,
        public: data.public ?? false,
        image: data.image ?? null,
        moduleIds: data.moduleIds ?? []
      }).pipe(tap(() => this.analytics.capture('module_collection.updated', {
        collection_id: data.id,
        module_count: data.moduleIds?.length ?? 0,
        public: data.public ?? false
      })))
      : this.backend.add.moduleCollection({
        name: data.name,
        description: data.description ?? null,
        public: data.public ?? false,
        image: data.image ?? null,
        moduleIds: data.moduleIds ?? []
      }).pipe(tap((collectionId) => this.analytics.capture('module_collection.created', {
        collection_id: typeof collectionId === 'number' ? collectionId : undefined,
        module_count: data.moduleIds?.length ?? 0,
        public: data.public ?? false
      })));
  }

  createCollectionShell(data: {
    name: string;
    public?: boolean;
  }) {
    return this.saveCollection({
      name: data.name,
      public: data.public ?? false,
      moduleIds: []
    }).pipe(
      map(result => {
        if (typeof result === 'number') {
          return result;
        }
        throw new Error('Created collection response did not include an id.');
      })
    );
  }

  deleteCollection(id: number) {
    return this.backend.delete.moduleCollection(id).pipe(
      tap(() => this.analytics.capture('module_collection.deleted', { collection_id: id }))
    );
  }

  private fetchCurrentUserCollectionsPage(from: number): Observable<UserCollectionsPageResult> {
    const previousItems = this._currentUserCollections$.getValue() ?? [];
    const previousRemaining = this._currentUserCollectionsRemaining$.getValue();
    return this.backend.GET.currentUserModuleCollectionsPage(from, from + USER_COLLECTIONS_PAGE_SIZE - 1).pipe(
      map(page => ({
        ...page,
        from,
        failed: false
      })),
      catchError(error => {
        console.error('[module-collections] Failed to load user collections', error);
        return of({
          items: from === 0 ? [] : previousItems,
          total: from === 0 ? 0 : previousItems.length + previousRemaining,
          remaining: from === 0 ? 0 : previousRemaining,
          from,
          failed: true
        });
      })
    );
  }

  private applyFirstUserCollectionsPage(page: UserCollectionsPageResult): void {
    this._currentUserCollectionsLoading$.next(false);
    this._currentUserCollections$.next(page.items);
    this._currentUserCollectionsHasMore$.next(page.remaining > 0);
    this._currentUserCollectionsRemaining$.next(page.remaining);
  }

  private appendUniqueCollections(
    current: ModuleCollectionSummary[],
    incoming: ModuleCollectionSummary[]
  ): ModuleCollectionSummary[] {
    const seenIds = new Set(current.map(collection => collection.id));
    const uniqueIncoming = incoming.filter(collection => {
      if (seenIds.has(collection.id)) {
        return false;
      }
      seenIds.add(collection.id);
      return true;
    });

    return [...current, ...uniqueIncoming];
  }
}
