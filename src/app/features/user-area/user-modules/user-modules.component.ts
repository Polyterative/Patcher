import {
  ChangeDetectionStrategy,
  Component,
  OnInit
} from '@angular/core';

@Component({
  selector:        'app-user-modules',
  templateUrl:     './user-modules.component.html',
  styleUrls:       ['./user-modules.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserModulesComponent implements OnInit {
  
  constructor() { }
  
  ngOnInit(): void {
  }
  
}
