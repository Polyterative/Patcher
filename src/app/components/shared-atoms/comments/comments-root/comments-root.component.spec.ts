import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { BehaviorSubject, ReplaySubject, Subject } from 'rxjs';
import { UserManagementService } from 'src/app/features/backbone/login/user-management.service';
import { AppStateService } from 'src/app/shared-interproject/app-state.service';
import { CommentsDataService } from '../comments-data.service';
import { CommentsRootComponent } from './comments-root.component';

describe('CommentsRootComponent', () => {
  let fixture: ComponentFixture<CommentsRootComponent>;

  function build({
    comments = [{ id: 1, content: 'First comment' }],
    count = 1,
    user = { id: 'user-1' },
  }: {
    comments?: Array<Record<string, unknown>>;
    count?: number;
    user?: Record<string, unknown> | null;
  } = {}) {
    const comments$ = new BehaviorSubject<any[] | undefined>(comments as any[]);
    const commentsCount$ = new BehaviorSubject<number>(count);
    const isSubmitting$ = new BehaviorSubject<boolean>(false);
    const requestCommentsUpdate$ = new ReplaySubject<any>(1);
    const loadMore$ = new Subject<void>();
    const submitComment$ = new Subject<string>();
    const loggedUser$ = new BehaviorSubject<any>(user);

    TestBed.configureTestingModule({
      declarations: [CommentsRootComponent],
      imports: [CommonModule, NoopAnimationsModule],
      providers: [
        {
          provide: CommentsDataService,
          useValue: {
            comments$,
            commentsCount$,
            isSubmitting$,
            requestCommentsUpdate$,
            loadMore$,
            submitComment$,
            maxLength: 1000,
            fields: {
              submit: {
                control: new FormControl('Ready to post'),
              },
            },
          },
        },
        {
          provide: UserManagementService,
          useValue: {
            loggedUser$,
          },
        },
        {
          provide: AppStateService,
          useValue: {},
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    });

    fixture = TestBed.createComponent(CommentsRootComponent);
    fixture.detectChanges();

    return {
      commentsCount$,
      loggedUser$,
    };
  }

  it('keeps the comment list and composer inside the bounded rail', () => {
    build();

    const rail = fixture.nativeElement.querySelector('.commentsRoot__rail');
    const composer = fixture.nativeElement.querySelector('.commentsRoot__composer');

    expect(rail).not.toBeNull();
    expect(composer).not.toBeNull();
  });

  it('renders the load-more action inside the same rail when more comments exist', () => {
    build({
      comments: [{ id: 1, content: 'First comment' }],
      count: 4,
    });

    const rail = fixture.nativeElement.querySelector('.commentsRoot__rail');
    const loadMoreButton = fixture.nativeElement.querySelector('.commentsRoot__loadMore');

    expect(rail).not.toBeNull();
    expect(rail.contains(loadMoreButton)).toBeTrue();
  });
});
