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
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeroContentCardComponent {
  @Input()
  titleBig: string = '';
  @Input()
  titleNormal: string = '';
  @Input()
  top = false;
  @Input()
  bottom = false;
  @Input()
  description: string = '';
  @Input()
  icon: string = '';
  
}
