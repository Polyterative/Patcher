import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
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
import {
  animate,
  style,
  transition,
  trigger
} from '@angular/animations';
import { MinimalModule } from 'src/app/models/module';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';
import {
  Tag,
  TagType
} from 'src/app/models/tag';

interface TagSuggestionGroup {
  label: string;
  tags: Tag[];
}

const TAG_TYPE_LABELS: Record<TagType, string> = {
  [TagType.Purpose]: 'Purpose',
  [TagType.Nature]: 'Nature',
  [TagType.Character]: 'Character'
};


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
    }),
    trigger('tagChooserPanel', [
      transition(':enter', [
        style({
          height: 0,
          opacity: 0,
          marginTop: 0,
          transform: 'translateY(-0.35rem)'
        }),
        animate('220ms cubic-bezier(0.2, 0, 0, 1)', style({
          height: '*',
          opacity: 1,
          marginTop: '*',
          transform: 'translateY(0)'
        }))
      ]),
      transition(':leave', [
        style({
          height: '*',
          opacity: 1,
          marginTop: '*',
          transform: 'translateY(0)'
        }),
        animate('180ms cubic-bezier(0.4, 0, 1, 1)', style({
          height: 0,
          opacity: 0,
          marginTop: 0,
          transform: 'translateY(-0.25rem)'
        }))
      ])
    ])
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
  @Output() proposerOpenChange = new EventEmitter<boolean>();

  proposerOpen$ = new BehaviorSubject<boolean>(false);
  
  /** All tags to display — server data merged with locally proposed tags */
  visibleTags$: Observable<MinimalModule['tags']>;
  
  /** Tags not yet linked to this module — filters out both server tags and locally proposed ones */
  availableTags$: Observable<Tag[]>;
  availableTagGroups$: Observable<TagSuggestionGroup[]>;

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

    this.availableTagGroups$ = this.availableTags$.pipe(
      map(tags => {
        const grouped = new Map<string, Tag[]>();

        for (const tag of tags) {
          const label = TAG_TYPE_LABELS[tag.type] ?? 'Other';
          grouped.set(label, [...(grouped.get(label) ?? []), tag]);
        }

        return Array.from(grouped.entries()).map(([label, groupedTags]) => ({
          label,
          tags: groupedTags
        }));
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
  
  openProposer(): void {
    this.proposerOpen$.next(true);
    this.proposerOpenChange.emit(true);
  }

  closeProposer(): void {
    this.proposerOpen$.next(false);
    this.proposerOpenChange.emit(false);
  }

  proposeTag(tag: Tag): void {
    this.tagVoteService.proposeTag$.next({moduleId: this.data.id, tagId: tag.id});
    this.closeProposer();
  }
}
