import { Injectable } from '@angular/core';
import {
  FormControl,
  UntypedFormControl,
  Validators
} from '@angular/forms';
import {
  CustomValidators,
  FormTypes
} from 'src/app/shared-interproject/components/@smart/mat-form-entity/form-element-models';
import {
  BehaviorSubject,
  ReplaySubject,
  Subject
} from "rxjs";
import { SupabaseService } from "src/app/features/backend/supabase.service";
import { SubManager } from "src/app/shared-interproject/directives/subscription-manager";
import {
  map,
  switchMap,
  takeUntil,
  tap,
  withLatestFrom
} from "rxjs/operators";
import { DbComment } from "src/app/models/comment";
import { SharedConstants } from "src/app/shared-interproject/SharedConstants";
import { MatSnackBar } from "@angular/material/snack-bar";
import { sanitizeItemInPipe } from "src/app/shared-interproject/components/@smart/mat-form-entity/app-form-utils";


interface CommentEntityReference {
  entityId: number;
  entityType: CommentableEntityTypes;
}

@Injectable()
export class CommentsDataService extends SubManager {
  fields: {
    submit: {
      code: string;
      flex: string;
      control: UntypedFormControl;
      label: string;
      type: FormTypes
    }
  };
  
  readonly minLength = 3;
  readonly maxLength = 1000;
  readonly pageSize = 25;

  readonly comments$              = new BehaviorSubject<DbComment[] | undefined>(undefined);
  readonly commentsCount$         = new BehaviorSubject<number>(0);
  readonly isSubmitting$          = new BehaviorSubject<boolean>(false);

  // ReplaySubject(1): late subscribers (withLatestFrom) always get the last entity reference.
  readonly requestCommentsUpdate$ = new ReplaySubject<CommentEntityReference>(1);
  readonly requestReset$ = new Subject<void>();
  readonly loadMore$ = new Subject<void>();
  
  readonly submitComment$ = new Subject<string>();
  readonly deleteComment$ = new Subject<number>();

  private currentOffset = 0;
  
  constructor(
    private backend: SupabaseService,
    private snackBar: MatSnackBar,
  ) {
    super();
    
    this.fields = {
      submit: {
        label:   'Add a comment',
        code:    'submit',
        flex:    '6rem',
        control: new FormControl<string>('', [
          Validators.minLength(this.minLength),
          Validators.maxLength(this.maxLength),
          CustomValidators.onlyCleanHtml,
          CustomValidators.notEmpty,
        ]),
        type:    FormTypes.AREA
        
      }
    };
    
    // when requested comment deletion, perform the backend call
    this.deleteComment$.pipe(
      switchMap(x => this.backend.delete.comment(x)),
      withLatestFrom(this.requestCommentsUpdate$),
      takeUntil(this.destroy$)
    ).subscribe(([_, entity]) => {
      SharedConstants.successCustom(this.snackBar, 'Comment removed.');
      this.requestCommentsUpdate$.next(entity);
    });
    
    // every time we receive a new entity id, reset pagination and fetch first page
    this.requestCommentsUpdate$.pipe(
      tap(() => {
        this.comments$.next(undefined);
        this.commentsCount$.next(0);
        this.currentOffset = 0;
      }),
      switchMap(x => this.backend.GET.comments(x.entityId, x.entityType, 0, this.pageSize - 1)),
      takeUntil(this.destroy$),
    ).subscribe(({ data, count }) => {
      this.comments$.next(data ?? []);
      this.commentsCount$.next(count ?? 0);
      this.currentOffset = this.pageSize;
      this.resetField();
    });

    // load next page and append results
    this.loadMore$.pipe(
      withLatestFrom(this.requestCommentsUpdate$),
      switchMap(([_, entity]) =>
        this.backend.GET.comments(
          entity.entityId,
          entity.entityType,
          this.currentOffset,
          this.currentOffset + this.pageSize - 1
        )
      ),
      withLatestFrom(this.comments$),
      takeUntil(this.destroy$)
    ).subscribe(([{ data, count }, existing]) => {
      this.comments$.next([...(existing ?? []), ...(data ?? [])]);
      this.commentsCount$.next(count ?? 0);
      this.currentOffset += this.pageSize;
    });
    
    // when reset has been requested, clean the comments
    this.requestReset$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.comments$.next(undefined);
      this.commentsCount$.next(0);
      this.currentOffset = 0;
      this.resetField();
    });
    
    // when a new comment add has been requested, add the comment by performing the backend call
    this.submitComment$.pipe(
      tap(() => this.isSubmitting$.next(true)),
      sanitizeItemInPipe(),
      withLatestFrom(this.requestCommentsUpdate$),
      switchMap(([comment, entity]) =>
        this.backend.add.comment({
          content: comment,
          entityId: entity.entityId,
          entityType: entity.entityType
        }).pipe(map(() => entity))
      ),
      takeUntil(this.destroy$)
    ).subscribe({
      next: entity => {
        this.isSubmitting$.next(false);
        this.resetField();
        SharedConstants.successCustom(this.snackBar, 'Comment posted.');
        this.requestCommentsUpdate$.next(entity);
      },
      error: () => {
        this.isSubmitting$.next(false);
      }
    });
    
  }
  
  private resetField() {
    this.fields.submit.control.setValue('');
    this.fields.submit.control.markAsUntouched();
  }
}

// profiles = 10, modules = 1, racks = 2, patches = 3, THESE ARE ON DATABASE
export enum CommentableEntityTypes {
  RESERVED = 0,
  PROFILE  = 10,
  MODULE   = 1,
  RACK     = 2,
  PATCH    = 3
}