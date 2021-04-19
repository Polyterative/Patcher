import { CommonModule }             from '@angular/common';
import { NgModule }                 from '@angular/core';
import { BackendModule }            from './backend/backend.module';
import { ModuleBrowserDataService } from './moduleBrowser/module-browser-data.service';
import { ModuleBrowserModule }      from './moduleBrowser/module-browser.module';
import { ModuleDetailDataService }  from './moduleBrowser/module-detail-data.service';
import { PatchBuilderModule }       from './patchBuilder/patch-builder.module';
import { UserAreaModule }           from './user-area/user-area.module';


@NgModule({
  declarations: [],
  providers:    [
    ModuleBrowserDataService,
    ModuleDetailDataService
  ],
  imports:      [
    CommonModule,
    BackendModule,
    PatchBuilderModule,
    ModuleBrowserModule,
    UserAreaModule
  ]
})
export class AppFeaturesModule {}
