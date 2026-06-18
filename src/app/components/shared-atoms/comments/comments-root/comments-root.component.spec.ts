import { CommonModule } from '@angular/common';
import { Component, Input, NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { TextFieldModule } from '@angular/cdk/text-field';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { BehaviorSubject, ReplaySubject, Subject } from 'rxjs';
import { UserManagementService } from 'src/app/features/backbone/login/user-management.service';
import { AppStateService } from 'src/app/shared-interproject/app-state.service';
import { CommentsDataService } from '../comments-data.service';
import { CommentsRootComponent } from './comments-root.component';

interface MatFormEntityStubDataPack {
  label?: string;
  control: FormControl<string | null>;
}

@Component({
  selector: 'lib-mat-form-entity',
  template: `
    <mat-form-field class="layout-flex-full">
      <mat-label>{{ dataPack?.label ?? 'Add a comment' }}</mat-label>
      <textarea
        [formControl]="dataPack.control"
        cdkAutosizeMinRows="1"
        cdkTextareaAutosize
        matInput
      ></textarea>
      <button
        [disabled]="dataPack.control.value === '' || dataPack.control.value == null"
        matSuffix
        type="button"
      >×</button>
    </mat-form-field>
  `,
  standalone: false,
})
class MatFormEntityStubComponent {
  @Input({ required: true }) dataPack!: MatFormEntityStubDataPack;
  @Input() hint = '';
}

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
      declarations: [CommentsRootComponent, MatFormEntityStubComponent],
      imports: [
        CommonModule,
        MatFormFieldModule,
        MatInputModule,
        NoopAnimationsModule,
        ReactiveFormsModule,
        TextFieldModule,
      ],
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
                label: 'Add a comment',
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

  it('stretches the composer form field to the rendered rail width', () => {
    build();

    const host: HTMLElement = fixture.nativeElement;
    host.style.display = 'block';
    host.style.width = '45rem';
    fixture.detectChanges();

    const rail: HTMLElement = host.querySelector('.commentsRoot__rail');
    const composerField: HTMLElement = host.querySelector('.commentsRoot__composerField');
    const formEntity: HTMLElement = host.querySelector('.commentsRoot__composerField lib-mat-form-entity');
    const formField: HTMLElement = host.querySelector('.commentsRoot__composerField .mat-mdc-form-field');

    const formEntityStyle = getComputedStyle(formEntity);
    const formFieldStyle = getComputedStyle(formField);
    const railWidth = rail.getBoundingClientRect().width;
    const composerFieldWidth = composerField.getBoundingClientRect().width;
    const formFieldWidth = formField.getBoundingClientRect().width;

    expect(formEntityStyle.display).toBe('block');
    expect(formFieldStyle.display).toBe('block');
    expect(composerFieldWidth).toBeGreaterThanOrEqual(railWidth - 1);
    expect(formFieldWidth).toBeGreaterThanOrEqual(railWidth - 1);
    expect(formFieldWidth).toBeLessThanOrEqual(railWidth + 1);
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

  it('hides the load-more button when count equals loaded comments', () => {
    build({
      comments: [{ id: 1, content: 'Only comment' }],
      count: 1,
    });

    const loadMoreButton = fixture.nativeElement.querySelector('.commentsRoot__loadMore');
    expect(loadMoreButton).toBeNull();
  });

  it('hides the composer when user is not logged in', () => {
    build({ user: null });

    const composer = fixture.nativeElement.querySelector('.commentsRoot__composer');
    expect(composer).toBeNull();
  });

  it('shows remaining count in load-more label', () => {
    build({
      comments: [{ id: 1, content: 'First' }],
      count: 5,
    });

    const loadMoreButton = fixture.nativeElement.querySelector('.commentsRoot__loadMore');
    expect(loadMoreButton).not.toBeNull();
    expect(loadMoreButton.textContent).toContain('4 remaining');
  });
});
