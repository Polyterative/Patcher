import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
} from '@angular/core';
import {
  FormControl,
  Validators
} from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { UserManagementService } from 'src/app/features/backbone/login/user-management.service';
import { SeoAndUtilsService } from '../seo-and-utils.service';
import {
  filter,
  take
} from 'rxjs/operators';
import { RichUserModel } from 'src/app/features/backend/supabase.service';
import {
  InputDialogComponent,
  InputDialogDataInModel,
  InputDialogDataOutModel
} from 'src/app/shared-interproject/dialogs/input-dialog/input-dialog.component';
import { FormTypes } from 'src/app/shared-interproject/components/@smart/mat-form-entity/form-element-models';


@Component({
  selector: 'app-user-management',
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class UserManagementComponent implements OnInit {
  @Input() ignoreSeo: boolean = false;
  
  constructor(
    public userManagementService: UserManagementService,
    readonly seoAndUtilsService: SeoAndUtilsService,
    private dialog: MatDialog
  ) { }
  
  ngOnInit(): void {
    if (!this.ignoreSeo) {
      this.seoAndUtilsService.updateSeo({
        title:       'Account Management',
        description: 'Personal account management.'
      }, 'Account Management');
    }
  }
  
  changeUsername(): void {
    this.userManagementService.loggedUserFullProfile$
      .pipe(
        filter((userProfile): userProfile is RichUserModel => userProfile !== undefined),
        take(1)
      )
      .subscribe((userProfile) => {
        const usernameControl = new FormControl(userProfile.username, [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(30),
          Validators.pattern(/^[a-zA-Z0-9_-]+$/)
        ]);
        
        const dialogData: InputDialogDataInModel = {
          title: 'Change Display Name',
          description: 'Enter your new display name (3-30 characters). Only letters, numbers, hyphens (-), and underscores (_) are allowed. No spaces.',
          control: usernameControl,
          type: FormTypes.TEXT,
          label: 'New Display Name'
        };
        
        const dialogRef = this.dialog.open<InputDialogComponent, InputDialogDataInModel, InputDialogDataOutModel>(
          InputDialogComponent,
          {
            data: dialogData,
            width: '400px'
          }
        );
        
        dialogRef.afterClosed().subscribe((result) => {
          if (result?.result && result.result !== userProfile.username) {
            this.userManagementService.updateUsername$(result.result).subscribe();
          }
        });
      });
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
          // resetPassword$ already handles success/error messages
          this.userManagementService.resetPassword$(email).subscribe();
        } else {
          // No email - this should never happen but handle edge case
          console.error('No email found for the logged-in user.');
        }
      });
  }
}