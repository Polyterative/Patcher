import { of } from 'rxjs';
import {
  CommentableEntityTypes,
  CommentsDataService
} from './comments-data.service';


describe('CommentsDataService', () => {
  function build() {
    const backend = {
      GET: {
        comments: jasmine.createSpy('comments').and.returnValue(of([{id: 1, content: 'c1'}]))
      },
      add: {
        comment: jasmine.createSpy('comment').and.returnValue(of({id: 2}))
      },
      delete: {
        comment: jasmine.createSpy('deleteComment').and.returnValue(of({}))
      }
    };
    const snackBar = {
      open: jasmine.createSpy('open')
    };
    
    const service = new CommentsDataService(backend as any, snackBar as any, {} as any);
    return {service, backend, snackBar};
  }
  
  it('loads comments and resets the field when update is requested', () => {
    const {service, backend} = build();
    service.fields.submit.control.setValue('dirty');
    service.fields.submit.control.markAsTouched();
    
    service.requestCommentsUpdate$.next({entityId: 7, entityType: CommentableEntityTypes.MODULE});
    
    expect(backend.GET.comments).toHaveBeenCalledWith(7, CommentableEntityTypes.MODULE);
    expect(service.comments$.value).toEqual([{id: 1, content: 'c1'} as any]);
    expect(service.fields.submit.control.value).toBe('');
    expect(service.fields.submit.control.touched).toBeFalse();
  });
  
  it('submits sanitized comments and requests a refresh', () => {
    const {service, backend} = build();
    service.requestCommentsUpdate$.next({entityId: 11, entityType: CommentableEntityTypes.PATCH});
    
    service.submitComment$.next('  <b>hello</b>  ');
    
    expect(backend.add.comment).toHaveBeenCalledWith({
      content: '<b>hello</b>',
      entityId: 11,
      entityType: CommentableEntityTypes.PATCH
    });
    expect(backend.GET.comments).toHaveBeenCalledTimes(2);
    expect(service.fields.submit.control.value).toBe('');
  });
  
  it('does not submit empty comments', () => {
    const {service, backend} = build();
    service.requestCommentsUpdate$.next({entityId: 11, entityType: CommentableEntityTypes.PATCH});
    
    service.submitComment$.next('   ');
    
    expect(backend.add.comment).not.toHaveBeenCalled();
  });
  
  it('deletes comment and refreshes current entity comments', () => {
    const {service, backend} = build();
    service.requestCommentsUpdate$.next({entityId: 99, entityType: CommentableEntityTypes.RACK});
    
    service.deleteComment$.next(123);
    
    expect(backend.delete.comment).toHaveBeenCalledWith(123);
    expect(backend.GET.comments).toHaveBeenCalledTimes(2);
    expect(backend.GET.comments).toHaveBeenCalledWith(99, CommentableEntityTypes.RACK);
  });
  
  it('resets state when requestReset is emitted', () => {
    const {service} = build();
    service.comments$.next([{id: 9} as any]);
    service.fields.submit.control.setValue('text');
    
    service.requestReset$.next();
    
    expect(service.comments$.value).toBeUndefined();
    expect(service.fields.submit.control.value).toBe('');
  });
});