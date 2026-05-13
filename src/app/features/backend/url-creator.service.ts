import { PlatformLocation } from '@angular/common';
import { Injectable } from '@angular/core';
import { MatSnackBar } from "@angular/material/snack-bar";
import { Router } from '@angular/router';


@Injectable()
export class UrlCreatorService {
  
  constructor(
    public router: Router,
    public snackBar: MatSnackBar,
    private platformLocation: PlatformLocation
  ) { }

  copyTextToClipboard(
    text: string,
    successMessage = 'Copied to clipboard.',
    errorMessage = 'Clipboard write failed — copy manually.'
  ): void {
    navigator.clipboard.writeText(text)
             .then(() => {
               this.snackBar.open(successMessage, undefined, {duration: 2000, panelClass: 'snack-success'});
             }, () => {
               this.snackBar.open(errorMessage, undefined, {
                 duration: 2000,
                 panelClass: 'snack-error'
               });
             });
  }
  
  copyLinkToClipboard(path: string): void {
    const url: string = window.location.origin + path;

    this.copyTextToClipboard(
      url,
      'Link copied to clipboard.',
      'Clipboard write failed — copy the URL from the address bar manually.'
    );
  }
}
