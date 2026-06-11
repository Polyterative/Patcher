import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  Input,
  OnChanges,
  OnInit,
  ViewChild
} from '@angular/core';
import { MinimalModule } from 'src/app/models/module';
import { ModuleMinimalViewConfig } from '../module-minimal.component';


@Component({
  selector: 'app-module-part-description',
  templateUrl: './module-part-description.component.html',
  styleUrls: ['./module-part-description.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class ModulePartDescriptionComponent implements OnInit, AfterViewInit, OnChanges {
  private readonly maxDescriptionLines = 5;
  
  @Input() data: MinimalModule;
  @Input() viewConfig: ModuleMinimalViewConfig;
  @ViewChild('descriptionTrigger') descriptionTrigger: ElementRef<HTMLElement> | undefined;

  readerAlignEnd = false;
  shouldClampDescription = false;
  
  constructor(private readonly changeDetector: ChangeDetectorRef) { }
  
  ngOnInit(): void {
  }

  ngAfterViewInit(): void {
    this.queueClampMeasurement();
  }

  ngOnChanges(): void {
    this.queueClampMeasurement();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.queueClampMeasurement();
  }

  updateReaderAlignment(triggerElement: HTMLElement): void {
    const viewportMargin = 16;
    const readerWidth = Math.min(34 * 16, window.innerWidth - (viewportMargin * 2));
    const rect = triggerElement.getBoundingClientRect();

    this.readerAlignEnd = rect.left + readerWidth > window.innerWidth - viewportMargin;
  }

  updateClampState(descriptionElement: HTMLElement): void {
    const shouldClampDescription =
      !!this.viewConfig?.ellipseDescription && this.descriptionExceedsLineLimit(descriptionElement);

    if (shouldClampDescription === this.shouldClampDescription) {
      return;
    }

    this.shouldClampDescription = shouldClampDescription;
    this.changeDetector.markForCheck();
  }

  descriptionExceedsLineLimit(descriptionElement: HTMLElement): boolean {
    const style = window.getComputedStyle(descriptionElement);
    const lineHeight = this.resolveLineHeight(style);

    return descriptionElement.scrollHeight > (lineHeight * this.maxDescriptionLines) + 1;
  }

  private queueClampMeasurement(): void {
    if (!this.descriptionTrigger) {
      return;
    }

    window.requestAnimationFrame(() => {
      if (this.descriptionTrigger) {
        this.updateClampState(this.descriptionTrigger.nativeElement);
      }
    });
  }

  private resolveLineHeight(style: CSSStyleDeclaration): number {
    const lineHeight = Number.parseFloat(style.lineHeight);

    if (Number.isFinite(lineHeight)) {
      return lineHeight;
    }

    return Number.parseFloat(style.fontSize) * 1.2;
  }
  
}