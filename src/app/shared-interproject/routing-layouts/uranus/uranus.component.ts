import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { fadeAnimation } from './fade.animation';

@Component({
  selector:    'app-uranus',
  templateUrl: './uranus.component.html',
  styleUrls:   ['./uranus.component.scss'],
  // do not put OnPush here
  animations: [fadeAnimation]
})
export class UranusComponent {
  public title?: string;
  
  constructor(private route: ActivatedRoute, private router: Router) {
  
  }
  
  // public width: string = this.route.snapshot.data.width;
  
  ngOnInit(): void {
    const providedTitle = this.route.snapshot.data.title;
    
    if (!this.title) {
      if (providedTitle) {
        this.title = providedTitle;
      } else {
        // console.warn('No title provided');
      }
    }
    
    if (!this.title) {
      if (providedTitle) {
        this.title = providedTitle;
      } else {
        // console.warn('No title provided');
      }
    }
    
    
  }
}
