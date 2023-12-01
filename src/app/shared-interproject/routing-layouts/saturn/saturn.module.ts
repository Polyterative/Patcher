import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Route, RouterModule, Routes } from '@angular/router';
import { ScreenWrapperModule } from '../../components/@visual/screen-wrapper/screen-wrapper.module';
import { SaturnComponent } from './saturn.component';

@NgModule({
  declarations: [SaturnComponent],
  imports:      [
    RouterModule,
    CommonModule,
    FlexLayoutModule,
    ScreenWrapperModule,
    MatToolbarModule
  ],
  providers:    [],
  exports:      [SaturnComponent]
})
export class SaturnModule {}

/**
 * Creates routes using the shell component and authentication.
 * @param parentPrefix prefix of parent component.
 * @param routes The routes to add.
 * @param title Overhead title
 */
export function generateSaturnRoutes(parentPrefix: string, routes: Routes, title?: string, canActivate: any[] = []): Route {
  
  return {
    path:        parentPrefix,
    component:   SaturnComponent,
    children:    routes,
    data:        title ? {title: title} : undefined,
    canActivate: canActivate
    // Reuse Component instance when navigating between child views
    // data:      {reuse: true}
  };
}

export function generateSaturnRoutesWithData(parentPrefix: string, routes: Routes, data: { [key: string]: any }, title?: string): Route {

  return {
    path:      parentPrefix,
    component: SaturnComponent,
    children: routes,
    data:     [
      data,
      {title: title}
    ]
    // canActivate: [AuthGuard],
    // Reuse Component instance when navigating between child views
    // data:      {reuse: true}
  };
}
