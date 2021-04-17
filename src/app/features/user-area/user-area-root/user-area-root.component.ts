import {
  ChangeDetectionStrategy,
  Component,
  OnInit
} from '@angular/core';

@Component({
  selector:        'app-user-area-root',
  templateUrl:     './user-area-root.component.html',
  styleUrls:       ['./user-area-root.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserAreaRootComponent implements OnInit {
  
  constructor() { }
  
  ngOnInit(): void {
  }
  
}
