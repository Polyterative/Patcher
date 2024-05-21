import {
  ChangeDetectionStrategy,
  Component,
  OnInit
}                                from '@angular/core';
import { UserLoginDataService }  from './user-login-data.service';
import { SeoAndUtilsService }    from "src/app/features/backbone/seo-and-utils.service";
import { UserManagementService } from "src/app/features/backbone/login/user-management.service";
import { Router }                from "@angular/router";
import { SubManager }            from "src/app/shared-interproject/directives/subscription-manager";
import {
  take,
  takeUntil
}                                from "rxjs/operators";
import { SharedConstants }       from "src/app/shared-interproject/SharedConstants";
import { MatSnackBar }           from "@angular/material/snack-bar";


@Component({
  selector:        'app-login-page',
  templateUrl:     './login-page.component.html',
  styleUrls:       ['./login-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginPageComponent extends SubManager implements OnInit {
  
  constructor(
    public dataService: UserLoginDataService,
    private seoAndUtilsService: SeoAndUtilsService,
    public loginInteraction: UserManagementService,
    private router: Router,
    private snackBar: MatSnackBar
    
  ) {
    super();
    this.seoAndUtilsService.updateSeo({}, 'Login');
  
    // this.activated.url.subscribe(x => {
    //   console.log(x);
    //  
    // });
    //
  }
  
  ngOnInit(): void {
    // if user is logged in, redirect to user area
    this.loginInteraction.loggedUser$
      .pipe(
        take(1),
        takeUntil(this.destroy$)
      )
      .subscribe(x => {
        if (x) {
          SharedConstants.successLogin(this.snackBar);
          this.router.navigate(['/user/area']);
        }
      });
  }
  
}