import { CommonModule }            from '@angular/common';
import { NgModule }                from '@angular/core';
import { FlexLayoutModule }        from '@angular/flex-layout';
import {
  MatButtonModule,
  MatCardModule,
  MatChipsModule,
  MatDialogModule,
  MatExpansionModule,
  MatFormFieldModule,
  MatIconModule,
  MatInputModule,
  MatListModule,
  MatMenuModule,
  MatPaginatorModule,
  MatProgressBarModule,
  MatRadioModule,
  MatSlideToggleModule,
  MatSnackBarModule,
  MatTableModule,
  MatTabsModule,
  MatToolbarModule
}                                  from '@angular/material';
import { BrowserModule }           from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

@NgModule({
  imports:      [
    CommonModule
  ],
  declarations: [],
  exports:      [
    BrowserModule,
    BrowserAnimationsModule,
    // FLEX
    FlexLayoutModule,
    // MATERIAL
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatExpansionModule,
    MatProgressBarModule,
    MatRadioModule,
    MatSlideToggleModule,
    MatTabsModule,
    MatSnackBarModule,
    MatIconModule,
    MatInputModule,
    MatListModule,
    MatMenuModule,
    MatTableModule,
    MatToolbarModule,
    MatPaginatorModule
  ]
})
export class MaterialModulePack {
}
