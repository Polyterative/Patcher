import { ChangeDetectionStrategy, Component, Input, OnInit } from '@angular/core';
import { environment } from 'src/environments/environment';

@Component({
  selector:        'app-dev-only-window',
  templateUrl:     './dev-only-window.component.html',
  styleUrls:       ['./dev-only-window.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
  // 
  
})
export class DevOnlyWindowComponent implements OnInit {
  show = !environment.production;
  
  @Input() pre = false;
  
  constructor() { }
  
  ngOnInit(): void {
  }
  
}
