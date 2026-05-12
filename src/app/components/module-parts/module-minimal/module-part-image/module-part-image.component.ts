import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostBinding,
  HostListener,
  Input,
  OnChanges,
  Optional
} from '@angular/core';
import { fadeInOnEnterAnimation } from 'angular-animations';
import {
  MatTooltip,
  TooltipPosition
} from '@angular/material/tooltip';
import { MinimalModule } from 'src/app/models/module';
import { AppViewportService } from 'src/app/shared-interproject/app-viewport.service';


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
  animations: [
    fadeInOnEnterAnimation({
      anchor: 'enter',
      duration: 725,
      animateChildren: 'after'
    })
  ],
  standalone: false
})
export class ModulePartImageComponent implements AfterViewInit, OnChanges {
  
  @Input() data: MinimalModule;
  @Input() selectedPanelId: number | null = null;
  @Input() preferredPanelColor: number | null = null;
  
  filename: string | undefined;
  
  @Input() containImage: boolean = true;
  @Input() big: boolean = false;
  @Input() disableEnterAnimation = false;
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
  
  constructor(
    public changeDetection: ChangeDetectorRef,
    private readonly hostElementRef?: ElementRef<HTMLElement>,
    private readonly appViewportService?: AppViewportService,
    @Optional() private readonly matTooltip: MatTooltip | null = null
  ) { }

  ngAfterViewInit(): void {
    this.updateTooltipPosition();
  }
  
  ngOnChanges(): void {
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
    this.updateTooltipPosition();
    this.changeDetection.detectChanges();
  }

  @HostListener('mouseenter')
  @HostListener('focusin')
  @HostListener('window:resize')
  updateTooltipPosition(): void {
    if (!this.matTooltip || !this.hostElementRef || !this.appViewportService) {
      return;
    }

    const viewport = this.appViewportService.currentViewport();
    if (!viewport.width) {
      return;
    }

    this.matTooltip.position = resolveSurfaceTooltipPosition(
      this.hostElementRef.nativeElement.getBoundingClientRect(),
      viewport.width,
      viewport.offsetLeft
    );
  }
  
}
