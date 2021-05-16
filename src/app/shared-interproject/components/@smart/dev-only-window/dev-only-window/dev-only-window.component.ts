import {
  ChangeDetectionStrategy,
  Component,
  OnInit
}                      from '@angular/core';
import { environment } from 'src/environments/environment';

@Component({
  selector:        'app-dev-only-window',
  templateUrl:     './dev-only-window.component.html',
  styleUrls:       ['./dev-only-window.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // encapsulation:   ViewEncapsulation.None
  
})
export class DevOnlyWindowComponent implements OnInit {
  show = !environment.production;
  
  constructor() { }
  
  ngOnInit(): void {
  }
  
}
