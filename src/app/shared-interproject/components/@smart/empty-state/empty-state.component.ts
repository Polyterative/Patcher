import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import {
  ActivatedRoute,
  Router
} from '@angular/router';


/**
 *  SMART COMPONENT
 */
@Component({
  selector: 'app-empty-state',
  templateUrl: './empty-state.component.html',
  styleUrls: ['./empty-state.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule
  ]
})
export class EmptyStateComponent implements OnInit {
  @Input()
  backgroundImage: string;
  @Input() icon = 'search_off';
  @Input() title = 'No results found';
  @Input() copy = 'Try adjusting the filters or clearing the current search.';

  constructor(private route: ActivatedRoute, private router: Router) {

  }

  ngOnInit(): void {
    const providedImage = this.route.snapshot.data.backgroundImage;

    if (!this.backgroundImage) {
      if (providedImage) {
        this.backgroundImage = providedImage;
      } else {
        console.warn('Please provide path to background');
      }
    }


  }
}