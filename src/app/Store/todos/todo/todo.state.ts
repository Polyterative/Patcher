import {
  Action,
  State,
  StateContext
}               from '@ngxs/store';
import {
  AddTodo,
  RemoveTodo
}               from 'src/app/store/todos/todo/todo.action';
import { Todo } from 'src/app/store/todos/todos.model';

@State<Todo[]>({
  name:     'todo',
  defaults: []
})

export class TodoState {
  
  // @Selector()
  // public static getState(state: T odo) {
  //   return state;
  // }
  
  ngxsOnInit({getState, setState}: StateContext<Todo[]>) {
    const state: Todo[] = getState();
    const payload: Todo = 'NgxsOnInit todo';
    if (!state.includes(payload)) {
      setState([
        ...state,
        payload
      ]);
    }
  }
  
  ngxsAfterBootstrap({getState, setState}: StateContext<Todo[]>): void {
    const state: Todo[] = getState();
    const payload: Todo = 'NgxsAfterBootstrap todo';
    if (!state.includes(payload)) {
      setState([
        ...state,
        payload
      ]);
    }
  }
  
  @Action(AddTodo)
  addTodo({getState, setState}: StateContext<Todo[]>, {payload}: AddTodo): void {
    setState(existing => [
      ...existing,
      payload
    ]);
  }
  
  @Action(RemoveTodo)
  removeTodo({getState, setState}: StateContext<Todo[]>, {payload}: RemoveTodo): void {
    setState(existing => existing.filter((value, index) => index !== payload));
  }
  
}
