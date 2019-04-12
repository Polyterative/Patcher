import { CommonModule }         from '@angular/common';
import { NgModule }             from '@angular/core';
import {
  RouterModule,
  Routes
}                               from '@angular/router';
import { LangingPageComponent } from 'src/app/Pages/landing-page/langing-page.component';

const routes: Routes = [
  {path: 'landing-page', component: LangingPageComponent}
];

@NgModule({
  declarations: [LangingPageComponent],
  imports:      [
    CommonModule,
    RouterModule.forChild(routes)
  ]
})
export class LandingPageModule {}
