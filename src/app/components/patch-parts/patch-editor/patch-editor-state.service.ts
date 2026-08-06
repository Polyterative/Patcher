import { Injectable } from '@angular/core';
import { UntypedFormControl } from '@angular/forms';
import {
  BehaviorSubject,
  combineLatest,
  Observable,
  of
} from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  map,
  startWith,
  switchMap
} from 'rxjs/operators';
import { MAX_INSTANCES_PER_MODULE, PatchDetailDataService } from '../patch-detail-data.service';
import {
  PatchConnection,
  PatchModuleInstance
} from 'src/app/models/connection';
import { DbModule } from 'src/app/models/module';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';
import { ISelectable } from 'src/app/shared-interproject/components/@smart/mat-form-entity/form-element-models';
import {
  EditorModuleCard,
  LinkedRackDivergence,
  LinkedRackPreviewState,
  PATCH_EDITOR_OPERATION_MODES,
  PatchEditorGroupModeId,
  PatchEditorOperationMode,
  PatchEditorSortModeId,
  PatchEditorSortStrategy
} from './patch-editor.types';
import {
  asGroupModeId,
  asSortModeId,
  buildLinkedRackInstanceMap,
  countOrphanedConnections,
  defaultLinkedRackPreviewState,
  detectLinkedRackDivergence,
  filterEditorCardsByQuery,
  loadingLinkedRackPreviewState,
  PATCH_EDITOR_GROUP_MODE_OPTIONS,
  PATCH_EDITOR_OPERATION_MODE_OPTIONS,
  PATCH_EDITOR_SORT_MODE_OPTIONS,
  resolvePatchEditorSortStrategy,
  sortAndGroupEditorCards
} from './patch-editor.utils';
import { buildEditorCards } from './patch-editor-card.utils';

interface PatchEditorStateCallbacks {
  readonly: boolean;
  clearExpandedRackSelection: () => void;
  prepareRackPreviewFrame: (state: LinkedRackPreviewState) => void;
}

@Injectable()
export class PatchEditorStateService extends SubManager {
  readonly maxInstances = MAX_INSTANCES_PER_MODULE;
  readonly operationModeOptions = PATCH_EDITOR_OPERATION_MODE_OPTIONS;
  readonly operationMode$: BehaviorSubject<PatchEditorOperationMode>;
  readonly hasLinkedRack$: Observable<boolean>;
  readonly linkedRackPreviewState$ = new BehaviorSubject<LinkedRackPreviewState>(defaultLinkedRackPreviewState);
  readonly sortModeOptions$: Observable<ISelectable[]> = of(PATCH_EDITOR_SORT_MODE_OPTIONS);
  readonly groupModeOptions$: Observable<ISelectable[]> = of(PATCH_EDITOR_GROUP_MODE_OPTIONS);
  readonly moduleSortControl = new UntypedFormControl(PATCH_EDITOR_SORT_MODE_OPTIONS[0]);
  readonly moduleGroupControl = new UntypedFormControl(PATCH_EDITOR_GROUP_MODE_OPTIONS[0]);
  readonly moduleSortModeId$: Observable<PatchEditorSortModeId>;
  readonly moduleGroupModeId$: Observable<PatchEditorGroupModeId>;
  readonly moduleSortStrategy$: Observable<PatchEditorSortStrategy>;
  readonly moduleSearchControl = new UntypedFormControl('');
  readonly moduleSearchQuery$: Observable<string>;
  readonly sourceEditorCards$ = new BehaviorSubject<EditorModuleCard[]>([]);
  readonly editorCards$ = new BehaviorSubject<EditorModuleCard[]>([]);
  readonly collectionLoaded$ = new BehaviorSubject<boolean>(false);
  readonly linkedRackInstanceMap$ = new BehaviorSubject<Map<number, number>>(new Map());
  readonly linkedRackDivergence$ = new BehaviorSubject<LinkedRackDivergence>({
    orphanedModules: [], excessInstances: [], totalOrphanedInstances: 0, clean: true
  });
  readonly orphanedConnectionCount$ = new BehaviorSubject<number>(0);
  readonly addingCopy = new Set<number>();

  constructor(
    public dataService: PatchDetailDataService
  ) {
    super();
    this.operationMode$ = this.dataService.editorOperationMode$;
    this.hasLinkedRack$ = this.dataService.linkedRackState$.pipe(
      map(state => state.kind !== 'unlinked'),
      distinctUntilChanged()
    );
    this.moduleSortModeId$ = this.moduleSortControl.valueChanges.pipe(
      startWith(PATCH_EDITOR_SORT_MODE_OPTIONS[0]),
      map(value => asSortModeId(value)),
      distinctUntilChanged()
    );
    this.moduleGroupModeId$ = this.moduleGroupControl.valueChanges.pipe(
      startWith(PATCH_EDITOR_GROUP_MODE_OPTIONS[0]),
      map(value => asGroupModeId(value)),
      distinctUntilChanged()
    );
    this.moduleSortStrategy$ = this.moduleSortModeId$.pipe(
      map(sortModeId => resolvePatchEditorSortStrategy(sortModeId)),
      distinctUntilChanged((a, b) => a.id === b.id)
    );
    this.moduleSearchQuery$ = this.moduleSearchControl.valueChanges.pipe(
      startWith(''),
      debounceTime(120),
      map(value => value ?? ''),
      map(value => `${ value }`),
      distinctUntilChanged()
    );
  }

