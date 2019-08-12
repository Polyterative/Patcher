import {
  ChangeDetectionStrategy,
  Component
} from '@angular/core';

@Component({
  selector:        'app-home',
  templateUrl:     './home.component.html',
  styleUrls:       ['./home.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent {
  words = [
    '👩‍💻 developer',
    '🎸 guitar player',
    '📸 photographer',
    '🎹 electronic music producer',
    '👽 human'
  ];
  
}
