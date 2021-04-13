import {
  Directive,
  HostListener,
  Input,
  OnDestroy
}                             from '@angular/core';
import { HeroInfoBoxService } from './hero-info-box.service';

@Directive({
  selector: '[infoBox]'
})
export class HeroInfoBoxTextDirective implements OnDestroy {
  @Input() infoText: string;

  constructor(public dataService: HeroInfoBoxService) { }

  @HostListener('mouseenter') onMouseEnter() {
    this.dataService.hoverStart$.next(this.infoText);
  }

  @HostListener('mouseleave') onMouseLeave() {
    this.dataService.hoverEnd$.next(this.infoText);
  }

  ngOnDestroy(): void {
    this.dataService.hoverEnd$.next(this.infoText);
  }


}
