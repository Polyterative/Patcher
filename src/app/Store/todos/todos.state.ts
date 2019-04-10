import {
  Action,
  Selector,
  State,
  StateContext
}                   from '@ngxs/store';
import { LoadData } from 'src/app/store/todos/todos.actions';
import {
  Task,
  TodoStateModel
}                   from './todos.model';

@State<TodoStateModel>({
  name:     'todos',
  defaults: {
    todo: [],
    task: {model: undefined}
  },
  children: [TodosState]
})
export class TodosState {
  
  @Selector()
  static task(state: TodoStateModel): Task {
    return state.task;
    // }
    
  }
  
  // @Action(SetPrefix)
  // setPrefix({getState, setState, patchState}: StateContext<TodoStateModel>) {
  //
  //   setState(
  //     patch({
  //       task:patch({
  //
  //       })
  //       }
  //     )
  //   )
  //
  // }
  
  @Action(LoadData)
  loadData({patchState}: StateContext<TodoStateModel>) {
    
    const data = {
      extraA: '', extras: [
        false,
        false,
        true
      ]
    };
    
    return patchState({task: {model: {...data}}});
  }
  
}
