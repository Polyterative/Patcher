import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
} from '@angular/core';
import { fadeInOnEnterAnimation } from 'angular-animations';
import { AnimationOptions } from 'ngx-lottie';


@Component({
  selector: 'app-lottie-container',
  templateUrl: './lottie-container.component.html',
  styleUrls: ['./lottie-container.component.scss'],
  animations: [
    fadeInOnEnterAnimation({
      duration: 1000,
      delay: 0,
      animateChildren: 'together',
      anchor: 'enter'
    })
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class LottieContainerComponent implements OnInit {
  @Input() options: AnimationOptions;
  @Input() styles: Partial<CSSStyleDeclaration> = {
    maxWidth: '31.25rem',
    margin:   '0 auto'
  };
  
  constructor() { }
  
  ngOnInit(): void {
  }
  
}