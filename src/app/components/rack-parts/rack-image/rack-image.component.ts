import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output
} from '@angular/core';
import { animate, style, transition, trigger } from '@angular/animations';
import { FlexLayoutModule } from "@angular/flex-layout";
import { RouterLink } from "@angular/router";
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

import { Rack } from "src/app/models/rack";
import { StorageUrls } from 'src/app/features/backend/DatabaseStrings';


export function previewGeneratedAt(filename: string | null | undefined): Date | null {
  const match = filename?.match(/_(\d{4})-(\d{2})-(\d{2})(\d{2})-(\d{2})-(\d{2})(\d{3})?\.jpe?g$/i);
  if (!match) {
    return null;
  }

  const [, year, month, day, hour, minute, second, millisecond = '0'] = match;
  const generatedAt = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
    Number(millisecond)
  );

  return Number.isNaN(generatedAt.getTime()) ? null : generatedAt;
}

export function isPreviewStale(rack: Pick<Rack, 'image' | 'updated'> | null | undefined): boolean {
  const generatedAt = previewGeneratedAt(rack?.image);
  const updatedAt = rack?.updated ? new Date(rack.updated) : null;

  if (!generatedAt || !updatedAt || Number.isNaN(updatedAt.getTime())) {
    return false;
  }

  return updatedAt.getTime() > generatedAt.getTime();
}

@Component({
  selector: 'app-rack-image',
  templateUrl: './rack-image.component.html',
  styleUrls: ['./rack-image.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FlexLayoutModule,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule
  ],
  animations: [
    trigger('enter', [
      transition(':enter', [
        style({opacity: 0}),
        animate('725ms ease', style({opacity: 1}))
      ])
    ])
  ]
})
export class RackImageComponent implements OnInit, OnChanges {
  
  @Input() data: Rack;
  @Input() containImage: boolean = true;
  @Input() canUpdatePreview = false;
  @Output() updatePreviewClick = new EventEmitter<void>();
  
  readonly rackStorageBase = StorageUrls.racks;
  
  filename: string | undefined;
  imageLoadFailed = false;
  
  // proportion between contained and full size
  sizeDivider: number = 1.5;
  
  constructor(
    public changeDetection: ChangeDetectorRef
  ) {
  }
  
  ngOnChanges(): void {
    this.syncFilename();
  }
  
  ngOnInit(): void {
    this.syncFilename();
    this.changeDetection.detectChanges();
  }

  onPreviewLoadError(): void {
    this.imageLoadFailed = true;
  }

  get isStale(): boolean {
    return this.canUpdatePreview && !!this.filename && !this.imageLoadFailed && isPreviewStale(this.data);
  }

  requestPreviewUpdate(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.updatePreviewClick.emit();
  }

  private syncFilename(): void {
    const nextFilename = this.data.image || undefined;
    if (this.filename !== nextFilename) {
      this.imageLoadFailed = false;
    }
    this.filename = nextFilename;
  }
  
}