export type Todo = string;

export interface Task<T = any> {
  model: T;
}

export class TodoStateModel {
  public todo: string[];
  public task: Task;
}

export interface Extras {
  name: string;
  selected: boolean;
}
