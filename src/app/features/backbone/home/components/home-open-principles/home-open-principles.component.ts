import {
  ChangeDetectionStrategy,
  Component,
  Input
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { HomePrincipleCard } from '../../home-content.models';
import { buildHomeTextSegments } from '../../home-text-segments.util';


@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-home-open-principles',
  templateUrl: './home-open-principles.component.html',
  styleUrls: ['./home-open-principles.component.scss'],
  standalone: true,
  imports: [MatIconModule]
})
export class HomeOpenPrinciplesComponent {
  @Input() sectionTitle = '';
  @Input() sectionIntro = '';
  @Input() cards: HomePrincipleCard[] = [];
  
  getCardDescriptionSegments(card: HomePrincipleCard) {
    return buildHomeTextSegments(card.description, card.keywords ?? []);
  }
}