import {
  CdkDragDrop,
  moveItemInArray
} from '@angular/cdk/drag-drop';
import { Injectable } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  BehaviorSubject,
  EMPTY,
  merge,
  Subject,
  of
} from 'rxjs';
import {
  catchError,
  concatMap,
  debounceTime,
  distinctUntilChanged,
  filter,
  finalize,
  map,
  switchMap,
  takeUntil,
  tap
} from 'rxjs/operators';
import { ModuleCollectionsDataService } from 'src/app/features/module-collections/module-collections-data.service';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { SupabaseStorageFile } from 'src/app/features/backend/supabase.types';
import { MinimalModule } from 'src/app/models/module';
import {
  ModuleCollectionDetail,
  ModuleCollectionEntry
} from 'src/app/models/module-collection';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';
import { getPublicStorageUrl } from 'src/app/shared-interproject/utils/public-storage-url';

const MODULE_COLLECTIONS_STORAGE_BUCKET = 'module-collections';

@Injectable()
export class ModuleCollectionEditorDataService extends SubManager {
  readonly save$ = new Subject<void>();
  readonly explicitSaveCompleted$ = new Subject<void>();
  readonly collectionUpdated$ = new Subject<ModuleCollectionDetail>();
  readonly removeSelectedModule$ = new Subject<number>();
  readonly addModule$ = new Subject<MinimalModule>();
  readonly coverFileSelected$ = new Subject<File | null>();
  readonly autosaveSelectedModules$ = new Subject<MinimalModule[]>();

