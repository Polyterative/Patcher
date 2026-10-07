import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { HomeCtaClick, HomeProofFigure } from '../../home-content.models';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-home-proof-strip',
  templateUrl: './home-proof-strip.component.html',
  styleUrls: ['./home-proof-strip.component.scss'],
  standalone: true,
  imports: [MatIconModule, RouterLink]
})
export class HomeProofStripComponent {
  /** Live catalogue figures; the static "€0" cell always renders so the strip is never empty. */
  @Input() figures: HomeProofFigure[] = [];
  @Output() readonly ctaClicked = new EventEmitter<HomeCtaClick>();
}
