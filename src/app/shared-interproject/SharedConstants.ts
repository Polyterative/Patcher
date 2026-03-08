import {
  EMPTY,
  Observable
} from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MatSnackBar } from "@angular/material/snack-bar";
import { fadeInOnEnterAnimation } from "angular-animations";


export class SharedConstants {
  static messages = {
    // Auth — password reset flow
    passwordResetEmailSent: "Reset link sent — check your inbox (and spam, just in case).",
    passwordResetRequestReceived: "Request received. Your reset link is on its way.",
    passwordResetEmailFailed: "Couldn't send the reset email. Double-check the address or try again shortly.",
    noEmailFound: "No account found with that email address. Try a different one or reach out to support.",
    overEmailSendRateLimit: "You've requested too many resets in a short window. Wait a moment before trying again.",
    
    // Generic operation outcomes — provide context, not just status
    operationFailed: "The action didn't complete — the server returned an error. Try again or refresh the page.",
    dataNotSaved: "Your changes weren't written to the database. Check your connection and try saving again.",
    loginFailed: "Sign-in failed — the credentials didn't match any account. Check your email and password.",
    signupFailed: "Account creation didn't go through. Review the form fields and try again.",
    passwordResetEmailSentTitle: "Check your inbox",

    resetPassword: {
      invalidToken: "The reset token is invalid or missing — the URL may have been truncated.",
      invalidRedirect: "The redirect destination in this link isn't allowed.",
      passwordMismatch: "The two passwords you entered don't match. Re-type them carefully.",
      resetFailed: "Password update failed on the server side. Wait a moment and try again.",
      resetPasswordTitle: "Set a new password",
      invalidTokenTitle: "This link isn't valid",
      invalidTokenDescription: "The reset link has expired or was opened incorrectly. Grab a fresh one from your email, or request a new link below.",
      goToLogin: "Back to login",
      resetPasswordButton: "Save new password",
      verifyingLink: "Verifying your reset link…",
      passwordLabel: "New password",
      confirmPasswordLabel: "Confirm new password",
      passwordHint: "At least 8 characters — mix letters, numbers, and symbols for a stronger password.",
      successTitle: "Password updated",
      successDescription: "Your credentials have been changed. You'll be redirected to login, or go now.",
      redirectingIn: "Redirecting in",
      seconds: "seconds",
      goToLoginNow: "Go to login",
      // Field-level validation errors
      samePassword: "New password must differ from your current one.",
      weakPassword: "Password is too weak — add uppercase letters, numbers, or special characters.",
      passwordTooShort: "Password must be at least 8 characters long.",
      passwordTooLong: "Password must not exceed 30 characters.",
      invalidSession: "Your reset session has expired. Request a new link to continue.",
      networkError: "Network error — check your connection and try again.",
      unknownError: "An unexpected error occurred. Try again, or contact support if it persists."
    }
  };

  static confirmMail(snackBar: MatSnackBar) {
    snackBar.open("Confirm your email address before signing in — check your inbox.", undefined, {duration: 5000, panelClass: 'snack-info'});
  }
  
  static infoCustom(snackBar: MatSnackBar, msg: string) {
    snackBar.open(msg, undefined, {duration: 3000, panelClass: 'snack-info'});
  }

  static successSignup(snackBar: MatSnackBar) {
    snackBar.open("Account created. Welcome to Patcher!", undefined, {duration: 3000, panelClass: 'snack-success'});
  }

  static showSuccessUpdate(snackBar: MatSnackBar) {
    snackBar.open("Saved to database.", undefined, {duration: 1000, panelClass: 'snack-success'});
  }

  static successCustom(snackBar: MatSnackBar, msg?: string) {
    snackBar.open(msg ?? "Done.", undefined, {duration: 4000, panelClass: 'snack-success'});
  }

  static successDelete(snackBar: MatSnackBar) {
    snackBar.open("Removed from database.", undefined, {duration: 4000, panelClass: 'snack-success'});
  }

  static successSave(snackBar: MatSnackBar) {
    snackBar.open("Saved.", undefined, {duration: 4000, panelClass: 'snack-success'});
  }

  static successSaveShort(snackBar: MatSnackBar) {
    snackBar.open("Saved.", undefined, {duration: 1000, panelClass: 'snack-success'});
  }

  static successLogin(snackBar: MatSnackBar) {
    snackBar.open("Signed in.", undefined, {duration: 2000, panelClass: 'snack-success'});
  }

  static successLogout(snackBar: MatSnackBar) {
    snackBar.open("Signed out.", undefined, {duration: 2000, panelClass: 'snack-success'});
  }

  static errorHandlerSignup<T>(snackBar: MatSnackBar, msg?: string) {
    return catchError<T, Observable<never>>(() => {
      snackBar.open(`${ SharedConstants.messages.signupFailed }${ msg ? ' ' + msg : '' }`, undefined, {duration: 8000, panelClass: 'snack-error'});
      return EMPTY;
    });
  }

  static errorHandlerLogin<T>(snackBar: MatSnackBar, msg?: string) {
    return catchError<T, Observable<never>>(() => {
      snackBar.open(`${ SharedConstants.messages.loginFailed }${ msg ? ' ' + msg : '' }`, undefined, {duration: 8000, panelClass: 'snack-error'});
      return EMPTY;
    });
  }

  static errorHandlerData<T>(snackBar: MatSnackBar) {
    return catchError<T, Observable<never>>(() => {
      snackBar.open(SharedConstants.messages.dataNotSaved, undefined, {duration: 8000, panelClass: 'snack-error'});
      return EMPTY;
    });
  }
  
  static errorHandlerOperation<T>(snackBar: MatSnackBar) {
    return catchError<T, Observable<never>>(() => {
      snackBar.open(SharedConstants.messages.operationFailed, undefined, {duration: 8000, panelClass: 'snack-error'});
      return EMPTY;
    });
  }
  
  static errorSignup<T>(snackBar: MatSnackBar, msg?: string) {
    snackBar.open(`${ SharedConstants.messages.signupFailed }${ msg ? ' ' + msg : '' }`, undefined, {duration: 5000, panelClass: 'snack-error'});
  }
  
  static errorLogin<T>(snackBar: MatSnackBar) {
    snackBar.open(SharedConstants.messages.loginFailed, undefined, {duration: 5000, panelClass: 'snack-error'});
  }
  
  static errorCustom<T>(snackBar: MatSnackBar, msg?: string) {
    snackBar.open(msg ?? SharedConstants.messages.operationFailed, undefined, {duration: 5000, panelClass: 'snack-error'});
  }
}

export namespace Animations {
  export const fadeInOnEnter = fadeInOnEnterAnimation({
    anchor: 'enter',
    duration: 225,
    animateChildren: 'after'
  })
}