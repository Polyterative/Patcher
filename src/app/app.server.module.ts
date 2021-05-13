import { NgModule }               from '@angular/core';
import { FlexLayoutServerModule } from '@angular/flex-layout/server';
import { ServerModule }           from '@angular/platform-server';
import { AppComponent }           from './app.component';

import { AppModule } from './app.module';

@NgModule({
  imports:   [
    AppModule,
    FlexLayoutServerModule,
    ServerModule
  ],
  bootstrap: [AppComponent]
})
export class AppServerModule {}
