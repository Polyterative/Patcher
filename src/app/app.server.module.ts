import { NgModule } from '@angular/core';
import { ServerModule } from '@angular/platform-server';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { FlexLayoutServerModule } from '@angular/flex-layout/server';

import { AppModule } from './app.module';
import { AppComponent } from './app.component';
import { serverRoutes } from './app.routes.server';

@NgModule({
  imports: [AppModule, ServerModule, FlexLayoutServerModule],
  bootstrap: [AppComponent],
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
  ],
})
export class AppServerModule {}
