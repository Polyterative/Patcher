import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
}                           from '@angular/core';
import { AnimationOptions } from 'ngx-lottie';

@Component({
  selector:        'app-lottie-container',
  templateUrl:     './lottie-container.component.html',
  styleUrls:       ['./lottie-container.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LottieContainerComponent implements OnInit {
  @Input() options: AnimationOptions;
  @Input() styles: Partial<CSSStyleDeclaration> = {
    maxWidth: '500px',
    margin:   '0 auto'
  };
  
  constructor() { }
  
  ngOnInit(): void {
  }
  
}
