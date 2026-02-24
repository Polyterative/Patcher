import {
  Component,
  Input
} from '@angular/core';
import { HomeHeroContent } from '../../home-content.models';
import { buildHomeTextSegments } from '../../home-text-segments.util';


@Component({
  selector: 'app-home-experience-hero',
  templateUrl: './home-experience-hero.component.html',
  styleUrls: ['./home-experience-hero.component.scss'],
  standalone: false
})
export class HomeExperienceHeroComponent {
  @Input() content: HomeHeroContent = {
    eyebrow: '',
    title: '',
    subtitle: '',
    mainVisual: {
      src: '',
      alt: ''
    }
  };
  
  getSubtitleSegments() {
    return buildHomeTextSegments(this.content.subtitle, this.content.subtitleKeywords ?? []);
  }
}
