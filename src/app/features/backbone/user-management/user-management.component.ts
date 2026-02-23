import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
} from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';
import { UserManagementService } from 'src/app/features/backbone/login/user-management.service';
import { SeoAndUtilsService } from '../seo-and-utils.service';


/** Cross-field validator: confirm password must match new password */
export function confirmMatchesNewValidator(): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const newPwd = group.get('newPassword')?.value;
    const confirm = group.get('confirmPassword')?.value;
    if (newPwd && confirm && newPwd !== confirm) {
      return {confirmMismatch: true};
    }
    return null;
  };
}


@Component({
  selector: 'app-user-management',
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class UserManagementComponent implements OnInit {
  @Input() ignoreSeo: boolean = false;
  
  editingUsername = false;
  usernameControl = new FormControl('', [
    Validators.required,
    Validators.minLength(3),
    Validators.maxLength(30),
    Validators.pattern(/^[a-zA-Z0-9_-]+$/)
  ]);
  
  passwordForm = new FormGroup(
    {
      newPassword: new FormControl('', [Validators.required, Validators.minLength(8)]),
      confirmPassword: new FormControl('', [Validators.required])
    },
    {
      validators: [
        confirmMatchesNewValidator()
      ]
    }
  );
  
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
  
  submitPasswordChange(): void {
    if (this.passwordForm.invalid) {
      return;
    }
    const {newPassword} = this.passwordForm.value;
    this.userManagementService.changePassword$.next({newPassword: newPassword!});
    this.passwordForm.reset();
  }
  
  beginUsernameEdit(currentUsername: string): void {
    this.editingUsername = true;
    this.usernameControl.setValue(currentUsername);
    this.usernameControl.markAsPristine();
    this.usernameControl.markAsUntouched();
  }
  
  cancelUsernameEdit(): void {
    this.editingUsername = false;
    this.usernameControl.reset('');
  }
  
  submitUsernameChange(currentUsername: string): void {
    const nextUsername = this.usernameControl.value?.trim() || '';
    if (this.usernameControl.invalid || nextUsername === currentUsername) {
      return;
    }
    
    this.userManagementService.updateUsername$(nextUsername).subscribe({
      next: () => this.cancelUsernameEdit()
    });
  }
  
}