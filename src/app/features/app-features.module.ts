import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { MAT_DIALOG_DEFAULT_OPTIONS } from '@angular/material/dialog';
import { BackendModule } from 'src/app/features/backend/backend.module';
import { ModuleBrowserModule } from 'src/app/features/module-browser/module-browser.module';
import { PatchBrowserModule } from 'src/app/features/patch-browser/patch-browser.module';
import { RackBrowserModule } from 'src/app/features/rack-browser/rack-browser.module';
import { UserAreaModule } from 'src/app/features/user-area/user-area.module';
import { InfoPagesModule } from './info-pages/info-pages.module';

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
    BackendModule,
    PatchBrowserModule,
    RackBrowserModule,
    ModuleBrowserModule,
    UserAreaModule,
    InfoPagesModule
  ]
})
export class AppFeaturesModule {}
