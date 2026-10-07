import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { HomeCtaClick } from '../../home-content.models';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-home-closing-cta',
  templateUrl: './home-closing-cta.component.html',
  styleUrls: ['./home-closing-cta.component.scss'],
  standalone: true,
  imports: [MatIconModule, RouterLink]
})
export class HomeClosingCtaComponent {
  @Input() isSignedIn = false;
  @Output() readonly ctaClicked = new EventEmitter<HomeCtaClick>();
}
