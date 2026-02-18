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
import { from } from 'rxjs';
import {
  catchError,
  switchMap,
  take,
  takeUntil,
  tap
} from 'rxjs/operators';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';
import { SupabaseService } from '../../../backend/supabase.service';
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
          padding: 20px;
          background-color: #f5f5f5;
      }

      .profile-card {
          max-width: 500px;
          width: 100%;
      }

      .welcome-text {
          margin: 16px 0;
          color: #666;
      }

      .full-width {
          width: 100%;
          margin-top: 8px;
      }

      .hint-text {
          font-size: 12px;
          color: #999;
          margin-top: -8px;
      }

      .button-spinner {
          display: inline-block;
          margin-right: 8px;
      }

      mat-card-actions {
          padding: 16px;
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
    private backend: SupabaseService,
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
    
    this.userManagementService.loggedUser$
      .pipe(
        take(1),
        switchMap(user => {
          if (!user) {
            throw new Error('User not authenticated');
          }
          
          // Update username in database
          return from(
            this.backend['supabase']
              .from('profiles')
              .update({username: newUsername})
              .eq('id', user.id)
          );
        }),
        tap(() => {
          SharedConstants.successCustom(this.snackBar, 'Profile completed successfully!');
          this.router.navigate(['/user/area']);
        }),
        catchError((error) => {
          console.error('Error saving username:', error);
          
          // Check for unique constraint violation
          if (error?.code === '23505' || error?.message?.includes('unique')) {
            SharedConstants.errorCustom(this.snackBar, 'Username already taken. Please choose another.');
          } else {
            SharedConstants.errorCustom(this.snackBar, 'Failed to save username. Please try again.');
          }
          
          this.saving = false;
          throw error;
        }),
        takeUntil(this.destroy$)
      )
      .subscribe();
  }
}