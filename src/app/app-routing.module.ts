import { NgModule } from '@angular/core';
import {
  RouterModule,
  Routes
}                   from '@angular/router';

const routes: Routes = [
  // {path: 'todos', component: TodosPageComponent}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {
}
