import {
  Component,
  Input
} from '@angular/core';
import { HomePrincipleCard } from '../../home-content.models';
import { buildHomeTextSegments } from '../../home-text-segments.util';


@Component({
  selector: 'app-home-open-principles',
  templateUrl: './home-open-principles.component.html',
  styleUrls: ['./home-open-principles.component.scss'],
  standalone: false
})
export class HomeOpenPrinciplesComponent {
  @Input() sectionTitle = '';
  @Input() sectionIntro = '';
  @Input() cards: HomePrincipleCard[] = [];
  
  getCardDescriptionSegments(card: HomePrincipleCard) {
    return buildHomeTextSegments(card.description, card.keywords ?? []);
  }
}