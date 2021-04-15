import {
  ChangeDetectionStrategy,
  Component,
  OnInit
}                               from '@angular/core';
import { UserLoginDataService } from '../user-login-data.service';

@Component({
  selector:        'app-login-email',
  templateUrl:     './login-email.component.html',
  styleUrls:       ['./login-email.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginEmailComponent implements OnInit {
  
  constructor(public dataService: UserLoginDataService) { }
  
  ngOnInit(): void {
  }
  
}
