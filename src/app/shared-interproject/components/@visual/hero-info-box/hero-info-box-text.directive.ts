import {
  Directive,
  ElementRef,
  HostListener,
  Input
} from '@angular/core';


@Directive({
  selector: '[infoBox]',
  standalone: false
})
export class HeroInfoBoxTextDirective {
  @Input() infoText: string;
  
  constructor(public el: ElementRef) {
    this.el.nativeElement.style.cursor = 'help';
  }
  
  @HostListener('mouseenter') onMouseEnter() {
    this.el.nativeElement.setAttribute('title', this.infoText);
  }
  
  @HostListener('mouseleave') onMouseLeave() {
    this.el.nativeElement.setAttribute('title', undefined);
  }
  
}