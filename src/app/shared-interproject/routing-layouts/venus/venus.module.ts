import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Route, RouterModule, Routes } from '@angular/router';
import { ScreenWrapperModule } from '../../components/@visual/screen-wrapper/screen-wrapper.module';
import { VenusComponent } from './venus.component';

@NgModule({
  declarations: [VenusComponent],
  imports:      [
    RouterModule,
    CommonModule,
    FlexLayoutModule,
    ScreenWrapperModule,
    MatToolbarModule
  ],
  providers:    [],
  exports:      [VenusComponent]
})
export class VenusModule {}

/**
 * Creates routes using the shell component and authentication.
 * @param parentPrefix prefix of parent component.
 * @param routes The routes to add.
 * @param title Overhead title
 */
export function generateVenusRoutes(parentPrefix: string, routes: Routes, title?: string): Route {

  return {
    path:      parentPrefix,
    component: VenusComponent,
    children:  routes,
    data:      title ? {title: title} : undefined
    // canActivate: [AuthGuard],
    // Reuse Component instance when navigating between child views
    // data:      {reuse: true}
  };
}

export function generateVenusRoutesWithData(parentPrefix: string, routes: Routes, data: { [key: string]: any }, title?: string): Route {

  return {
    path:      parentPrefix,
    component: VenusComponent,
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
