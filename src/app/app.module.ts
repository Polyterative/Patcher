import { NgModule }                from '@angular/core';
import { BrowserModule }           from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { MaterialModulePack }        from 'src/app/material/material-module-pack.module';
import { LandingPageComponent }      from 'src/app/Pages/landing-page/landing-page.component';
import { OrangeStructuresModule }    from 'src/app/Utils/LocalLibraries/OrangeStructures/orange-structures.module';
import { VioletUtilsModule }         from 'src/app/Utils/LocalLibraries/VioletUtilities/violet-utils.module';
import { PolyUtilsComponentsModule } from 'src/app/Utils/poly-utils-components.module';
import { AppRoutingModule }          from './app-routing.module';
import { AppComponent }              from './app.component';

@NgModule({
  declarations: [
    AppComponent,
    LandingPageComponent
  ],
  imports:      [
    // BASE
    BrowserModule,
    AppRoutingModule,
    // BASIC
    MaterialModulePack,
    // LIBS
    OrangeStructuresModule,
    VioletUtilsModule,
    BrowserAnimationsModule,
    // INTERNAL UTILS
    PolyUtilsComponentsModule
    // EXT LIBS
  
    // APP LOCAL COMPONENTS
  ],
  providers:    [],
  bootstrap:    [AppComponent]
})
export class AppModule {
}
