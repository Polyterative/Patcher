import { CdkDragDrop } from '@angular/cdk/drag-drop';
import {
  Component,
  EventEmitter,
  Inject,
  Input,
  OnChanges,
  OnDestroy,
  Optional,
  Output,
  SimpleChanges,
  ChangeDetectionStrategy
} from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import {
  defaultModuleMinimalViewConfig,
  ModuleMinimalViewConfig
} from 'src/app/components/module-parts/module-minimal/module-minimal.component';
import { ModuleListActionConfig } from 'src/app/features/module-browser/module-list/module-list.component';
import { MinimalModule } from 'src/app/models/module';
import { ModuleCollectionDetail } from 'src/app/models/module-collection';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';
import { ModuleCollectionEditorDataService } from './module-collection-editor-data.service';

export interface ModuleCollectionEditorDialogData {
  collection?: ModuleCollectionDetail;
}

export type ModuleCollectionEditorSurface = 'dialog' | 'page';

@Component({
  selector: 'app-module-collection-editor',
  templateUrl: './module-collection-editor.component.html',
  styleUrls: ['./module-collection-editor.component.scss'],
  providers: [ModuleCollectionEditorDataService],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
export class ModuleCollectionEditorComponent extends SubManager implements OnChanges, OnDestroy {
  @Input() collection?: ModuleCollectionDetail;
  @Input() surface: ModuleCollectionEditorSurface = 'dialog';
  @Output() readonly saved = new EventEmitter<void>();
  @Output() readonly collectionUpdated = new EventEmitter<ModuleCollectionDetail>();

  readonly moduleBrowserAction: ModuleListActionConfig = {
    icon: 'playlist_add',
    label: 'Add to playlist',
    disabledIcon: 'check',
    disabledLabel: 'Already in playlist'
  };
  readonly playlistModuleViewConfig: ModuleMinimalViewConfig = {
    ...defaultModuleMinimalViewConfig,
    hideButtons: true,
    hideDates: true,
    hideTags: true,
    hideDescription: true,
    hideManufacturer: false,
    hideHP: false,
    bigPanelImage: false,
    tagsReadOnly: true
  };
  readonly browserModuleViewConfig: ModuleMinimalViewConfig = {
    ...defaultModuleMinimalViewConfig,
    hideButtons: true,
    hideDates: true,
    hideTags: false,
    hideDescription: false,
    hideManufacturer: false,
    hideHP: false,
    bigPanelImage: false,
    tagsReadOnly: true,
    tagsMaxCount: 3
  };

  get save$() { return this.dataService.save$; }
  get removeSelectedModule$() { return this.dataService.removeSelectedModule$; }
  get addModule$() { return this.dataService.addModule$; }
  get nameControl() { return this.dataService.nameControl; }
  get descriptionControl() { return this.dataService.descriptionControl; }
  get publicControl() { return this.dataService.publicControl; }
  get saving$() { return this.dataService.saving$; }
  get selectedModules$() { return this.dataService.selectedModules$; }
  get selectedModuleIds$() { return this.dataService.selectedModuleIds$; }
  get emptySelectedModuleIds() { return this.dataService.emptySelectedModuleIds; }
  get isEditMode(): boolean { return this.dataService.isEditMode; }

  constructor(
    public readonly dataService: ModuleCollectionEditorDataService,
    @Optional() private dialogRef: MatDialogRef<ModuleCollectionEditorComponent, boolean> | null,
    @Optional() @Inject(MAT_DIALOG_DATA) public data: ModuleCollectionEditorDialogData | null
  ) {
    super();

    this.dataService.initializeCollection(data?.collection);
    this.dataService.explicitSaveCompleted$
      .pipe(this.takeUntilDestroyed())
      .subscribe(() => {
        this.saved.emit();
        if (typeof this.dialogRef?.close === 'function') {
          this.dialogRef.close(true);
        }
      });

    this.dataService.collectionUpdated$
      .pipe(this.takeUntilDestroyed())
      .subscribe(collection => this.collectionUpdated.emit(collection));
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['collection']) {
      this.dataService.initializeCollection(this.collection);
    }
  }

  onCoverFileChange(files: FileList | null): void {
    this.dataService.onCoverFileChange(files);
  }

  onSelectedModulesDrop(event: CdkDragDrop<MinimalModule[]>): void {
    this.dataService.onSelectedModulesDrop(event);
  }

  displayCoverPreview(): string | null {
    return this.dataService.displayCoverPreview();
  }
}
