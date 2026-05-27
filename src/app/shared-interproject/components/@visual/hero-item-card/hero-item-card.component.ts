import {
  ChangeDetectionStrategy,
  Component
} from '@angular/core';
import { CleanCardComponent } from '../clean-card/clean-card.component';


@Component({
  selector: 'lib-hero-item-card',
  templateUrl: './hero-item-card.component.html',
  styleUrls: ['./hero-item-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CleanCardComponent]
})
export class HeroItemCardComponent {}