  connect(callbacks: PatchEditorStateCallbacks): void {
    if (!callbacks.readonly) {
      this.connectCollectionLoader();
      this.connectEditorCards();
      this.connectFilteredEditorCards();
      this.connectLinkedRackInstanceMap();
      this.connectLinkedRackDivergence();
      this.connectOrphanedConnectionCount();
    }

    this.connectLinkedRackPreview(callbacks);
    this.connectOperationModeSync();
    this.connectConnectionDismissal(callbacks.clearExpandedRackSelection);
  }

  private connectCollectionLoader(): void {
    this.moduleSortStrategy$
      .pipe(
        switchMap(strategy => this.dataService.loadEditorCollectionModules$(strategy)),
        this.takeUntilDestroyed()
      )
      .subscribe((modules: DbModule[]) => {
        this.dataService.collectionModules$.next(modules);
        this.collectionLoaded$.next(true);
      });
  }

  private connectEditorCards(): void {
    combineLatest([
      this.dataService.collectionModules$,
      this.dataService.patchModuleInstances$,
      this.dataService.editorConnections$
    ])
      .pipe(this.takeUntilDestroyed())
      .subscribe(([modules, instances, connections]: [DbModule[], PatchModuleInstance[], PatchConnection[]]) => {
        const editorCards = buildEditorCards(modules, instances, connections || []);
        this.addingCopy.clear();
        this.sourceEditorCards$.next(editorCards);
      });
  }

  private connectFilteredEditorCards(): void {
    combineLatest([
      this.sourceEditorCards$,
      this.moduleSearchQuery$,
      this.moduleSortStrategy$,
      this.moduleGroupModeId$
    ])
      .pipe(
        map(([cards, searchQuery, strategy, groupModeId]) => {
          const filteredCards = filterEditorCardsByQuery(cards, searchQuery);
          return sortAndGroupEditorCards(filteredCards, strategy, groupModeId);
        }),
        this.takeUntilDestroyed()
      )
      .subscribe(cards => this.editorCards$.next(cards));
  }

  private connectLinkedRackInstanceMap(): void {
    combineLatest([
      this.dataService.patchModuleInstances$,
      this.linkedRackPreviewState$
    ])
      .pipe(
        map(([instances, previewState]) => buildLinkedRackInstanceMap(previewState, instances)),
        this.takeUntilDestroyed()
      )
      .subscribe(map => this.linkedRackInstanceMap$.next(map));
  }

  private connectLinkedRackDivergence(): void {
    combineLatest([
      this.dataService.patchModuleInstances$,
      this.linkedRackPreviewState$,
      this.dataService.patchConnections$
    ])
      .pipe(
        map(([instances, previewState, connections]) =>
          detectLinkedRackDivergence(previewState, instances, connections ?? [])
        ),
        this.takeUntilDestroyed()
      )
      .subscribe(divergence => this.linkedRackDivergence$.next(divergence));
  }

  private connectOrphanedConnectionCount(): void {
    combineLatest([
      this.linkedRackInstanceMap$,
      this.dataService.patchModuleInstances$,
      this.dataService.patchConnections$
    ])
      .pipe(
        map(([instanceMap, instances, connections]) =>
          countOrphanedConnections(instanceMap, instances, connections ?? [])
        ),
        this.takeUntilDestroyed()
      )
      .subscribe(count => this.orphanedConnectionCount$.next(count));
  }

  private connectLinkedRackPreview(callbacks: PatchEditorStateCallbacks): void {
    this.dataService.linkedRackState$.pipe(map(state => state.rackId ?? null), distinctUntilChanged())
      .pipe(
        switchMap(linkedRackId => {
          if (linkedRackId == null) {
            return of(defaultLinkedRackPreviewState);
          }

          this.linkedRackPreviewState$.next(loadingLinkedRackPreviewState);
          return this.dataService.loadLinkedRackPreview$(linkedRackId);
        }),
        this.takeUntilDestroyed()
      )
      .subscribe(state => {
        this.linkedRackPreviewState$.next(state);
        callbacks.clearExpandedRackSelection();
        callbacks.prepareRackPreviewFrame(state);
      });
  }

  private connectOperationModeSync(): void {
    this.hasLinkedRack$
      .pipe(this.takeUntilDestroyed())
      .subscribe(hasLinkedRack => {
        const mode = hasLinkedRack
          ? PATCH_EDITOR_OPERATION_MODES.linkedRack
          : PATCH_EDITOR_OPERATION_MODES.collection;
        this.operationMode$.next(mode);
      });
  }

  private connectConnectionDismissal(clearExpandedRackSelection: () => void): void {
    this.dataService.confirmSelectedConnection$
      .pipe(this.takeUntilDestroyed())
      .subscribe(() => clearExpandedRackSelection());
  }
}
