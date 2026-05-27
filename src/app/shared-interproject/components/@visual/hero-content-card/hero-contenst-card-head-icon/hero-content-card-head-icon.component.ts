import {
  ChangeDetectionStrategy,
  Component,
  Input
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';


@Component({
  selector: 'app-hero-content-card-head-icon',
  templateUrl: './hero-content-card-head-icon.component.html',
  styleUrls: ['./hero-content-card-head-icon.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [MatIconModule]
})
export class HeroContentCardHeadIconComponent {
  @Input()
  icon: string;
}