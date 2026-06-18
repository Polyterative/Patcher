import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import {
  CropperPosition,
  Dimensions,
  ImageCropperComponent,
  ImageCroppedEvent
} from 'ngx-image-cropper';

@Component({
  selector: 'app-module-editor-cropper',
  standalone: true,
  imports: [CommonModule, ImageCropperComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <image-cropper
      [imageFile]="imageFile"
      [output]="'blob'"
      [format]="format"
      [imageQuality]="imageQuality"
      [maintainAspectRatio]="true"
      [aspectRatio]="aspectRatio"
      [containWithinAspectRatio]="true"
      [onlyScaleDown]="true"
      [cropperMinWidth]="120"
      [cropperMinHeight]="120"
      [checkImageType]="true"
      [imageAltText]="'Selected panel image'"
      [cropperFrameAriaLabel]="'Panel crop selection'"
      [initialStepSize]="1"
      [cropper]="cropper"
      (imageCropped)="imageCropped.emit($event)"
      (imageLoaded)="imageLoaded.emit()"
      (cropperChange)="cropperChange.emit($event)"
      (cropperReady)="cropperReady.emit($event)"
      (loadImageFailed)="loadImageFailed.emit()"
    ></image-cropper>
  `
})
export class ModuleEditorCropperComponent {
  @Input({required: true}) imageFile!: File;
  @Input({required: true}) format!: 'jpeg' | 'png' | 'webp';
  @Input({required: true}) imageQuality!: number;
  @Input({required: true}) aspectRatio!: number;
  @Input() cropper?: CropperPosition;

  @Output() imageCropped = new EventEmitter<ImageCroppedEvent>();
  @Output() imageLoaded = new EventEmitter<void>();
  @Output() cropperChange = new EventEmitter<CropperPosition>();
  @Output() cropperReady = new EventEmitter<Dimensions>();
  @Output() loadImageFailed = new EventEmitter<void>();

  @ViewChild(ImageCropperComponent) private cropperComponent?: ImageCropperComponent;

  resetCropperPosition(): void {
    this.cropperComponent?.resetCropperPosition();
  }

  keyboardAccess(event: KeyboardEvent): void {
    this.cropperComponent?.keyboardAccess(event);
  }
}
