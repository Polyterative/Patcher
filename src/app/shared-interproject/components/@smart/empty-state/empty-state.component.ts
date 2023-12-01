import { ChangeDetectionStrategy, Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

/**
 *  SMART COMPONENT
 */
@Component({
  selector:        'app-empty-state',
  templateUrl:     './empty-state.component.html',
  styleUrls:       ['./empty-state.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EmptyStateComponent implements OnInit {
  @Input()
  backgroundImage: string;

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
