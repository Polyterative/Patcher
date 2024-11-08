import {
  Directive,
  ElementRef,
  HostListener
} from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';


@Directive({
  standalone: true,
  selector: '[appCopyable]'
})
export class CopyableDirective {
  
  constructor(private el: ElementRef, private snackBar: MatSnackBar) {
  }
  
  @HostListener('mouseenter') onMouseEnter() {
    // Change the cursor to pointer when hovering over the element
    this.el.nativeElement.style.cursor = 'pointer';
  }
  
  @HostListener('mouseleave') onMouseLeave() {
    // Change cursor back to default
    this.el.nativeElement.style.cursor = 'default';
  }
  
  @HostListener('click') onClick() {
    // Get the text content of the element
    const textToCopy = this.el.nativeElement.innerText;
    
    // Copy the text to clipboard
    navigator.clipboard.writeText(textToCopy).then(() => {
      // Show the snack bar with the message "Copied!"
      this.snackBar.open('Copied to clipboard: ' + textToCopy,
        undefined, {
          duration: 3000,  // Show the snack bar for 1 second
          verticalPosition: 'bottom',  // Position at the bottom
          horizontalPosition: 'center',  // Center horizontally
        });
    });
  }
}