  readonly nameControl = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(2), Validators.maxLength(80)] });
  readonly descriptionControl = new FormControl('', { nonNullable: true });
  readonly publicControl = new FormControl(false, { nonNullable: true });
  readonly saving$ = new BehaviorSubject<boolean>(false);
  readonly selectedModules$ = new BehaviorSubject<MinimalModule[]>([]);
  readonly emptySelectedModuleIds = new Set<number>();
  readonly selectedModuleIds$ = this.selectedModules$.pipe(
    map(modules => new Set(modules.map(module => module.id)))
  );

  private coverFile: File | null = null;
  private coverPreviewUrl: string | null = null;
  private activeCollection?: ModuleCollectionDetail;
  private initializedCollectionKey: number | 'create' | null = null;
  private lastPersistedModules: MinimalModule[] = [];

  get isEditMode(): boolean {
    return !!this.activeCollection;
  }

  constructor(
    private backend: SupabaseService,
    private collectionsDataService: ModuleCollectionsDataService,
    private snackBar: MatSnackBar
  ) {
    super();
    this.initializeAddModuleHandler();
    this.initializeRemoveModuleHandler();
    this.initializePlaylistAutosaveHandler();
    this.initializeMetadataAutosaveHandler();
    this.initializeCoverSelectionHandler();
    this.initializeExplicitSaveHandler();
  }

  initializeCollection(collection: ModuleCollectionDetail | undefined): void {
    const nextKey = collection?.id ?? 'create';
    if (this.initializedCollectionKey === nextKey) {
      return;
    }

    this.initializedCollectionKey = nextKey;
    this.activeCollection = collection;
    this.nameControl.setValue(collection?.name ?? '', {emitEvent: false});
    this.descriptionControl.setValue(collection?.description ?? '', {emitEvent: false});
    this.publicControl.setValue(collection?.public ?? false, {emitEvent: false});
    const modules = (collection?.entries ?? []).map(entry => entry.module);
    this.selectedModules$.next(modules);
    this.lastPersistedModules = modules;
  }

  onCoverFileChange(files: FileList | null): void {
    this.coverFileSelected$.next(files?.[0] ?? null);
  }

  onSelectedModulesDrop(event: CdkDragDrop<MinimalModule[]>): void {
    const current = [...this.selectedModules$.value];
    moveItemInArray(current, event.previousIndex, event.currentIndex);
    this.updateSelectedModules(current);
  }

  displayCoverPreview(): string | null {
    return this.coverPreviewUrl
      ?? getPublicStorageUrl(MODULE_COLLECTIONS_STORAGE_BUCKET, this.activeCollection?.image);
  }

  searchModules(query: string) {
    const normalizedQuery = query.trim();
    if (normalizedQuery.length < 2) {
      return of([]);
    }

    return this.backend.GET.searchPublicModulesForCollection(normalizedQuery, 24);
  }

  uploadCollectionCover(file: SupabaseStorageFile, filenameAndExtension: string) {
    return this.backend.storage.uploadCollectionCover(file, filenameAndExtension);
  }

  override ngOnDestroy(): void {
    if (this.coverPreviewUrl) {
      URL.revokeObjectURL(this.coverPreviewUrl);
    }
    super.ngOnDestroy();
  }

  private initializeAddModuleHandler(): void {
    this.addModule$
      .pipe(takeUntil(this.destroy$))
      .subscribe(module => {
        const current = this.selectedModules$.value;
        if (current.some(item => item.id === module.id)) {
          return;
        }
        this.updateSelectedModules([...current, module]);
      });
  }

  private initializeRemoveModuleHandler(): void {
    this.removeSelectedModule$
      .pipe(takeUntil(this.destroy$))
      .subscribe(moduleId => {
        this.updateSelectedModules(this.selectedModules$.value.filter(item => item.id !== moduleId));
      });
  }

  private initializePlaylistAutosaveHandler(): void {
    this.autosaveSelectedModules$
      .pipe(
        concatMap(modules => {
          if (!this.isEditMode) {
            return EMPTY;
          }
          if (this.nameControl.invalid) {
            this.nameControl.markAsTouched();
            SharedConstants.infoCustom(this.snackBar, 'Please enter a collection title before changing modules.');
            this.selectedModules$.next(this.lastPersistedModules);
            return EMPTY;
          }

          this.saving$.next(true);
          return this.saveExistingCollectionModules$(modules).pipe(
            tap(collection => {
              this.activeCollection = collection;
              this.lastPersistedModules = modules;
              this.collectionUpdated$.next(collection);
            }),
            catchError(error => {
              console.error('Failed to auto-save collection modules:', error);
              if (this.areSameModules(this.selectedModules$.value, modules)) {
                this.selectedModules$.next(this.lastPersistedModules);
              }
              SharedConstants.errorCustom(this.snackBar, 'Failed to save collection modules - changes reverted. Check your connection and try again.');
              return EMPTY;
            }),
            finalize(() => this.saving$.next(false))
          );
        }),
        takeUntil(this.destroy$)
      )
      .subscribe();
  }

  private initializeCoverSelectionHandler(): void {
    this.coverFileSelected$
      .pipe(
        tap(file => {
          this.coverFile = file;
          if (this.coverPreviewUrl) {
            URL.revokeObjectURL(this.coverPreviewUrl);
            this.coverPreviewUrl = null;
          }
          if (file) {
            this.coverPreviewUrl = URL.createObjectURL(file);
          }
        }),
        filter((file): file is File => !!file),
        filter(() => this.isEditMode),
        filter(() => this.nameControl.valid),
        switchMap(file => {
          this.saving$.next(true);

          return this.uploadAndSaveCover$(file).pipe(
            tap(collection => {
              this.activeCollection = collection;
              this.collectionUpdated$.next(collection);
            }),
            catchError(error => {
              console.error('Failed to auto-save collection cover:', error);
              SharedConstants.errorCustom(this.snackBar, 'Failed to save collection cover - check your connection and try again.');
              return EMPTY;
            }),
            finalize(() => this.saving$.next(false))
          );
        }),
        takeUntil(this.destroy$)
      )
      .subscribe();
  }

  private initializeMetadataAutosaveHandler(): void {
    merge(
      this.nameControl.valueChanges,
      this.descriptionControl.valueChanges,
      this.publicControl.valueChanges
    )
      .pipe(
        debounceTime(800),
        filter(() => this.isEditMode),
        filter(() => this.nameControl.valid),
        map(() => this.metadataSignature()),
        distinctUntilChanged(),
        filter(() => this.hasMetadataChanges()),
        switchMap(() => {
          this.saving$.next(true);

          return this.saveExistingCollection$(this.selectedModules$.value).pipe(
            tap(collection => {
              this.activeCollection = collection;
              this.collectionUpdated$.next(collection);
            }),
            catchError(error => {
              console.error('Failed to auto-save collection details:', error);
              SharedConstants.errorCustom(this.snackBar, 'Failed to save collection details - check your connection and try again.');
              return EMPTY;
            }),
            finalize(() => this.saving$.next(false))
          );
        }),
        takeUntil(this.destroy$)
      )
      .subscribe();
  }

  private initializeExplicitSaveHandler(): void {
    this.save$
      .pipe(
        switchMap(() => {
          if (this.nameControl.invalid) {
            this.nameControl.markAsTouched();
            SharedConstants.infoCustom(this.snackBar, 'Please enter a collection title.');
            return EMPTY;
          }

          this.saving$.next(true);
          const moduleIds = this.selectedModules$.value.map(module => module.id);
          const uploadCover$ = this.coverFile
            ? this.uploadCollectionCover(
              this.coverFile,
              this.coverFilename(this.coverFile)
            )
            : of(null);

          const collection = this.activeCollection;
          const saveWithImage = (image: string | null) => (this.isEditMode && collection)
            ? this.collectionsDataService.saveCollection({
              id: collection.id,
              name: this.nameControl.value,
              description: this.descriptionControl.value,
              public: this.publicControl.value,
              image,
              moduleIds
            })
            : this.collectionsDataService.saveCollection({
              name: this.nameControl.value,
              description: this.descriptionControl.value,
              public: this.publicControl.value,
              image,
              moduleIds
            });

          if (this.coverFile) {
            return uploadCover$.pipe(
              switchMap((imagePath: string) => saveWithImage(imagePath)),
              catchError(error => {
                console.error(error);
                SharedConstants.errorCustom(this.snackBar, 'Failed to save collection cover.');
                this.saving$.next(false);
                return EMPTY;
              })
            );
          }

          return saveWithImage(collection?.image ?? null).pipe(
            catchError(error => {
              console.error(error);
              SharedConstants.errorCustom(this.snackBar, 'Failed to save collection.');
              this.saving$.next(false);
              return EMPTY;
            })
          );
        }),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        SharedConstants.successCustom(this.snackBar, this.isEditMode ? 'Collection updated.' : 'Collection created.');
        this.saving$.next(false);
        this.explicitSaveCompleted$.next();
      });
  }

  private updateSelectedModules(modules: MinimalModule[]): void {
    if (this.areSameModules(this.selectedModules$.value, modules)) {
      return;
    }
    this.selectedModules$.next(modules);
    this.autosaveSelectedModules$.next(modules);
  }

  private saveExistingCollectionModules$(modules: MinimalModule[]) {
    return this.saveExistingCollection$(modules);
  }

  private uploadAndSaveCover$(file: File) {
    return this.uploadCollectionCover(file, this.coverFilename(file)).pipe(
      switchMap(imagePath => this.saveExistingCollection$(this.selectedModules$.value, imagePath))
    );
  }

  private saveExistingCollection$(modules: MinimalModule[], image?: string | null) {
    const collection = this.activeCollection;
    if (!collection) {
      return EMPTY;
    }

    return this.collectionsDataService.saveCollection({
      id: collection.id,
      name: this.nameControl.value,
      description: this.descriptionControl.value,
      public: this.publicControl.value,
      image: image ?? collection.image ?? null,
      moduleIds: modules.map(module => module.id)
    }).pipe(
      map(() => this.buildCollectionWithModules(collection, modules, image))
    );
  }

  private coverFilename(file: File): string {
    const slug = this.nameControl.value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'collection';

    return `${ slug }-${ Date.now() }.${ file.name.split('.').pop() || 'jpg' }`;
  }

  private metadataSignature(): string {
    return JSON.stringify({
      name: this.nameControl.value,
      description: this.descriptionControl.value,
      public: this.publicControl.value
    });
  }

  private hasMetadataChanges(): boolean {
    const collection = this.activeCollection;
    return !!collection
      && (
        collection.name !== this.nameControl.value
        || (collection.description ?? '') !== this.descriptionControl.value
        || collection.public !== this.publicControl.value
      );
  }

  private buildCollectionWithModules(
    collection: ModuleCollectionDetail,
    modules: MinimalModule[],
    image?: string | null
  ): ModuleCollectionDetail {
    const entriesByModuleId = new Map(collection.entries.map(entry => [entry.module.id, entry]));
    const entries: ModuleCollectionEntry[] = modules.map((module, index) => ({
      id: entriesByModuleId.get(module.id)?.id ?? 0,
      note: entriesByModuleId.get(module.id)?.note ?? null,
      ordinal: index,
      module
    }));

    return {
      ...collection,
      name: this.nameControl.value,
      description: this.descriptionControl.value,
      public: this.publicControl.value,
      image: image ?? collection.image,
      module_count: modules.length,
      entries
    };
  }

  private areSameModules(left: MinimalModule[], right: MinimalModule[]): boolean {
    return left.length === right.length
      && left.every((module, index) => module.id === right[index]?.id);
  }
}
