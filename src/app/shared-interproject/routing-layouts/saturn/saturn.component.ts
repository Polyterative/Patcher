import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { fadeAnimation } from './fade.animation';

@Component({
  selector:    'app-saturn',
  templateUrl: './saturn.component.html',
  styleUrls:   ['./saturn.component.scss'],
  // do not put OnPush here
  animations: [fadeAnimation]
})
export class SaturnComponent implements OnInit {
  title?: string;

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
