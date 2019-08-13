import {
  ChangeDetectionStrategy,
  Component,
  OnInit
} from '@angular/core';

@Component({
  selector:        'app-instagram-router',
  templateUrl:     './instagram-router.component.html',
  styleUrls:       ['./instagram-router.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InstagramRouterComponent implements OnInit {
  
  constructor() {
  }
  
  ngOnInit() {
  }
  
}
