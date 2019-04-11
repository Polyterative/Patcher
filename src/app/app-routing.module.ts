import { NgModule }           from '@angular/core';
import {
  RouterModule,
  Routes
}                             from '@angular/router';
import { TodosPageComponent } from 'src/app/Pages/Todos/todos-page/todos-page.component';

const routes: Routes = [
  {path: 'todos', component: TodosPageComponent}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {
}
