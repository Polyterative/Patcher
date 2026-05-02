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
  
  getSubtitleLines() {
    return this.content.subtitle
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
  }

  getSubtitleSegments(line: string) {
    return buildHomeTextSegments(line, this.content.subtitleKeywords ?? []);
  }
}
