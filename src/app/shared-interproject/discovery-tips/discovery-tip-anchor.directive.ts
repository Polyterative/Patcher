import {
  Directive,
  ElementRef,
  Input,
  OnDestroy,
  OnInit
} from '@angular/core';
import { DiscoveryTipService } from './discovery-tip.service';


@Directive({
  selector: '[appDiscoveryTipAnchor]',
  standalone: false
})
export class DiscoveryTipAnchorDirective implements OnInit, OnDestroy {
  @Input('appDiscoveryTipAnchor') anchorId!: string;

  constructor(
    private readonly elementRef: ElementRef<HTMLElement>,
    private readonly discoveryTipService: DiscoveryTipService
  ) {}

  ngOnInit(): void {
    if (!this.anchorId) {
      return;
    }
    this.discoveryTipService.registerAnchor(this.anchorId, this.elementRef.nativeElement);
  }

  ngOnDestroy(): void {
    if (!this.anchorId) {
      return;
    }
    this.discoveryTipService.unregisterAnchor(this.anchorId, this.elementRef.nativeElement);
  }
}

