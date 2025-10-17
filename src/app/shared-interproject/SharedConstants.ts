import {
  EMPTY,
  Observable
} from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MatSnackBar } from "@angular/material/snack-bar";
import { fadeInOnEnterAnimation } from "angular-animations";


export class SharedConstants {
  static messages = {
    passwordResetEmailSent: "Email sent. Check your inbox to reset your password.",
    passwordResetRequestReceived: "Got it. Check your email for the reset link.",
    passwordResetEmailFailed: "Couldn't send the reset email. If you already tried, peek at your inbox.",
    noEmailFound: "We can't find an email for this account. Please contact support.",
    overEmailSendRateLimit: "Too many reset requests. Try again in a bit.",
    operationFailed: "❌ Something went wrong. Try again.",
    dataNotSaved: "❌ Couldn't save your changes. Try again.",
    loginFailed: "❌ Login failed. Check your details and retry.",
    signupFailed: "❌ Signup didn't go through. Check the form and try again.",
    resetPassword: {
      invalidToken: "Invalid or missing token.",
      invalidRedirect: "That redirect URL isn't valid.",
      passwordMismatch: "Passwords don’t match.",
      resetFailed: "Password reset failed. Try again.",
      resetPasswordTitle: "Reset password",
      invalidTokenTitle: "Reset link not valid",
      invalidTokenDescription: "Looks like this page was opened without a valid reset link. Grab the link from your email or request a new one.",
      goToLogin: "Back to login",
      resetPasswordButton: "Set new password"
    }
  };
  
  static confirmMail(snackBar: MatSnackBar) {
    snackBar.open("Confirm your email before logging in.", undefined, {duration: 5000});
  }
  
  static successSignup(snackBar: MatSnackBar) {
    snackBar.open("✅ You're in! Welcome 🎉", undefined, {duration: 3000});
  }
  
  static showSuccessUpdate(snackBar: MatSnackBar) {
    snackBar.open("✅ Changes saved.", undefined, {duration: 1000});
  }
  
  static successCustom(snackBar: MatSnackBar, msg?: string) {
    snackBar.open(`✅ ${ msg }`, undefined, {duration: 4000});
  }
  
  static successDelete(snackBar: MatSnackBar) {
    snackBar.open("✅ Deleted.", undefined, {duration: 4000});
  }
  
  static successSave(snackBar: MatSnackBar) {
    snackBar.open("✅ Saved.", undefined, {duration: 4000});
  }
  
  static successSaveShort(snackBar: MatSnackBar) {
    snackBar.open("✅ Saved.", undefined, {duration: 1000});
  }
  
  static successLogin(snackBar: MatSnackBar) {
    snackBar.open("✅ Welcome back!", undefined, {duration: 2000});
  }
  
  static successLogout(snackBar: MatSnackBar) {
    snackBar.open("✅ Logged out.", undefined, {duration: 2000});
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