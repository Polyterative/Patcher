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
  
  copyLinkToClipboard(path: string): void {
    // this.router.
    const url: string = window.location.origin + path;
    
    navigator.clipboard.writeText(url)
             .then(() => {
               this.snackBar.open('Link copied to clipboard.', undefined, {duration: 2000, panelClass: 'snack-success'});
             }, err => {
               this.snackBar.open('Clipboard write failed — copy the URL from the address bar manually.', undefined, {
                 duration: 2000,
                 panelClass: 'snack-error'
               });
             });
  }
}