import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ModuleBrowserModule } from 'src/app/features/module-browser/module-browser.module';
import { PatchBrowserModule } from 'src/app/features/patch-browser/patch-browser.module';
import { RackBrowserModule } from 'src/app/features/routes/rack/rack-browser.module';
import { MAT_DIALOG_DEFAULT_OPTIONS } from "@angular/material/dialog";


@NgModule({
  declarations: [],
  providers:    [
    {
      provide:  MAT_DIALOG_DEFAULT_OPTIONS,
      useValue: {
        hasBackdrop:       true,
        disableClose:      false,
        closeOnNavigation: true
      }
    }
  ],
  imports:      [
    CommonModule,
    PatchBrowserModule,
    RackBrowserModule,
    ModuleBrowserModule
  ]
})
export class AppFeaturesModule {}
