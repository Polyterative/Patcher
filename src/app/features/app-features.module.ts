import { CommonModule }        from '@angular/common';
import { NgModule }            from '@angular/core';
import { BackendModule }       from './backend/backend.module';
import { ModuleBrowserModule } from './moduleBrowser/module-browser.module';
import { PatchBuilderModule }  from './patchBuilder/patch-builder.module';
import { UserAreaModule }      from './user-area/user-area.module';


@NgModule({
  declarations: [],
  providers:    [],
  imports:      [
    CommonModule,
    BackendModule,
    PatchBuilderModule,
    ModuleBrowserModule,
    UserAreaModule
  ]
})
export class AppFeaturesModule {}
