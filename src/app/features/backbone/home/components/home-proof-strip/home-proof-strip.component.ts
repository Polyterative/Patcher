import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { BrandPrimaryButtonComponent } from 'src/app/shared-interproject/components/@visual/brand-primary-button/brand-primary-button.component';
import { HomeCtaClick, HomeProofFigure } from '../../home-content.models';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-home-proof-strip',
  templateUrl: './home-proof-strip.component.html',
  styleUrls: ['./home-proof-strip.component.scss'],
  standalone: true,
  imports: [BrandPrimaryButtonComponent]
})
export class HomeProofStripComponent {
  /** Live catalogue figures; the static "€0" cell always renders so the strip is never empty. */
  @Input() figures: HomeProofFigure[] = [];
  @Output() readonly ctaClicked = new EventEmitter<HomeCtaClick>();
}
