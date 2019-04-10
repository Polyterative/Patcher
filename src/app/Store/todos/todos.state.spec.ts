import {
  async,
  TestBed
} from '@angular/core/testing';
import {
  NgxsModule,
  Store
} from '@ngxs/store';
import {
  TodosState,
  TodosStateModel
} from './todos.state';

describe('Todos state', () => {
  let store: Store;
  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [NgxsModule.forRoot([TodosState])]
    }).compileComponents();
    store = TestBed.get(Store);
  }));
  
  it('should create an empty state', () => {
    const actual = store.selectSnapshot(TodosState.getState);
    const expected: TodosStateModel = {
      items: []
    };
    expect(actual).toEqual(expected);
  });
  
});
