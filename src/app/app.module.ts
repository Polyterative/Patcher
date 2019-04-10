import { NgModule }                      from '@angular/core';
import { BrowserModule }                 from '@angular/platform-browser';
import { BrowserAnimationsModule }       from '@angular/platform-browser/animations';
import { NgxsReduxDevtoolsPluginModule } from '@ngxs/devtools-plugin';
import { NgxsLoggerPluginModule }        from '@ngxs/logger-plugin';
import { NgxsModule }                    from '@ngxs/store';

import { OrangeStructuresModule } from 'src/app/LocalLibraries/OrangeStructures/orange-structures.module';
import { VioletUtilsModule }      from 'src/app/LocalLibraries/VioletUtilities/violet-utils.module';
import { MaterialModule }         from 'src/app/material/material.module';
import { environment }            from 'src/environments/environment';
import { AppRoutingModule }       from './app-routing.module';
import { AppComponent }           from './app.component';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports:      [
    // BASE
    BrowserModule,
    AppRoutingModule,
    // BASIC
    MaterialModule,
    // LIBS
    OrangeStructuresModule,
    VioletUtilsModule,
    BrowserAnimationsModule,
    // EXT LIBS
    NgxsModule.forRoot(
      [
        // MyState
      ],
      {developmentMode: !environment.production}),
    NgxsReduxDevtoolsPluginModule.forRoot({disabled: environment.production}),
    NgxsLoggerPluginModule.forRoot({disabled: environment.production, collapsed: false})
  
  ],
  providers:    [],
  bootstrap:    [AppComponent]
})
export class AppModule {
}
