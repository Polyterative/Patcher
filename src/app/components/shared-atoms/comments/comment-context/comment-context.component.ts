import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
} from '@angular/core';
import { DbComment } from "src/app/models/comment";
import { CommentableEntityTypes } from "src/app/components/shared-atoms/comments/comments-data.service";
import {
  MatChip,
  MatChipSet
} from "@angular/material/chips";
import {
  AsyncPipe,
  NgIf
} from "@angular/common";
import { SubManager } from "src/app/shared-interproject/directives/subscription-manager";
import { SupabaseService } from "src/app/features/backend/supabase.service";
import {
  map,
  takeUntil
} from "rxjs/operators";
import { BehaviorSubject } from "rxjs";
import { QueryJoins } from "src/app/features/backend/DatabaseStrings";
import { Router } from "@angular/router";
import { MatButton } from "@angular/material/button";


interface CommentContext {
  description: string;
  URL: string[];
}

@Component({
  selector: 'app-comment-context',
  standalone: true,
  imports: [
    MatChipSet,
    MatChip,
    NgIf,
    AsyncPipe,
    MatButton
  ],
  templateUrl: './comment-context.component.html',
  styleUrl: './comment-context.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CommentContextComponent extends SubManager implements OnInit {
  @Input() data: DbComment;
  
  entityTypes = CommentableEntityTypes;
  
  // example: "Module: Maths by Make Noise"
  contextInformation$ = new BehaviorSubject<CommentContext | undefined>(undefined);
  
  // fake foreign key add entity information for each comment
  // use entity id and entity type to get the entity information
  // where entity type is 1, get the module information
  // where entity type is 2, get the patch information
  // where entity type is 3, get the rack information
  
  constructor(
    private backend: SupabaseService,
    private router: Router,
    // private userService: UserManagementService,
    // private snackBar: MatSnackBar,
    // private sanitizer: DomSanitizer
  ) {
    
    super();
  }
  
  ngOnInit(): void {
    
    //   when data is available, get the entity information to create context information
    switch (this.data.entityType) {
      case this.entityTypes.MODULE:
        // get module information
        this.backend.GET.moduleWithId(
          this.data.entityId,
          `name,id,${
            QueryJoins.manufacturer
          }`)
          .pipe(
            // map to data
            map(x => x.data),
            takeUntil(this.destroy$)
          )
          .subscribe(module => {
            this.contextInformation$.next(
              {
                description: `Module: ${ module.name } by ${ module.manufacturer.name }`,
                URL: [
                  'modules',
                  'details',
                  module.id
                ]
              }
            );
          });
        break;
      case this.entityTypes.PATCH:
        // get patch information
        break;
      case this.entityTypes.RACK:
        // get rack information
        break;
      default:
      // do nothing
    }
    
  }
  
  
  openURL() {
    this.router.navigate(this.contextInformation$.value.URL);
  }
}