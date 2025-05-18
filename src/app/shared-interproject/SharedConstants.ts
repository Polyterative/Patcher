import {
  EMPTY,
  Observable
} from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MatSnackBar } from "@angular/material/snack-bar";
import { fadeInOnEnterAnimation } from "angular-animations";


export class SharedConstants {
  static messages = {
    passwordResetEmailSent: 'We’ve sent you an email to reset your password. Please check your inbox.',
    passwordResetRequestReceived: 'Your password reset request has been received. Check your email for further instructions.',
    passwordResetEmailFailed: 'We couldn’t send the password reset email. In may be that you have already requested a password reset. Please check your inbox.',
    noEmailFound: 'We couldn’t find an email associated with your account. Please contact support.',
    overEmailSendRateLimit: 'You’ve reached the limit for password reset requests. Please wait a while before trying again.',
    operationFailed: '❌ Something went wrong. Please try again.',
    dataNotSaved: '❌ Unable to save your data. Please try again.',
    loginFailed: '❌ Login failed. Please check your credentials and try again.',
    signupFailed: '❌ Signup failed. Please check your details and try again.',
    resetPassword: {
      invalidToken: 'Invalid or missing token.',
      invalidRedirect: 'Invalid redirect URL.',
      passwordMismatch: 'Passwords do not match.',
      resetFailed: 'Failed to reset password. Please try again.',
      resetPasswordTitle: 'Reset Your Password',
      invalidTokenTitle: 'Invalid or Missing Token',
      invalidTokenDescription: 'It seems like you have opened this page without a valid reset token. Please check your email for the reset link or request a new one.',
      goToLogin: 'Go to Login',
      resetPasswordButton: 'Reset Password'
    }
  };
  
  static confirmMail(snackBar: MatSnackBar) {
    snackBar.open('Please confirm your email address before logging in.', undefined, {duration: 5000});
  }
  
  static successSignup(snackBar: MatSnackBar) {
    snackBar.open('✅ Signup successful! Welcome aboard!', undefined, {duration: 3000});
  }
  
  static showSuccessUpdate(snackBar: MatSnackBar) {
    snackBar.open('✅ Your data has been successfully updated.', undefined, {duration: 1000});
  }
  
  static successCustom(snackBar: MatSnackBar, msg?: string) {
    snackBar.open(`✅ ${ msg }`, undefined, {duration: 4000});
  }
  
  static successDelete(snackBar: MatSnackBar) {
    snackBar.open('✅ Successfully deleted.', undefined, {duration: 4000});
  }
  
  static successSave(snackBar: MatSnackBar) {
    snackBar.open('✅ Your data has been saved successfully.', undefined, {duration: 4000});
  }
  
  static successSaveShort(snackBar: MatSnackBar) {
    snackBar.open('✅ Data saved.', undefined, {duration: 1000});
  }
  
  static successLogin(snackBar: MatSnackBar) {
    snackBar.open('✅ Welcome back!', undefined, {duration: 2000});
  }
  
  static successLogout(snackBar: MatSnackBar) {
    snackBar.open('✅ You have been logged out.', undefined, {duration: 2000});
  }

  static errorHandlerSignup<T>(snackBar: MatSnackBar, msg?: string) {
    return catchError<T, Observable<never>>(() => {
      snackBar.open(`${ SharedConstants.messages.signupFailed } ${ msg }`, undefined, {duration: 8000});
      return EMPTY;
    });
  }

  static errorHandlerLogin<T>(snackBar: MatSnackBar, msg?: string) {
    return catchError<T, Observable<never>>(() => {
      snackBar.open(`${ SharedConstants.messages.loginFailed } ${ msg }`, undefined, {duration: 8000});
      return EMPTY;
    });
  }

  static errorHandlerData<T>(snackBar: MatSnackBar) {
    return catchError<T, Observable<never>>(() => {
      snackBar.open(SharedConstants.messages.dataNotSaved, undefined, {duration: 8000});
      return EMPTY;
    });
  }

  static errorHandlerOperation<T>(snackBar: MatSnackBar) {
    return catchError<T, Observable<never>>(() => {
      snackBar.open(SharedConstants.messages.operationFailed, undefined, {duration: 8000});
      return EMPTY;
    });
  }
  
  static errorSignup<T>(snackBar: MatSnackBar, msg?: string) {
    snackBar.open(`${ SharedConstants.messages.signupFailed } ${ msg }`, undefined, {duration: 5000});
  }
  
  static errorLogin<T>(snackBar: MatSnackBar) {
    snackBar.open(`${ SharedConstants.messages.loginFailed }`, undefined, {duration: 5000});
  }
  
  static errorCustom<T>(snackBar: MatSnackBar, msg?: string) {
    snackBar.open(`❌ ${ msg }`, undefined, {duration: 5000});
  }
}

export namespace Animations {
  export const fadeInOnEnter = fadeInOnEnterAnimation({
    anchor: 'enter',
    duration: 225,
    animateChildren: 'after'
  })
}
