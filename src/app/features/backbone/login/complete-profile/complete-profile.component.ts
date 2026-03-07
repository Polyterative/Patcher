import {
  Component,
  OnInit
} from '@angular/core';
import {
  FormControl,
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
          
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Username</mat-label>
            <input
              matInput
              [formControl]="usernameControl"
              placeholder="Enter your username"
              (keyup.enter)="saveUsername()"
            >
            <mat-error *ngIf="usernameControl.hasError('required')">
              Username is required
            </mat-error>
            <mat-error *ngIf="usernameControl.hasError('minlength')">
              Username must be at least 3 characters
            </mat-error>
            <mat-error *ngIf="usernameControl.hasError('pattern')">
              Username can only contain letters, numbers, and underscores
            </mat-error>
          </mat-form-field>
          
          <p class="hint-text">
            Choose a unique username between 3-20 characters.
            You can use letters, numbers, and underscores.
          </p>
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
          min-height: 100vh;
          padding: 1.25rem;
          background-color: #f5f5f5;
      }

      .profile-card {
          max-width: 31.25rem;
          width: 100%;
      }

      .welcome-text {
          margin: 1rem 0;
          color: #666;
      }

      .full-width {
          width: 100%;
          margin-top: 0.5rem;
      }

      .hint-text {
          font-size: 0.75rem;
          color: #999;
          margin-top: -0.5rem;
      }

      .button-spinner {
          display: inline-block;
          margin-right: 0.5rem;
      }

      mat-card-actions {
          padding: 1rem;
      }
  `],
  standalone: false
})
export class CompleteProfileComponent extends SubManager implements OnInit {
  usernameControl = new FormControl('', [
    Validators.required,
    Validators.minLength(3),
    Validators.maxLength(20),
    Validators.pattern(/^[a-zA-Z0-9_]+$/)
  ]);
  
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