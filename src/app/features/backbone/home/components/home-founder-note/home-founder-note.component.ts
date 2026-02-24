import {
  Component,
  Input
} from '@angular/core';
import { HomeFounderNote } from '../../home-content.models';


@Component({
  selector: 'app-home-founder-note',
  templateUrl: './home-founder-note.component.html',
  styleUrls: ['./home-founder-note.component.scss'],
  standalone: false
})
export class HomeFounderNoteComponent {
  @Input() quote = '';
  @Input() author = '';
  @Input() role = '';
  @Input() stories: HomeFounderNote[] = [];
  
  get resolvedStories(): HomeFounderNote[] {
    if (this.stories.length) {
      return this.stories;
    }
    
    if (!this.quote) {
      return [];
    }
    
    return [
      {
        quote: this.quote,
        author: this.author,
        role: this.role
      }
    ];
  }
}