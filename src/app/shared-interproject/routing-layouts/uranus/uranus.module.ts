import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatToolbarModule } from '@angular/material/toolbar';
import {
  Route,
  RouterModule,
  Routes
} from '@angular/router';
import { ScreenWrapperModule } from '../../components/@visual/screen-wrapper/screen-wrapper.module';
import { UranusComponent } from './uranus.component';
import { FaqComponent } from "src/app/shared-interproject/components/@visual/faq/faq.component";
import { HeroContentCardModule } from "src/app/shared-interproject/components/@visual/hero-content-card/hero-content-card.module";
import { AppFaqComponent } from "src/app/components/shared-atoms/app-faq/app-faq.component";


@NgModule({
  declarations: [UranusComponent],
  imports: [
    RouterModule,
    CommonModule,
    FlexLayoutModule,
    ScreenWrapperModule,
    MatToolbarModule,
    FaqComponent,
    HeroContentCardModule,
    AppFaqComponent
  ],
  providers:    [],
  exports:      [UranusComponent]
})
export class UranusModule {}

/**
 * Creates routes using the shell component and authentication.
 * @param parentPrefix prefix of parent component.
 * @param routes The routes to add.
 * @param title Overhead title
 * @param canActivate
 */
export function generateUranusRoutes(parentPrefix: string, routes: Routes, title?: string, canActivate: any[] = []): Route {
  
  return {
    path:        parentPrefix,
    component:   UranusComponent,
    children:    routes,
    data:        title ? {title: title} : undefined,
    canActivate: canActivate
    // Reuse Component instance when navigating between child views
    // data:      {reuse: true}
  };
}

export function generateUranusRoutesWithData(parentPrefix: string, routes: Routes, data: { [key: string]: any }, title?: string): Route {
  
  return {
    path:      parentPrefix,
    component: UranusComponent,
    children:  routes,
    data:      [
      data,
      {title: title}
    ]
    // canActivate: [AuthGuard],
    // Reuse Component instance when navigating between child views
    // data:      {reuse: true}
  };
}
