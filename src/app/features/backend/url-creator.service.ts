import { PlatformLocation } from '@angular/common';
import { Injectable }       from '@angular/core';
import { MatSnackBar }      from '@angular/material/snack-bar';
import { Router }           from '@angular/router';

@Injectable()
export class UrlCreatorService {
  
  constructor(
    public router: Router,
    public snackBar: MatSnackBar,
    private platformLocation: PlatformLocation
  ) { }
  
  copyLinkToClipboard(path: string): void {
    let text = 'Example text to appear on clipboard';
    
    // this.router.
    let url: string = window.location.origin + path;
    
    // @ts-ignore
    navigator.clipboard.writeText(url)
             .then(() => {
               this.snackBar.open('Copied URL to clipboard', undefined, {duration: 2000});
             }, err => {
               this.snackBar.open('Could not copy URL to clipboard, try manually', undefined, {duration: 2000});
             });
  }
}
