import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  Input,
  OnInit,
  PLATFORM_ID
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { animate, style, transition, trigger } from '@angular/animations';
import { AnimationOptions } from 'ngx-lottie';


@Component({
  selector: 'app-lottie-container',
  templateUrl: './lottie-container.component.html',
  styleUrls: ['./lottie-container.component.scss'],
  animations: [
    trigger('enter', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('1000ms ease', style({ opacity: 1 }))
      ])
    ])
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
  readonly isBrowser: boolean;
  
  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }
  
  ngOnInit(): void {
  }
  
}
