import {
  ChangeDetectionStrategy,
  Component,
  OnInit
}            from '@angular/core';
import build from 'src/build';

@Component({
  selector:        'app-build-info',
  templateUrl:     './build-info.component.html',
  styleUrls:       ['./build-info.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BuildInfoComponent implements OnInit {
  data = build;
  
  constructor() { }
  
  ngOnInit(): void {
  }
  
}
