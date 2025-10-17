import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
} from '@angular/core';
import { UserManagementService } from 'src/app/features/backbone/login/user-management.service';
import { SeoAndUtilsService } from '../seo-and-utils.service';
import {
  filter,
  take
} from 'rxjs/operators';
import { RichUserModel } from 'src/app/features/backend/supabase.service';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';


@Component({
  selector:        'app-user-management',
  templateUrl:     './user-management.component.html',
  styleUrls:       ['./user-management.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserManagementComponent implements OnInit {
  @Input() ignoreSeo: boolean = false;
  
  constructor(
    public userManagementService: UserManagementService,
    readonly seoAndUtilsService: SeoAndUtilsService
  ) { }
  
  ngOnInit(): void {
    if (!this.ignoreSeo) {
      this.seoAndUtilsService.updateSeo({
        title:       'Account Management',
        description: 'Personal account management.'
      }, 'Account Management');
    }
  }
  
  resetPassword(): void {
    this.userManagementService.loggedUserFullProfile$
      .pipe(
        filter((userProfile): userProfile is RichUserModel => userProfile !== undefined),
        take(1)
      )
      .subscribe((userProfile) => {
        const email = userProfile.email;
        if (email) {
          this.userManagementService.resetPassword$(email).subscribe({
            next: () => {
              SharedConstants.successCustom(this.userManagementService.snackBar, SharedConstants.messages.passwordResetEmailSent);
            },
            error: (err) => {
              SharedConstants.errorCustom(this.userManagementService.snackBar, SharedConstants.messages.passwordResetEmailFailed);
              console.error('Failed to send password reset email:', err);
            }
          });
        } else {
          SharedConstants.errorCustom(this.userManagementService.snackBar, SharedConstants.messages.noEmailFound);
          console.error('No email found for the logged-in user.');
        }
      });
  }
}
