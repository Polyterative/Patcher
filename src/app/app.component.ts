import { Component } from '@angular/core';
import { Store }     from '@ngxs/store';
import { AddTodo }   from 'src/app/store/todos/todo/todo.action';

@Component({
  selector:    'app-root',
  templateUrl: './app.component.html',
  styleUrls:   ['./app.component.scss']
})
export class AppComponent {
  title = 'Focus';
  
  // addTodo$: EventEmitter=;
  
  constructor(public store: Store) {
  
  }
  
  click() {
    this.store.dispatch(new AddTodo('a'));
    
    console.log(this.store);
  }
}
