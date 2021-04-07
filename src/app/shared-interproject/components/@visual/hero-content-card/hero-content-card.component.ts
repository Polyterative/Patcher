import {
    animate,
    style,
    transition,
    trigger
} from '@angular/animations';
import {
    ChangeDetectionStrategy,
    Component,
    Input
} from '@angular/core';

/**
 *  UI ONLY COMPONENT
 */
@Component({
  selector:        'app-hero-content-card',
  templateUrl:     './hero-content-card.component.html',
  styleUrls:       ['./hero-content-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations:      [
    trigger('fadeInOut', [
      transition(':enter', [   // :enter is alias to 'void => *'
        style({
          opacity: 0,
          // height:  0.01
        }),
        animate('225ms cubic-bezier(0.0, 0.0, 0.2, 1)'),
        style(
          {opacity: 1}
        )
      ]),
      transition(':leave', [   // :leave is alias to '* => void'
        animate('75ms cubic-bezier(0.4, 0.0, 1, 1)'),
        style(
          {opacity: 0}
        )
      ])
    ])
  ]

})
export class HeroContentCardComponent {
  @Input()
  title: string = '';
  @Input()
  top = false;
  @Input()
  bottom = false;
  @Input()
  description: string = '';
  @Input()
  icon: string = '';

}
