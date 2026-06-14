import { Injectable } from '@angular/core';
import {
  BehaviorSubject,
  ReplaySubject,
  Subject
} from 'rxjs';
import {
  map,
  tap,
  switchMap,
  takeUntil,
} from 'rxjs/operators';
import { AnalyticsService } from 'src/app/features/backbone/analytics-integration/analytics.service';
import { SupabaseService } from '../backend/supabase.service';
import {
  ModuleCollectionDetail,
  ModuleCollectionSummary
} from 'src/app/models/module-collection';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';

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

  readonly updatePublicCollections$ = new Subject<void>();
  readonly updateCurrentUserCollections$ = new Subject<void>();
  readonly updatePublicCollectionByPublicId$ = new ReplaySubject<string>(1);
  readonly updateCurrentUserCollectionById$ = new ReplaySubject<number>(1);
  readonly updateModuleCollectionsForModule$ = new ReplaySubject<number>(1);
  readonly localCurrentUserCollectionUpdated$ = new Subject<ModuleCollectionDetail>();

  constructor(
    private backend: SupabaseService,
    private analytics: AnalyticsService
  ) {
    super();

    this.updatePublicCollections$
      .pipe(
        tap(() => this._publicCollections$.next(undefined)),
        switchMap(() => this.backend.GET.publicModuleCollections()),
        takeUntil(this.destroy$)
      )
      .subscribe(collections => {
        this._publicCollections$.next(collections);
        this.analytics.capture('module_collection.browser_viewed', { view: 'public' });
      });

    this.updateCurrentUserCollections$
      .pipe(
        tap(() => this._currentUserCollections$.next(undefined)),
        switchMap(() => this.backend.GET.currentUserModuleCollections()),
        takeUntil(this.destroy$)
      )
      .subscribe(collections => {
        this._currentUserCollections$.next(collections);
        this.analytics.capture('module_collection.browser_viewed', { view: 'user_area' });
      });

    this.updatePublicCollectionByPublicId$
      .pipe(
        tap(() => {
          this._publicCollectionUnavailableMessage$.next(null);
          this._publicCollection$.next(undefined);
        }),
        switchMap(publicId => this.backend.GET.publicModuleCollectionByPublicId(publicId)),
        takeUntil(this.destroy$)
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
        takeUntil(this.destroy$)
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
        takeUntil(this.destroy$)
      )
      .subscribe(collections => this._moduleCollectionsForModule$.next(collections));

    this.localCurrentUserCollectionUpdated$
      .pipe(takeUntil(this.destroy$))
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
}
