import { MatSnackBar } from '@angular/material/snack-bar';
import { TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';
import { CommentsDataService } from './comments-data.service';
import { CommentableEntityTypes, DbComment } from 'src/app/models/comment';
import { SupabaseService } from 'src/app/features/backend/supabase.service';

interface CommentsBackendDouble {
  GET: {
    comments: jasmine.Spy<(
      entityId: number,
      entityType: CommentableEntityTypes,
      from?: number,
      to?: number
    ) => Observable<{ data: DbComment[] | null; count: number | null }>>;
  };
  add: {
    comment: jasmine.Spy<(data: {
      entityId: number;
      entityType: CommentableEntityTypes;
      content: string;
    }) => Observable<unknown>>;
  };
  delete: {
    comment: jasmine.Spy<(id: number) => Observable<unknown>>;
  };
}

const commentFixture = (overrides: Partial<DbComment>): DbComment => ({
  id: 1,
  content: 'c1',
  entityId: 7,
  entityType: CommentableEntityTypes.MODULE,
  profile: {
    id: 'profile-1',
    username: 'commenter'
  },
  created: '2026-01-01T00:00:00.000Z',
  updated: '2026-01-01T00:00:00.000Z',
  ...overrides
});


describe('CommentsDataService', () => {
  let createdServices: CommentsDataService[];

  function build() {
    const backend: CommentsBackendDouble = {
      GET: {
        comments: jasmine.createSpy('comments')
          .and.returnValue(of({ data: [commentFixture({})], count: 1 }))
      },
      add: {
        comment: jasmine.createSpy('comment').and.returnValue(of({ id: 2 }))
      },
      delete: {
        comment: jasmine.createSpy('deleteComment').and.returnValue(of({}))
      }
    };
    const snackBar = jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']);
    
    TestBed.configureTestingModule({
      providers: [
        CommentsDataService,
        { provide: SupabaseService, useValue: backend },
        { provide: MatSnackBar, useValue: snackBar },
      ],
    });
    const service = TestBed.inject(CommentsDataService);
    createdServices.push(service);
    return { service, backend, snackBar };
  }

  beforeEach(() => {
    createdServices = [];
  });

  afterEach(() => {
    createdServices.forEach((service) => service.ngOnDestroy());
    TestBed.resetTestingModule();
  });
  
  it('loads comments and resets the field when update is requested', () => {
    const { service, backend } = build();
    service.fields.submit.control.setValue('dirty');
    service.fields.submit.control.markAsTouched();
    
    service.requestCommentsUpdate$.next({ entityId: 7, entityType: CommentableEntityTypes.MODULE });
    
    expect(backend.GET.comments).toHaveBeenCalledWith(7, CommentableEntityTypes.MODULE, 0, service.pageSize - 1);
    expect(service.comments$.value).toEqual([commentFixture({})]);
    expect(service.fields.submit.control.value).toBe('');
    expect(service.fields.submit.control.touched).toBeFalse();
  });
  
  it('submits sanitized comments and requests a refresh', () => {
    const { service, backend } = build();
    service.requestCommentsUpdate$.next({ entityId: 11, entityType: CommentableEntityTypes.PATCH });
    
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
    const { service, backend } = build();
    service.requestCommentsUpdate$.next({ entityId: 11, entityType: CommentableEntityTypes.PATCH });
    
    service.submitComment$.next('   ');
    
    expect(backend.add.comment).not.toHaveBeenCalled();
  });
  
  it('deletes comment and refreshes current entity comments', () => {
    const { service, backend } = build();
    service.requestCommentsUpdate$.next({ entityId: 99, entityType: CommentableEntityTypes.RACK });
    
    service.deleteComment$.next(123);
    
    expect(backend.delete.comment).toHaveBeenCalledWith(123);
    expect(backend.GET.comments).toHaveBeenCalledTimes(2);
    expect(backend.GET.comments).toHaveBeenCalledWith(99, CommentableEntityTypes.RACK, 0, service.pageSize - 1);
  });

  it('shows an error and stays subscribable when comment delete fails', () => {
    const { service, backend, snackBar } = build();
    service.requestCommentsUpdate$.next({ entityId: 99, entityType: CommentableEntityTypes.RACK });
    backend.delete.comment.and.returnValue(throwError(() => new Error('network down')));

    service.deleteComment$.next(123);

    expect(snackBar.open).toHaveBeenCalled();
    expect(backend.GET.comments).toHaveBeenCalledTimes(1);

    backend.delete.comment.and.returnValue(of({}));
    service.deleteComment$.next(456);

    expect(backend.delete.comment).toHaveBeenCalledWith(456);
    expect(backend.GET.comments).toHaveBeenCalledTimes(2);
  });
  
  it('rejects comment below minLength via form validator', () => {
    const { service } = build();
    service.fields.submit.control.setValue('ab');
    expect(service.fields.submit.control.valid).toBeFalse();
    expect(service.fields.submit.control.hasError('minlength')).toBeTrue();
  });
  
  it('rejects comment above maxLength via form validator', () => {
    const { service } = build();
    service.fields.submit.control.setValue('x'.repeat(service.maxLength + 1));
    expect(service.fields.submit.control.valid).toBeFalse();
    expect(service.fields.submit.control.hasError('maxlength')).toBeTrue();
  });

  it('resets state when requestReset is emitted', () => {
    const { service } = build();
    service.comments$.next([commentFixture({ id: 9 })]);
    service.fields.submit.control.setValue('text');
    
    service.requestReset$.next();
    
    expect(service.comments$.value).toBeUndefined();
    expect(service.commentsCount$.value).toBe(0);
    expect(service.fields.submit.control.value).toBe('');
  });

  it('exposes commentsCount after fetch', () => {
    const { service } = build();
    service.requestCommentsUpdate$.next({ entityId: 5, entityType: CommentableEntityTypes.MODULE });
    expect(service.commentsCount$.value).toBe(1);
  });
});