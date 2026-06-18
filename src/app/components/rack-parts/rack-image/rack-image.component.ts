import {
  NgStyle,
  NgTemplateOutlet
} from '@angular/common';
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
  const dateParts = {
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute),
    second: Number(second),
    millisecond: Number(millisecond)
  };
  const generatedAt = new Date(Date.UTC(
    dateParts.year,
    dateParts.month - 1,
    dateParts.day,
    dateParts.hour,
    dateParts.minute,
    dateParts.second,
    dateParts.millisecond
  ));

  if (
    generatedAt.getUTCFullYear() !== dateParts.year
    || generatedAt.getUTCMonth() !== dateParts.month - 1
    || generatedAt.getUTCDate() !== dateParts.day
    || generatedAt.getUTCHours() !== dateParts.hour
    || generatedAt.getUTCMinutes() !== dateParts.minute
    || generatedAt.getUTCSeconds() !== dateParts.second
    || generatedAt.getUTCMilliseconds() !== dateParts.millisecond
  ) {
    return null;
  }

  return Number.isNaN(generatedAt.getTime()) ? null : generatedAt;
}

function rackUpdatedAt(updated: string | null | undefined): Date | null {
  if (!updated) {
    return null;
  }

  const timestamp = /(?:z|[+-]\d{2}:?\d{2})$/i.test(updated)
    ? updated
    : `${ updated }Z`;
  const updatedAt = new Date(timestamp);

  return Number.isNaN(updatedAt.getTime()) ? null : updatedAt;
}

export function isPreviewStale(rack: Pick<Rack, 'image' | 'updated'> | null | undefined): boolean {
  const generatedAt = previewGeneratedAt(rack?.image);
  const updatedAt = rackUpdatedAt(rack?.updated);

  if (!generatedAt || !updatedAt) {
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
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    NgStyle,
    NgTemplateOutlet
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
    return this.canUpdatePreview && !!this.filename && isPreviewStale(this.data);
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