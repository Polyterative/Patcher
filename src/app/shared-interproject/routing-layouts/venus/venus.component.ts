import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { fadeAnimation } from './fade.animation';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector:    'app-venus',
  templateUrl: './venus.component.html',
  styleUrls:   ['./venus.component.scss'],
  // do not put OnPush here
  animations: [fadeAnimation],
  standalone: false
})
export class VenusComponent implements OnInit {
  public title?: string;

  constructor(private route: ActivatedRoute) {

  }

  ngOnInit(): void {
    const providedTitle = this.route.snapshot.data.title;

    if (!this.title) {
      if (providedTitle) {
        this.title = providedTitle;
      }
    }


  }
}
