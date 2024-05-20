import {
  Injectable,
  SecurityContext
} from '@angular/core';
import {
  UntypedFormControl,
  Validators
} from '@angular/forms';
import { FormTypes } from 'src/app/shared-interproject/components/@smart/mat-form-entity/form-element-models';
import {
  BehaviorSubject,
  Subject
} from "rxjs";
import { SupabaseService } from "src/app/features/backend/supabase.service";
import { SubManager } from "src/app/shared-interproject/directives/subscription-manager";
import {
  filter,
  map,
  switchMap,
  takeUntil,
  tap,
  withLatestFrom
} from "rxjs/operators";
import { DbComment } from "src/app/models/comment";
import { SharedConstants } from "src/app/shared-interproject/SharedConstants";
import { MatSnackBar } from "@angular/material/snack-bar";
import { DomSanitizer } from "@angular/platform-browser";


interface CommentEntityReference {
  entityId: number;
  entityType: CommentableEntityTypes;
}

@Injectable()
export class CommentsDataService extends SubManager {
  fields = {
    submit: {
      label:   'Add a comment',
      code:    'submit',
      flex:    '6rem',
      control: new UntypedFormControl('', [
        // validators as functions
        Validators.maxLength(1440),
        (control) => {
          if (/^\s*$/.test(control.value)) {
            return {empty: true};
          }
          return null;
        },
        // (control) => {
        //   if (!/^[a-zA-Z0-9\s]*$/.test(control.value)) {
        //     return {invalidChars: true};
        //   }
        //   return null;
        // }
      ]),
      type:    FormTypes.AREA
      
    }
  };
  
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
      tap(x => this.comments$.next(undefined)),
      switchMap(x => this.backend.get.comments(x.entityId, x.entityType)),
      takeUntil(this.destroy$),
    ).subscribe(data => {
      this.comments$.next(data);
    });
    
    
    // when reset has been requested, clean the comments
    this.requestReset$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.comments$.next(undefined);
    });
    
    // when a new comment add has been requested, add the comment by performing the backend call
    this.submitComment$.pipe(
      //sanitize the comment
      map((x: string) => this.sanitizer.sanitize(SecurityContext.HTML, x.trim())),
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
      this.fields.submit.control.setValue('');
      this.fields.submit.control.markAsUntouched();
      SharedConstants.successCustom(this.snackBar, 'Comment added');
      this.requestCommentsUpdate$.next(entity);
    });
    
  }
  
}

// profiles = 10, modules = 1, racks = 2, patches = 3,
export enum CommentableEntityTypes {
  RESERVED = 0,
  PROFILE  = 10,
  MODULE   = 1,
  RACK     = 2,
  PATCH    = 3
}