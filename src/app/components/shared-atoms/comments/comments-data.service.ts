import { Injectable } from '@angular/core';
import {
  FormControl,
  Validators
} from '@angular/forms';
import {
  CustomValidators,
  FormTypes
} from 'src/app/shared-interproject/components/@smart/mat-form-entity/form-element-models';
import {
  BehaviorSubject,
  Subject
} from "rxjs";
import { SupabaseService } from "src/app/features/backend/supabase.service";
import { SubManager } from "src/app/shared-interproject/directives/subscription-manager";
import {
  filter,
  switchMap,
  takeUntil,
  tap,
  withLatestFrom
} from "rxjs/operators";
import { DbComment } from "src/app/models/comment";
import { SharedConstants } from "src/app/shared-interproject/SharedConstants";
import { MatSnackBar } from "@angular/material/snack-bar";
import { DomSanitizer } from "@angular/platform-browser";
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
      control: FormControl<any>;
      label: string;
      type: FormTypes
    }
  };
  
  readonly maxLength = 1440*2;
  
  readonly comments$              = new BehaviorSubject<DbComment[] | undefined>(undefined);
  readonly requestCommentsUpdate$ = new Subject<CommentEntityReference>();
  readonly requestReset$ = new Subject<void>();
  
  readonly submitComment$ = new Subject<string>();
  readonly deleteComment$ = new Subject<number>();
  
  constructor(
    private backend: SupabaseService,
    // private userService: UserManagementService,
    private snackBar: MatSnackBar,
    private sanitizer: DomSanitizer
    
  ) {
    super();
    
    this.fields = {
      submit: {
        label:   'Add a comment',
        code:    'submit',
        flex:    '6rem',
        control: new FormControl<string>('', [
          // validators as functions
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
      SharedConstants.successCustom(this.snackBar, 'Comment deleted');
      this.requestCommentsUpdate$.next(entity);
    });
    
    // every time we receive a new entity id, get the comments for this entity
    this.requestCommentsUpdate$.pipe(
      tap(() => this.comments$.next(undefined)),
      switchMap(x => this.backend.GET.comments(x.entityId, x.entityType)),
      takeUntil(this.destroy$),
    ).subscribe(data => {
      this.comments$.next(data);
      this.resetField();
    });
    
    
    // when reset has been requested, clean the comments
    this.requestReset$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.comments$.next(undefined);
      this.resetField();
    });
    
    // when a new comment add has been requested, add the comment by performing the backend call
    this.submitComment$.pipe(
      sanitizeItemInPipe(),
      // last check before sending the comment
      filter(x => !!x),
      filter(x => x.length > 0),
      withLatestFrom(this.requestCommentsUpdate$),
      switchMap(([comment, entity]) => this.backend.add.comment({
        content:    comment,
        entityId:   entity.entityId,
        entityType: entity.entityType
      })),
      withLatestFrom(this.requestCommentsUpdate$),
      takeUntil(this.destroy$)
    ).subscribe(([_, entity]) => {
      this.resetField();
      
      SharedConstants.successCustom(this.snackBar, 'Comment added');
      this.requestCommentsUpdate$.next(entity);
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