import {
  ChangeDetectionStrategy,
  Component,
  OnInit
}                               from '@angular/core';
import { UserLoginDataService } from '../user-login-data.service';

@Component({
  selector:        'app-login-page',
  templateUrl:     './login-page.component.html',
  styleUrls:       ['./login-page.component.scss'],
  providers:       [UserLoginDataService],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginPageComponent implements OnInit {
  
  constructor(public dataService: UserLoginDataService) { }
  
  ngOnInit(): void {
  }
  
}
