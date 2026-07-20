import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostBinding,
  HostListener,
  Input,
  OnChanges
} from '@angular/core';
import { animate, style, transition, trigger } from '@angular/animations';
import { TooltipPosition } from '@angular/material/tooltip';
import { MinimalModule } from 'src/app/models/module';
import { AppViewportService } from 'src/app/shared-interproject/app-viewport.service';
import { ModulePartImageDataService } from './module-part-image-data.service';


export function resolveSurfaceTooltipPosition(
  hostRect: Pick<DOMRect, 'left' | 'right'>,
  viewportWidth: number,
  viewportOffsetLeft = 0,
  margin = 16
): TooltipPosition {
  const viewportRight = viewportOffsetLeft + viewportWidth;
  const availableLeft = Math.max(0, hostRect.left - viewportOffsetLeft - margin);
  const availableRight = Math.max(0, viewportRight - hostRect.right - margin);

  return availableLeft > availableRight ? 'before' : 'after';
}


@Component({
  selector: 'app-module-part-image',
  templateUrl: './module-part-image.component.html',
  styleUrls: ['./module-part-image.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ModulePartImageDataService],
  animations: [
    trigger('enter', [
      transition(':enter', [
        style({opacity: 0}),
        animate('725ms ease', style({opacity: 1}))
      ])
    ])
  ],
  standalone: false
})
export class ModulePartImageComponent implements AfterViewInit, OnChanges {
  
  @Input() data: MinimalModule;
  @Input() selectedPanelId: number | null = null;
  @Input() preferredPanelColor: number | null = null;
  @Input() tooltip = '';
  @Input() tooltipDisabled = false;
  @Input() tooltipClass = '';
  
  filename: string | undefined;
  tooltipPosition: TooltipPosition = 'after';
  useDirectStorageFallback = false;

  @Input() containImage: boolean = true;
  @Input() big: boolean = false;
  @Input() disableEnterAnimation = false;
  @Input() disableNavigation = false;
  /** When true, the panel image is rendered at a fixed 3U-equivalent height
   *  so all cards align in a grid regardless of image aspect ratio.
   *  Set to false to use the original dynamic sizing behaviour. */
  @Input() fixedHeight: boolean = false;
  
  get sizeDivider(): number {
    return this.big ? 1 : 2.7;
  }

  @HostBinding('class.modulePartImage--surface')
  get isSurfaceImage(): boolean {
    return !this.containImage;
  }

  get imageLoadingMode(): 'lazy' | 'eager' {
    return this.isSurfaceImage ? 'eager' : 'lazy';
  }

  get imageDecodingMode(): 'async' | 'sync' {
    return this.isSurfaceImage ? 'sync' : 'async';
  }

  get imageSrc(): string | undefined {
    if (!this.filename) {
      return undefined;
    }

    if (this.useDirectStorageFallback) {
      return this.dataService.getPanelImageUrl(this.filename, true);
    }

    return this.dataService.getPanelImageUrl(this.filename);
  }
  
  constructor(
    public changeDetection: ChangeDetectorRef,
    private readonly dataService: ModulePartImageDataService,
    private readonly hostElementRef?: ElementRef<HTMLElement>,
    private readonly appViewportService?: AppViewportService
  ) { }

  ngAfterViewInit(): void {
    this.updateTooltipPosition();
  }
  
  ngOnChanges(): void {
    const previousFilename = this.filename;
    if (this.data.panels?.length > 0) {
      let panel = this.selectedPanelId != null
        ? this.data.panels.find(p => p.id === this.selectedPanelId)
        : undefined;
      if (!panel && this.preferredPanelColor != null) {
        panel = this.data.panels.find(p => p.color === this.preferredPanelColor) ?? undefined;
      }
      this.filename = (panel ?? this.data.panels[0]).filename;
    } else {
      this.filename = undefined;
    }
    if (this.filename !== previousFilename) {
      this.useDirectStorageFallback = false;
    }
    this.updateTooltipPosition();
    this.changeDetection.detectChanges();
  }

  onImageLoadError(): void {
    if (!this.filename || this.useDirectStorageFallback) {
      return;
    }

    this.useDirectStorageFallback = true;
    this.changeDetection.detectChanges();
  }

  @HostListener('mouseenter')
  @HostListener('focusin')
  @HostListener('window:resize')
  updateTooltipPosition(anchor?: {getBoundingClientRect(): Pick<DOMRect, 'left' | 'right'>}): void {
    if (!this.hostElementRef || !this.appViewportService) {
      return;
    }

    const viewport = this.appViewportService.currentViewport();
    if (!viewport.width) {
      return;
    }

    this.tooltipPosition = resolveSurfaceTooltipPosition(
      (anchor ?? this.hostElementRef.nativeElement).getBoundingClientRect(),
      viewport.width,
      viewport.offsetLeft
    );
  }
  
}
