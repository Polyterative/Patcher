import {
  animate,
  style,
  transition,
  trigger
} from '@angular/animations';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnDestroy,
  OnInit
} from '@angular/core';
import {
  merge
} from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { SubManager } from '../../../directives/subscription-manager';
import { FileDragHostService } from './file-drag-host.service';
import { FlexModule } from '@angular/flex-layout/flex';
import { MatCardSubtitle } from '@angular/material/card';
import { AsyncPipe, SlicePipe, DatePipe } from '@angular/common';


@Component({
    selector: 'lib-file-drag-host',
    templateUrl: './file-drag-host.component.html',
    styleUrls: ['./file-drag-host.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    animations: [
        trigger('fadeInOut', [
            transition(':enter', [
                style({
                    opacity: 0,
                    height: 0.01
                }),
                animate('225ms cubic-bezier(0.0, 0.0, 0.2, 1)'),
                style({ opacity: 1 })
            ]),
            transition(':leave', [
                animate('225ms cubic-bezier(0.4, 0.0, 1, 1)'),
                style({ opacity: 0 })
            ])
        ]),
        trigger('fadeIn', [
            transition(':enter', [
                style({
                    opacity: 0,
                    height: 0.01
                }),
                animate('225ms 500ms cubic-bezier(0.0, 0.0, 0.2, 1)'),
                style({ opacity: 1 })
            ])
        ])
    ],
    imports: [FlexModule, MatCardSubtitle, AsyncPipe, SlicePipe, DatePipe]
})
export class FileDragHostComponent extends SubManager implements OnInit, OnDestroy {
  @Input()
  acceptedFileType: string;
  
  @Input()
  readonly multipleFilesMode: boolean;
  
  @Input()
  readonly isImageOnlyMode: boolean = false;

  isDraggingOver = false;

  private readonly previewUrls = new Map<File, string>();
  
  constructor(
    public service: FileDragHostService,
    public changeDetectorRef: ChangeDetectorRef
  ) {
    super();
  }
  
  ngOnInit(): void {
    
    this.service.singleFileMode$.next(!this.multipleFilesMode);

    this.service.files$
      .pipe(this.takeUntilDestroyed())
      .subscribe(files => this.revokeUnusedPreviewUrls(files));
    
    merge(
      this.service.files$,
      this.service.fileAdd$,
      this.service.removeFile$,
      this.service.removeAllFiles$
    )
      .pipe(
        debounceTime(50),
        this.takeUntilDestroyed()
      )
      .subscribe(_ => this.changeDetectorRef.detectChanges());
  }

  openFilePicker(fileInput: HTMLInputElement, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    fileInput.click();
  }

  onFilePickerChange(event: Event, fileInput: HTMLInputElement): void {
    event.stopPropagation();

    if (fileInput.files && fileInput.files.length > 0) {
      this.service.addFiles(fileInput.files, this.acceptedFileType);
    }

    fileInput.value = '';
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();

    const nextTarget = event.relatedTarget;
    if (nextTarget instanceof Node && event.currentTarget instanceof Node && event.currentTarget.contains(nextTarget)) {
      return;
    }

    this.isDraggingOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingOver = false;

    const files = event.dataTransfer?.files;
    if (!files || files.length === 0) {
      return;
    }

    this.service.addFiles(files, this.acceptedFileType);
  }

  removeFile(file: File, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.revokePreviewUrl(file);
    this.service.removeFile$.emit(file);
  }

  getImagePreviewUrl(file: File): string {
    const cachedUrl = this.previewUrls.get(file);
    if (cachedUrl) {
      return cachedUrl;
    }

    const url = URL.createObjectURL(file);
    this.previewUrls.set(file, url);
    return url;
  }

  override ngOnDestroy(): void {
    this.previewUrls.forEach(url => URL.revokeObjectURL(url));
    this.previewUrls.clear();
    super.ngOnDestroy();
  }

  private revokeUnusedPreviewUrls(files: File[]): void {
    this.previewUrls.forEach((url, file) => {
      if (!files.includes(file)) {
        URL.revokeObjectURL(url);
        this.previewUrls.delete(file);
      }
    });
  }

  private revokePreviewUrl(file: File): void {
    const url = this.previewUrls.get(file);
    if (!url) {
      return;
    }

    URL.revokeObjectURL(url);
    this.previewUrls.delete(file);
  }
  
}
