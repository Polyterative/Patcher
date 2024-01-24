import { Component, OnInit, Inject, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-confirm-dialog',
  templateUrl: './confirm-dialog.component.html',
  styleUrls: ['./confirm-dialog.component.scss']
})
export class ConfirmDialogComponent implements OnInit, AfterViewInit {
  autofocusPositive: boolean = false;
  @ViewChild('positiveButton', { static: false }) positiveButton: ElementRef;

  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {
    if (data && data.autofocusPositive) {
      this.autofocusPositive = true;
    }
  }

  ngOnInit(): void {
    // ngOnInit lifecycle hook implementation
  }

  ngAfterViewInit(): void {
    if (this.autofocusPositive && this.positiveButton) {
      this.positiveButton.nativeElement.focus();
    }
  }
}
