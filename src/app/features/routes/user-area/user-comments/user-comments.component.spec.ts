import { BehaviorSubject } from 'rxjs';
import { UserCommentsComponent } from './user-comments.component';
import {
  CommentableEntityTypes,
  DbComment
} from 'src/app/models/comment';
import { UserAreaDataService } from 'src/app/features/routes/user-area/user-area-data.service';

describe('UserCommentsComponent', () => {
  function build() {
    const filteredCommentsData$ = new BehaviorSubject<DbComment[] | undefined>([
      createComment(1, 'Belgrad sounds huge', CommentableEntityTypes.MODULE),
      createComment(2, 'Patch note', CommentableEntityTypes.PATCH),
    ]);
    const updateCommentsData$ = new BehaviorSubject<void>(undefined);
    const dataService = jasmine.createSpyObj<UserAreaDataService>(
      'UserAreaDataService',
      [],
      {
        filteredCommentsData$,
        updateCommentsData$,
      }
    );

    const component = new UserCommentsComponent(dataService);

    return {component, filteredCommentsData$, updateCommentsData$};
  }

  function createComment(id: number, content: string, entityType: CommentableEntityTypes): DbComment {
    return {
      id,
      content,
      entityType,
      entityId: id * 100,
      profile: {
        id: 'user-1',
        username: 'demo-user'
      },
      created: '2024-01-01T00:00:00.000Z',
      updated: '2024-01-01T00:00:00.000Z',
    };
  }

  it('shows all searched comments by default', (done) => {
    const {component} = build();

    component.filteredComments$.subscribe((comments) => {
      expect(comments?.map((comment) => comment.id)).toEqual([1, 2]);
      done();
    });
  });

  it('applies the type chip filter on top of searched comments', (done) => {
    const {component} = build();
    component.setFilter(CommentableEntityTypes.PATCH);

    component.filteredComments$.subscribe((comments) => {
      expect(comments?.map((comment) => comment.id)).toEqual([2]);
      done();
    });
  });

  it('requests comments on init', () => {
    const {component, updateCommentsData$} = build();
    const nextSpy = spyOn(updateCommentsData$, 'next').and.callThrough();

    component.ngOnInit();

    expect(nextSpy).toHaveBeenCalled();
  });

  it('clears the type filter when setFilter is called with null', (done) => {
    const {component} = build();
    component.setFilter(CommentableEntityTypes.PATCH);
    component.setFilter(null);

    component.filteredComments$.subscribe((comments) => {
      expect(comments?.length).toBe(2);
      done();
    });
  });

  it('activeFilter$ starts as null', (done) => {
    const {component} = build();
    component.activeFilter$.subscribe((f) => {
      expect(f).toBeNull();
      done();
    });
  });

  it('filterOptions includes all expected entity types', () => {
    const {component} = build();
    const labels = component.filterOptions.map(o => o.label);
    expect(labels).toContain('All');
    expect(labels).toContain('Modules');
    expect(labels).toContain('Patches');
    expect(labels).toContain('Racks');
  });
});
