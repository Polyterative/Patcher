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
    
    this.copyToClipboard(textToCopy).then(() => {
      this.snackBar.open(`Copied to clipboard: ${  textToCopy}`, undefined, {
        duration: 3000,
        verticalPosition: 'bottom',
        horizontalPosition: 'center',
      });
    }).catch(() => {
      // Copy failed silently — do not surface an error to the user
    });
  }
  
  /**
   * Copies text to clipboard with a fallback for iOS Safari, which does not
   * support the async Clipboard API in the same way other browsers do.
   */
  private copyToClipboard(text: string): Promise<void> {
    // Primary path: modern Clipboard API (Chrome, Firefox, Desktop Safari)
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    
    // Fallback: textarea + execCommand for iOS Safari
    return new Promise<void>((resolve, reject) => {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      
      // Prevent scrolling to the bottom of the page on iOS
      textarea.style.position = 'fixed';
      textarea.style.top = '0';
      textarea.style.left = '0';
      textarea.style.width = '2em';
      textarea.style.height = '2em';
      textarea.style.padding = '0';
      textarea.style.border = 'none';
      textarea.style.outline = 'none';
      textarea.style.boxShadow = 'none';
      textarea.style.background = 'transparent';
      textarea.style.opacity = '0';
      
      document.body.appendChild(textarea);
      
      // iOS requires a range-based selection
      const range = document.createRange();
      range.selectNodeContents(textarea);
      
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }
      
      textarea.setSelectionRange(0, text.length);
      textarea.focus();
      
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      
      if (success) {
        resolve();
      } else {
        reject(new Error('execCommand copy failed'));
      }
    });
  }
}