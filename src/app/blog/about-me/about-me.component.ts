import {
  ChangeDetectionStrategy,
  Component,
  OnInit
} from '@angular/core';

@Component({
  selector:        'app-about-me',
  templateUrl:     './about-me.component.html',
  styleUrls:       ['./about-me.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AboutMeComponent implements OnInit {
  
  constructor() {
  }
  
  ngOnInit() {
  }
  
}
