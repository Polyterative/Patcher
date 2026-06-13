import {
  ChangeDetectionStrategy,
  Component,
  HostBinding,
  Input,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { animate, style, transition, trigger } from '@angular/animations';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { HeroContentCardHeadIconComponent } from './hero-contenst-card-head-icon/hero-content-card-head-icon.component';
import {
  DEFAULT_AUTO_COMPACT_TITLE_SUB_LENGTH,
  shouldCompactHeroTitleSub
} from './hero-title-layout.utils';


/**
 *  UI ONLY COMPONENT
 */
@Component({
  selector: 'lib-hero-content-card',
  templateUrl: './hero-content-card.component.html',
  styleUrls: ['./hero-content-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('title', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('500ms 100ms ease', style({ opacity: 1 }))
      ])
    ]),
    trigger('description', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('1000ms 500ms ease', style({ opacity: 1 }))
      ])
    ])
  ],
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatTooltipModule,
    HeroContentCardHeadIconComponent
  ]
})
export class HeroContentCardComponent {
  @Input() titleBig: string;
  @Input() titleNormal: string;
  @Input() titleSub: string;
  @Input() top = false;
  @Input() bottom = false;
  @Input() sidesPadding = true;
  @Input() vertPadding = true;
  @Input() description: string;
  @Input() descriptionAlign: 'alignTextStart' | 'alignTextEnd' = 'alignTextEnd';
  @Input() showHelpButton = false;
  @Input() icon: string;
  @Input() compactTitleSub = false;
  @Input() autoCompactTitleSub = false;
  @Input() autoCompactTitleSubLength = DEFAULT_AUTO_COMPACT_TITLE_SUB_LENGTH;

  @HostBinding('class.hero-content-card--detail-heading')
  get detailHeading(): boolean {
    return !!this.titleBig && !!this.titleSub;
  }

  get compactTitleSubActive(): boolean {
    return this.compactTitleSub || (
      this.autoCompactTitleSub
      && shouldCompactHeroTitleSub(this.titleSub, {
        compactAtLength: this.autoCompactTitleSubLength
      })
    );
  }
}
