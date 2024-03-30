import { PlatformLocation } from '@angular/common';
import { Injectable } from '@angular/core';
import { MatLegacySnackBar as MatSnackBar } from '@angular/material/legacy-snack-bar';
import { Router } from '@angular/router';


@Injectable()
export class UrlCreatorService {
  
  constructor(
    public router: Router,
    public snackBar: MatSnackBar,
    private platformLocation: PlatformLocation
  ) { }
  
  copyLinkToClipboard(path: string): void {
    // this.router.
    const url: string = window.location.origin + path;
    
    navigator.clipboard.writeText(url)
             .then(() => {
               this.snackBar.open('Copied URL to clipboard', undefined, {duration: 2000});
             }, err => {
               this.snackBar.open('Could not copy URL to clipboard, try manually', undefined, {duration: 2000});
             });
  }
}