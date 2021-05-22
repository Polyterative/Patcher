import { Component }     from '@angular/core';
import {
  ActivatedRoute,
  Router
}                        from '@angular/router';
import { fadeAnimation } from './fade.animation';

@Component({
  selector:    'app-saturn',
  templateUrl: './saturn.component.html',
  styleUrls:   ['./saturn.component.scss'],
  // do not put OnPush here
  animations: [fadeAnimation]
})
export class SaturnComponent {
  title?: string;

  constructor(private route: ActivatedRoute, private router: Router) {

  }

  ngOnInit(): void {
    const providedTitle = this.route.snapshot.data.title;

    if (!this.title) {
      if (providedTitle) {
        this.title = providedTitle;
      } else {
        // console.warn('No title provided');
      }
    }

  }
}
