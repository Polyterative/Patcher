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
import { animate, animateChild, query, style, transition, trigger } from '@angular/animations';
import { MinimalModule } from 'src/app/models/module';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';
import {
  TAG_TYPE_DISPLAY_ORDER,
  TAG_TYPE_LABELS,
  Tag,
  TagSuggestionGroup
} from 'src/app/models/tag';
import { resolveFunctionalTagAxis } from 'src/app/components/rack-parts/rack-balance-analysis.utils';

export interface ProposerTag {
  tag: Tag;
  /** null when the tag is not yet linked to the module */
  moduleTagId: number | null;
  isLinked: boolean;
  isVotedByMe: boolean;
  voteCount: number;
}

export interface ProposerTagGroup {
  label: string;
  tags: ProposerTag[];
}

@Component({
  selector: 'app-module-tags',
  templateUrl: './module-tags.component.html',
  styleUrls: ['./module-tags.component.scss'],
  animations: [
    trigger('enter', [
      transition(':enter', [
        style({opacity: 0}),
        animate('225ms {{ delay }}ms ease', style({opacity: 1})),
        query('@*', animateChild(), { optional: true })
      ], { params: { delay: 0 } })
    ]),
    trigger('leave', [
      transition(':leave', [
        animate('1ms ease', style({opacity: 0}))
      ])
    ]),
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
  @Input() colorTagsByAxis = false;
  @Output() proposerOpenChange = new EventEmitter<boolean>();

  proposerOpen$ = new BehaviorSubject<boolean>(false);
  
  /** All tags to display — server data merged with locally proposed tags */
  visibleTags$: Observable<MinimalModule['tags']>;
  
  /** Tags not yet linked to this module — filters out both server tags and locally proposed ones */
  availableTags$: Observable<Tag[]>;
  availableTagGroups$: Observable<TagSuggestionGroup[]>;

  /** All tags enriched with link/vote state — used in the proposer panel */
  proposerTagGroups$: Observable<ProposerTagGroup[]>;

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

        const orderedLabels = TAG_TYPE_DISPLAY_ORDER
          .map(type => TAG_TYPE_LABELS[type])
          .filter(label => grouped.has(label));

        return orderedLabels.map(label => ({
          label,
          tags: grouped.get(label)!
        }));
      })
    );

    this.proposerTagGroups$ = combineLatest([
      this.tagVoteService.allTags$,
      this.tagVoteService.proposedTags$,
      this.tagVoteService.myVotes$,
      this.tagVoteService.tagVotes$,
    ]).pipe(
      map(([allTags, proposed, myVotes, tagVotes]) => {
        const serverTags = this.data?.tags ?? [];

        // Build tagId → moduleTagId map from both server tags and locally proposed ones
        const linkedTagMap = new Map<number, number>();
        for (const t of serverTags) {
          linkedTagMap.set(t.tag.id, t.id);
        }
        for (const p of proposed) {
          if (!linkedTagMap.has(p.tag.id)) {
            linkedTagMap.set(p.tag.id, p.moduleTagId);
          }
        }

        const proposerTags: ProposerTag[] = allTags.map(tag => {
          const moduleTagId = linkedTagMap.get(tag.id) ?? null;
          const isLinked = moduleTagId !== null;
          const isVotedByMe = isLinked ? myVotes.has(moduleTagId!) : false;
          const voteCount = isLinked ? (tagVotes.get(moduleTagId!) ?? 0) : 0;
          return { tag, moduleTagId, isLinked, isVotedByMe, voteCount };
        });

        const grouped = new Map<string, ProposerTag[]>();
        for (const pt of proposerTags) {
          const label = TAG_TYPE_LABELS[pt.tag.type] ?? 'Other';
          grouped.set(label, [...(grouped.get(label) ?? []), pt]);
        }

        const orderedLabels = TAG_TYPE_DISPLAY_ORDER
          .map(type => TAG_TYPE_LABELS[type])
          .filter(label => grouped.has(label));

        return orderedLabels.map(label => ({
          label,
          tags: grouped.get(label)!
        }));
      })
    );
  }

  axisClassForTag(tag: Tag): string | null {
    if (!this.colorTagsByAxis) {
      return null;
    }
    const axis = resolveFunctionalTagAxis(tag);
    return axis ? `tag-chip--axis-${ axis }` : null;
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

  proposeOrToggle(pt: ProposerTag): void {
    if (pt.isLinked && pt.moduleTagId !== null) {
      this.tagVoteService.toggleVote$.next(pt.moduleTagId);
    } else {
      this.tagVoteService.proposeTag$.next({moduleId: this.data.id, tagId: pt.tag.id});
    }
  }
}
