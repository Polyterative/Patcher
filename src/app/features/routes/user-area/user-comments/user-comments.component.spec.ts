import { BehaviorSubject } from 'rxjs';
import { UserCommentsComponent } from './user-comments.component';
import { CommentableEntityTypes } from 'src/app/components/shared-atoms/comments/comments-data.service';

describe('UserCommentsComponent', () => {
  function build() {
    const filteredCommentsData$ = new BehaviorSubject<any[] | undefined>([
      {id: 1, content: 'Belgrad sounds huge', entityType: CommentableEntityTypes.MODULE},
      {id: 2, content: 'Patch note', entityType: CommentableEntityTypes.PATCH},
    ]);
    const updateCommentsData$ = new BehaviorSubject<void>(undefined);

    const component = new UserCommentsComponent({
      filteredCommentsData$,
      updateCommentsData$,
    } as any);

    return {component, filteredCommentsData$, updateCommentsData$};
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
});
