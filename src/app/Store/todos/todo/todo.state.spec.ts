import {
  async,
  TestBed
} from '@angular/core/testing';
import {
  NgxsModule,
  Store
} from '@ngxs/store';
import {
  TodoState,
  TodoStateModel
} from './todo.state';

describe('Todo state', () => {
  let store: Store;
  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [NgxsModule.forRoot([TodoState])]
    }).compileComponents();
    store = TestBed.get(Store);
  }));
  
  it('should create an empty state', () => {
    const actual = store.selectSnapshot(TodoState.getState);
    const expected: TodoStateModel = {
      items: []
    };
    expect(actual).toEqual(expected);
  });
  
});
