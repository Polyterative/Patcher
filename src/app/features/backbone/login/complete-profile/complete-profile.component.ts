import {
  Component,
  OnInit
} from '@angular/core';
import {
  UntypedFormControl,
  Validators
} from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { NEVER } from 'rxjs';
import {
  catchError,
  take,
  takeUntil,
  tap
} from 'rxjs/operators';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';
import { FormTypes } from 'src/app/shared-interproject/components/@smart/mat-form-entity/form-element-models';
import { IMatFormEntityConfig } from 'src/app/shared-interproject/components/@smart/mat-form-entity/mat-form-entity.component';
import { UserManagementService } from '../user-management.service';


/**
 * Profile Completion Component
 *
 * This component is shown to new OAuth users who need to set their username
 * after signing in with a social provider (Google, Apple, GitHub, etc.)
 *
 * Flow:
 * 1. OAuth user signs in for the first time
 * 2. System creates temporary username
 * 3. User is redirected here to choose a permanent username
 * 4. After setting username, user proceeds to main app
 */
@Component({
  selector: 'app-complete-profile',
  template: `
    <div class="complete-profile-container">
      <mat-card class="profile-card">
        <mat-card-header>
          <mat-card-title>Complete Your Profile</mat-card-title>
          <mat-card-subtitle>Choose a username to get started</mat-card-subtitle>
        </mat-card-header>
        
        <mat-card-content>
          <p class="welcome-text">
            Welcome! Please choose a username for your account.
          </p>
          
          <lib-mat-form-entity
            class="full-width"
            [dataPack]="usernameField"
            formFieldAppearanceType="outline"
            (enterPressed)="saveUsername()"
          ></lib-mat-form-entity>
        </mat-card-content>
        
        <mat-card-actions align="end">
          <button
            mat-raised-button
            color="primary"
            (click)="saveUsername()"
            [disabled]="usernameControl.invalid || saving"
          >
            <mat-spinner *ngIf="saving" diameter="20" class="button-spinner"></mat-spinner>
            <span *ngIf="!saving">Continue</span>
          </button>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [`
       .complete-profile-container {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: var(--app-viewport-height, 100vh);
            padding: calc(env(safe-area-inset-top) + 1.25rem) 1.25rem calc(env(safe-area-inset-bottom) + var(--app-keyboard-inset-bottom, 0px) + 1.25rem);
            background:
              radial-gradient(circle at top left, rgba(61, 115, 188, 0.08), transparent 24rem),
              linear-gradient(180deg, rgba(247, 250, 253, 0.96), rgba(255, 255, 255, 0.99));
            box-sizing: border-box;
        }

       .profile-card {
           max-width: 31.25rem;
           width: 100%;
           border: 1px solid rgba(34, 75, 117, 0.12);
           border-radius: 1rem;
           background: rgba(255, 255, 255, 0.96);
           box-shadow: 0 0.5rem 1.5rem rgba(15, 30, 52, 0.08);
       }

       mat-card-header {
           padding-bottom: 0.25rem;
       }

       mat-card-title {
           color: #163f70;
       }

       mat-card-subtitle {
           color: rgba(24, 37, 53, 0.68);
       }

       .welcome-text {
           margin: 1rem 0;
           color: rgba(24, 37, 53, 0.78);
       }

       .full-width {
           width: 100%;
            margin-top: 0.5rem;
       }

       .hint-text {
           font-size: 0.8rem;
           color: rgba(24, 37, 53, 0.62);
           margin-top: -0.25rem;
           line-height: 1.5;
       }

       .button-spinner {
           display: inline-block;
           margin-right: 0.5rem;
      }

       mat-card-actions {
           padding: 0 1rem 1rem;
       }

       button[mat-raised-button] {
           min-height: 2.75rem;
           padding-inline: 1rem;
           border-radius: 62.4375rem;
       }
   `],
  standalone: false
})
export class CompleteProfileComponent extends SubManager implements OnInit {
  readonly usernameControl = new UntypedFormControl('', [
    Validators.required,
    Validators.minLength(3),
    Validators.maxLength(20),
    Validators.pattern(/^[a-zA-Z0-9_]+$/)
  ]);

  readonly usernameField: IMatFormEntityConfig = {
    type: FormTypes.TEXT,
    control: this.usernameControl,
    label: 'Username',
    code: 'complete-profile-username',
    flex: '100%',
    hint: 'Choose a unique username between 3-20 characters. Use only letters, numbers, and underscores.',
    iconL1: 'person',
    ergonomics: {
      autofocus: true,
      enterkeyhint: 'done'
    }
  };
  
  saving = false;
  
  constructor(
    private userManagementService: UserManagementService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    super();
  }
  
  ngOnInit(): void {
    // Check if user is already authenticated
    this.userManagementService.loggedUserFullProfile$
      .pipe(take(1))
      .subscribe(user => {
        if (!user) {
          // Not authenticated, redirect to login
          this.router.navigate(['/auth/login']);
        } else if (user.username && !user.username.startsWith('user_')) {
          // Already has a username, redirect to main app
          this.router.navigate(['/user/area']);
        }
      });
  }
  
  saveUsername(): void {
    if (this.usernameControl.invalid || this.saving) {
      return;
    }
    
    this.saving = true;
    const newUsername = this.usernameControl.value!.trim();
    
    this.userManagementService.updateUsername$(newUsername).pipe(
      tap(() => {
        this.router.navigate(['/user/area']);
      }),
      catchError((error) => {
        console.error('Error saving username:', error);
        
        if (error?.code === '23505' || error?.message?.includes('unique') || error?.message?.includes('already taken')) {
          SharedConstants.errorCustom(this.snackBar, 'That username is already taken — pick a different one.');
        } else {
          SharedConstants.errorCustom(this.snackBar, 'Username not saved — the database returned an error. Try again.');
        }
        
        this.saving = false;
        return NEVER;
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      complete: () => { this.saving = false; }
    });
  }
}
