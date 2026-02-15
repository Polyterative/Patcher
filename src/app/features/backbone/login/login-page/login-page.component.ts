import {
  ChangeDetectionStrategy,
  Component,
  OnInit
} from '@angular/core';
import { UserLoginDataService } from './user-login-data.service';
import { SeoAndUtilsService } from "src/app/features/backbone/seo-and-utils.service";
import { UserManagementService } from "src/app/features/backbone/login/user-management.service";
import {
  ActivatedRoute,
  Router
} from "@angular/router";
import { SubManager } from "src/app/shared-interproject/directives/subscription-manager";
import {
  take,
  takeUntil
} from "rxjs/operators";
import { SharedConstants } from "src/app/shared-interproject/SharedConstants";
import { MatSnackBar } from "@angular/material/snack-bar";
import { MatDialog } from '@angular/material/dialog';
import {
  InputDialogComponent,
  InputDialogDataInModel
} from 'src/app/shared-interproject/dialogs/input-dialog/input-dialog.component';
import {
  FormControl,
  Validators
} from '@angular/forms';
import { FormTypes } from 'src/app/shared-interproject/components/@smart/mat-form-entity/form-element-models';


@Component({
  selector:        'app-login-page',
  templateUrl:     './login-page.component.html',
  styleUrls:       ['./login-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginPageComponent extends SubManager implements OnInit {
  
  email: string = '';

  constructor(
    public dataService: UserLoginDataService,
    private seoAndUtilsService: SeoAndUtilsService,
    public loginInteraction: UserManagementService,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
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
    // Check if redirected after successful password reset
    this.route.queryParams.pipe(take(1)).subscribe(params => {
      if (params['resetSuccess'] === 'true') {
        this.snackBar.open('✅ Password reset successful! You can now log in with your new password.', undefined, {
          duration: 5000
        });
      }
    });
    
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
  
  /**
   * Opens the password reset dialog and handles the email submission.
   */
  openPasswordResetDialog(): void {
    const dialogData: InputDialogDataInModel = {
      title: 'Password Reset',
      description: 'Please enter your email to reset your password.',
      control: new FormControl('', [Validators.required, Validators.email]),
      type: FormTypes.EMAIL,
      label: 'Email'
    };
    
    const dialogRef = this.dialog.open(InputDialogComponent, {
      data: dialogData
    });
    
    dialogRef.afterClosed().subscribe((result: {
      result: string
    } | undefined) => {
      if (result?.result) {
        this.onRequestPasswordReset(result.result);
      }
    });
  }
  
  /**
   * Handles the password reset request form submission.
   * @param email The email address entered by the user.
   */
  onRequestPasswordReset(email: string): void {
    this.loginInteraction.resetPassword$(email).subscribe();
  }
  
}