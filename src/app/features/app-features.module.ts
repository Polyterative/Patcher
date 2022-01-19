import { CommonModule }        from '@angular/common';
import { NgModule }            from '@angular/core';
import { BackendModule }       from 'src/app/features/backend/backend.module';
import { ModuleBrowserModule } from 'src/app/features/module-browser/module-browser.module';
import { PatchBrowserModule }  from 'src/app/features/patch-browser/patch-browser.module';
import { PatchBuilderModule }  from 'src/app/features/patch-builder/patch-builder.module';
import { RackBrowserModule }   from 'src/app/features/rack-browser/rack-browser.module';
import { UserAreaModule }      from 'src/app/features/user-area/user-area.module';


@NgModule({
  declarations: [],
  providers:    [],
  imports:      [
    CommonModule,
    BackendModule,
    PatchBrowserModule,
    RackBrowserModule,
    PatchBuilderModule,
    ModuleBrowserModule,
    UserAreaModule
  ]
})
export class AppFeaturesModule {}
