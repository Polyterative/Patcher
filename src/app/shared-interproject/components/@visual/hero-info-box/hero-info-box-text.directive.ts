import {
  Directive,
  ElementRef,
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
  
  constructor(public dataService: HeroInfoBoxService, public el: ElementRef) {
    this.el.nativeElement.style.cursor = 'help';
  }
  
  ngOnInit() {
  
  }
  
  @HostListener('mouseenter') onMouseEnter() {
    // this.dataService.hoverStart$.next(this.infoText);
    
    this.el.nativeElement.setAttribute('title', this.infoText);
  }
  
  @HostListener('mouseleave') onMouseLeave() {
    // this.dataService.hoverEnd$.next(this.infoText);
    
    this.el.nativeElement.setAttribute('title', undefined);
  }
  
  ngOnDestroy(): void {
    // this.dataService.hoverEnd$.next(this.infoText);
  }
  
}
