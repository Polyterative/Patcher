import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
} from '@angular/core';
import {
  BehaviorSubject,
  combineLatest,
  Observable
} from 'rxjs';
import { map } from 'rxjs/operators';
import {
  TagVoteCount,
  TagVoteDataService
} from 'src/app/components/module-parts/module-minimal/module-tags/tag-vote/tag-vote-data.service';
import {
  fadeInOnEnterAnimation,
  fadeOutOnLeaveAnimation
} from 'angular-animations';
import { MinimalModule } from 'src/app/models/module';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';
import { Tag } from 'src/app/models/tag';


@Component({
  selector: 'app-module-tags',
  templateUrl: './module-tags.component.html',
  styleUrls: ['./module-tags.component.scss'],
  animations: [
    fadeInOnEnterAnimation({
      anchor: 'enter',
      duration: 225,
      animateChildren: 'after'
    }),
    fadeOutOnLeaveAnimation({
      anchor: 'leave',
      duration: 1
    })
  ],
  providers: [TagVoteDataService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class ModuleTagsComponent extends SubManager implements OnInit {

  @Input() data: MinimalModule;
  @Input() showCounts = true;
  @Input() readOnly = false;
  @Input() maxTags: number | null = null;

  proposerOpen$ = new BehaviorSubject<boolean>(false);
  
  /** All tags to display — server data merged with locally proposed tags */
  visibleTags$: Observable<MinimalModule['tags']>;
  
  /** Tags not yet linked to this module — filters out both server tags and locally proposed ones */
  availableTags$: Observable<Tag[]>;

  constructor(public tagVoteService: TagVoteDataService) {
    super();
    
    this.visibleTags$ = combineLatest([
      this.tagVoteService.proposedTags$,
      this.tagVoteService.tagVotes$,
    ]).pipe(
      map(([proposed, tagVotes]) => {
        // Merge server tags with any locally proposed tags
        const serverTags: MinimalModule['tags'] = this.data?.tags ?? [];
        const proposedAsModuleTags: MinimalModule['tags'] = proposed.map(p => ({
          id: p.moduleTagId,
          tag: p.tag,
          voteCount: [{moduletagid: tagVotes.get(p.moduleTagId) ?? 1}]
        }));
        const merged = [...serverTags, ...proposedAsModuleTags];
        const sorted = merged.sort(
          (a, b) => (b.voteCount?.length ?? 0) - (a.voteCount?.length ?? 0)
        );
        return this.maxTags ? sorted.slice(0, this.maxTags) : sorted;
      })
    );

    this.availableTags$ = combineLatest([
      this.tagVoteService.allTags$,
      this.tagVoteService.proposedTags$,
    ]).pipe(
      map(([allTags, proposed]) => {
        const serverTagIds = new Set((this.data?.tags ?? []).map(t => t.tag.id));
        const proposedTagIds = new Set(proposed.map(p => p.tag.id));
        return allTags.filter(t => !serverTagIds.has(t.id) && !proposedTagIds.has(t.id));
      })
    );
  }

  ngOnInit(): void {
    const preloadedCounts: TagVoteCount[] = (this.data.tags ?? []).map(t => ({
      moduleTagId: t.id,
      count: t.voteCount?.length ?? 0
    }));
    this.tagVoteService.loadVotes$.next(preloadedCounts);
  }
  
  proposeTag(tag: Tag): void {
    this.tagVoteService.proposeTag$.next({moduleId: this.data.id, tagId: tag.id});
    this.proposerOpen$.next(false);
  }
}
