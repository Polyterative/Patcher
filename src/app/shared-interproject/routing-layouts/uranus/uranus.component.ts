import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { fadeAnimation } from './fade.animation';


@Component({
  selector: 'app-uranus',
  templateUrl: './uranus.component.html',
  styleUrls: ['./uranus.component.scss'],
  // do not put OnPush here
  animations: [fadeAnimation],
  standalone: false
})
export class UranusComponent implements OnInit {
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