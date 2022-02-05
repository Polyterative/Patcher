import {
  ChangeDetectionStrategy,
  Component,
  Input
}                                 from '@angular/core';
import { fadeInOnEnterAnimation } from 'angular-animations';

/**
 *  UI ONLY COMPONENT
 */
@Component({
  selector:        'lib-hero-content-card',
  templateUrl:     './hero-content-card.component.html',
  styleUrls:       ['./hero-content-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations:      [
    fadeInOnEnterAnimation(
      {
        anchor:   'title',
        duration: 500,
        delay:    100
      }
    ),
    fadeInOnEnterAnimation(
      {
        anchor:   'description',
        duration: 1000,
        delay:    500
      }
    )
  ]
})
export class HeroContentCardComponent {
  @Input() titleBig: string;
  @Input() titleNormal: string;
  @Input() top = false;
  @Input() bottom = false;
  @Input() description: string;
  @Input() descriptionAlign: 'alignTextStart' | 'alignTextEnd' = 'alignTextStart';
  @Input() showHelpButton = false;
  @Input() icon: string;
  @Input() titleStyle?: { [param: string]: any };
}
