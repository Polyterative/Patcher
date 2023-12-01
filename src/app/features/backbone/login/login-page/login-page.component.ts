import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { UserManagementService } from '../user-management.service';
import { UserLoginDataService } from './user-login-data.service';

@Component({
  selector:        'app-login-page',
  templateUrl:     './login-page.component.html',
  styleUrls:       ['./login-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginPageComponent implements OnInit {
  
  constructor(
    public activated: ActivatedRoute,
    public dataService: UserLoginDataService,
    public integrationService: UserManagementService
  ) {
  
    // this.activated.url.subscribe(x => {
    //   console.log(x);
    //  
    // });
    //
  }
  
  ngOnInit(): void {
  }
  
}
