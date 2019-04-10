import { CommonModule }                  from '@angular/common';
import { NgModule }                      from '@angular/core';
import { NgxsReduxDevtoolsPluginModule } from '@ngxs/devtools-plugin';
import { NgxsFormPluginModule }          from '@ngxs/form-plugin';
import { NgxsLoggerPluginModule }        from '@ngxs/logger-plugin';
import { NgxsRouterPluginModule }        from '@ngxs/router-plugin';
import { NgxsModule }                    from '@ngxs/store';
import { environment as env }            from 'src/environments/environment';
import { TodoState }                     from './todos/todo/todo.state';
import { TodosState }                    from './todos/todos.state';

@NgModule({
  imports: [
    CommonModule,
    NgxsFormPluginModule.forRoot(),
    NgxsLoggerPluginModule.forRoot({logger: console, collapsed: false}),
    NgxsReduxDevtoolsPluginModule.forRoot({disabled: env.production}),
    NgxsRouterPluginModule.forRoot(),
    NgxsModule.forRoot(
      [
        TodosState,
        TodoState
      ],
      {developmentMode: !env.production}
    )
  ],
  exports: [
    NgxsFormPluginModule,
    NgxsLoggerPluginModule,
    NgxsReduxDevtoolsPluginModule,
    NgxsModule
  ]
})
export class LocalStoreModule {
}
