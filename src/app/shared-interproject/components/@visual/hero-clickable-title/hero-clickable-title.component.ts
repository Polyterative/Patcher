import {
  ChangeDetectionStrategy,
  Component,
  Input
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { RouterModule } from '@angular/router';


@Component({
  selector: 'app-hero-clickable-title',
  templateUrl: './hero-clickable-title.component.html',
  styleUrls: ['./hero-clickable-title.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, MatCardModule, RouterModule]
})
export class HeroClickableTitleComponent {
 @Input() link: string | any[] = undefined;
 @Input() textSize: number | undefined = undefined;
}