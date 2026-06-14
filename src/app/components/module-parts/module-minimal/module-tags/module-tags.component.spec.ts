import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { ModuleTagsComponent } from './module-tags.component';
import { Tag, TagType } from 'src/app/models/tag';
import { MinimalModule } from 'src/app/models/module';
import { ProposedTag, TagVoteCount } from './tag-vote/tag-vote-data.types';

// ── Test data ─────────────────────────────────────────────────────────────────

const tagPurpose1: Tag = { id: 1, name: 'Oscillator', type: TagType.Source };
const tagPurpose2: Tag = { id: 4, name: 'Drone', type: TagType.Source };
const tagCharacter: Tag = { id: 2, name: 'Dark', type: TagType.Character };
const tagNature: Tag = { id: 3, name: 'Digital', type: TagType.Nature };

type ModuleTag = MinimalModule['tags'][number];

function makeModuleTag(id: number, tag: Tag, votes: number): ModuleTag {
  return {
    id,
    tag,
    voteCount: Array.from({ length: votes }, (_, i) => ({ moduletagid: id + i }))
  };
}

function makeModule(tags: ModuleTag[] = []): MinimalModule {
  return {
    id: 100,
    name: 'Test Module',
    description: '',
    hp: 4,
    public: true,
    manufacturer: { id: 1, name: 'MFR', logo: null } as any,
    manufacturerId: 1,
    standard: 0 as any,
    tags,
    panels: [],
    createdAt: '',
    updatedAt: '',
  } as any;
}

// ── Mock service ──────────────────────────────────────────────────────────────

function makeService() {
  const _proposedTags$ = new BehaviorSubject<ProposedTag[]>([]);
  const _tagVotes$ = new BehaviorSubject<Map<number, number>>(new Map());
  const _allTags$ = new BehaviorSubject<Tag[]>([]);
  const loadVotes$ = new Subject<TagVoteCount[]>();
  const proposeTag$ = new Subject<{ moduleId: number; tagId: number }>();

  return {
    proposedTags$: _proposedTags$.asObservable(),
    tagVotes$: _tagVotes$.asObservable(),
    allTags$: _allTags$.asObservable(),
    loadVotes$,
    proposeTag$,
    // BehaviorSubject refs for direct mutation in tests
    _proposedTags$,
    _tagVotes$,
    _allTags$,
  };
}

// ── Snapshot helper ───────────────────────────────────────────────────────────

function snapshot<T>(obs: Observable<T>): T {
  let result!: T;
  obs.subscribe(v => (result = v)).unsubscribe();
  return result;
}

// ── Factory ───────────────────────────────────────────────────────────────────

type MockService = ReturnType<typeof makeService>;

function makeComponent(
  data: MinimalModule = makeModule(),
  svc: MockService = makeService()
): { comp: ModuleTagsComponent; svc: MockService } {
  const comp = new ModuleTagsComponent(svc as any);
  comp.data = data;
  return { comp, svc };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ModuleTagsComponent', () => {

  describe('visibleTags$', () => {
    it('emits server tags sorted by voteCount descending', () => {
      const { comp } = makeComponent(makeModule([
        makeModuleTag(11, tagCharacter, 1),
        makeModuleTag(10, tagPurpose1, 3),
      ]));

      const result = snapshot(comp.visibleTags$);

      expect(result.length).toBe(2);
      expect(result[0].tag.id).toBe(tagPurpose1.id);
      expect(result[1].tag.id).toBe(tagCharacter.id);
    });

    it('returns empty array when module has no tags and no proposed tags', () => {
      const { comp } = makeComponent(makeModule([]));
      expect(snapshot(comp.visibleTags$)).toEqual([]);
    });

    it('merges locally proposed tags into the visible list', () => {
      const { comp, svc } = makeComponent(makeModule([makeModuleTag(10, tagPurpose1, 2)]));
      const proposed: ProposedTag[] = [{ moduleTagId: 99, tag: tagNature }];
      svc._proposedTags$.next(proposed);

      const result = snapshot(comp.visibleTags$);

      expect(result.length).toBe(2);
      const tags = result.map(t => t.tag.id);
      expect(tags).toContain(tagPurpose1.id);
      expect(tags).toContain(tagNature.id);
    });

    it('assigns voteCount from tagVotes$ to proposed tags', () => {
      const { comp, svc } = makeComponent(makeModule([]));
      svc._proposedTags$.next([{ moduleTagId: 99, tag: tagNature }]);
      svc._tagVotes$.next(new Map([[99, 5]]));

      const result = snapshot(comp.visibleTags$);

      expect(result[0].voteCount[0].moduletagid).toBe(5);
    });

    it('defaults proposed tag voteCount to 1 when not in tagVotes$', () => {
      const { comp, svc } = makeComponent(makeModule([]));
      svc._proposedTags$.next([{ moduleTagId: 99, tag: tagNature }]);
      // tagVotes$ is empty Map

      const result = snapshot(comp.visibleTags$);

      expect(result[0].voteCount[0].moduletagid).toBe(1);
    });

    it('applies maxTags limit to the sorted result', () => {
      const { comp } = makeComponent(makeModule([
        makeModuleTag(10, tagPurpose1, 3),
        makeModuleTag(11, tagCharacter, 2),
        makeModuleTag(12, tagNature, 1),
      ]));
      comp.maxTags = 2;

      const result = snapshot(comp.visibleTags$);

      expect(result.length).toBe(2);
      expect(result[0].tag.id).toBe(tagPurpose1.id);
    });

    it('returns all tags when maxTags is null', () => {
      const { comp } = makeComponent(makeModule([
        makeModuleTag(10, tagPurpose1, 1),
        makeModuleTag(11, tagCharacter, 1),
        makeModuleTag(12, tagNature, 1),
      ]));
      comp.maxTags = null;

      const result = snapshot(comp.visibleTags$);
      expect(result.length).toBe(3);
    });

    it('resolves optional axis tint classes for balance tags', () => {
      const { comp } = makeComponent();
      expect(comp.axisClassForTag('Oscillator')).toBeNull();

      comp.colorTagsByAxis = true;

      expect(comp.axisClassForTag('Oscillator')).toBe('tag-chip--axis-voices');
      expect(comp.axisClassForTag('Unmapped')).toBeNull();
    });
  });

  describe('availableTags$', () => {
    it('filters out tags already on the module', () => {
      const { comp, svc } = makeComponent(makeModule([makeModuleTag(10, tagPurpose1, 1)]));
      svc._allTags$.next([tagPurpose1, tagCharacter]);

      const result = snapshot(comp.availableTags$);

      expect(result.map(t => t.id)).not.toContain(tagPurpose1.id);
      expect(result.map(t => t.id)).toContain(tagCharacter.id);
    });

    it('filters out locally proposed tags', () => {
      const { comp, svc } = makeComponent(makeModule([]));
      svc._allTags$.next([tagNature, tagCharacter]);
      svc._proposedTags$.next([{ moduleTagId: 99, tag: tagNature }]);

      const result = snapshot(comp.availableTags$);

      expect(result.map(t => t.id)).not.toContain(tagNature.id);
      expect(result.map(t => t.id)).toContain(tagCharacter.id);
    });

    it('returns all allTags when module has no tags and none are proposed', () => {
      const { comp, svc } = makeComponent(makeModule([]));
      svc._allTags$.next([tagNature, tagCharacter, tagPurpose1]);

      const result = snapshot(comp.availableTags$);

      expect(result.length).toBe(3);
    });
  });

  describe('availableTagGroups$', () => {
    it('groups available tags by TagType label', () => {
      const { comp, svc } = makeComponent(makeModule([]));
      svc._allTags$.next([tagPurpose1, tagPurpose2, tagCharacter, tagNature]);

      const groups = snapshot(comp.availableTagGroups$);
      const labels = groups.map(g => g.label);

      expect(labels).toContain('Source');
      expect(labels).toContain('Character');
      expect(labels).toContain('Nature');
      const purposeGroup = groups.find(g => g.label === 'Source')!;
      expect(purposeGroup.tags.length).toBe(2);
    });

    it('returns an empty array when no tags are available', () => {
      const { comp } = makeComponent(makeModule([]));
      // allTags$ starts empty
      expect(snapshot(comp.availableTagGroups$)).toEqual([]);
    });
  });

  describe('openProposer()', () => {
    it('sets proposerOpen$ to true', () => {
      const { comp } = makeComponent();
      comp.openProposer();
      expect(snapshot(comp.proposerOpen$)).toBe(true);
    });

    it('emits true on proposerOpenChange', () => {
      const { comp } = makeComponent();
      let emitted: boolean | undefined;
      comp.proposerOpenChange.subscribe(v => (emitted = v));
      comp.openProposer();
      expect(emitted).toBe(true);
    });
  });

  describe('closeProposer()', () => {
    it('sets proposerOpen$ to false', () => {
      const { comp } = makeComponent();
      comp.openProposer();
      comp.closeProposer();
      expect(snapshot(comp.proposerOpen$)).toBe(false);
    });

    it('emits false on proposerOpenChange', () => {
      const { comp } = makeComponent();
      const emitted: boolean[] = [];
      comp.proposerOpenChange.subscribe(v => emitted.push(v));
      comp.openProposer();
      comp.closeProposer();
      expect(emitted[1]).toBe(false);
    });
  });

  describe('proposeTag()', () => {
    it('calls tagVoteService.proposeTag$.next with correct moduleId and tagId', () => {
      const { comp, svc } = makeComponent(makeModule());
      const emitted: { moduleId: number; tagId: number }[] = [];
      svc.proposeTag$.subscribe(v => emitted.push(v));

      comp.proposeTag(tagNature);

      expect(emitted.length).toBe(1);
      expect(emitted[0]).toEqual({ moduleId: 100, tagId: tagNature.id });
    });

    it('closes the proposer after proposing', () => {
      const { comp } = makeComponent(makeModule());
      comp.openProposer();
      comp.proposeTag(tagNature);
      expect(snapshot(comp.proposerOpen$)).toBe(false);
    });
  });

  describe('ngOnInit()', () => {
    it('calls loadVotes$.next with preloaded vote counts derived from data.tags', () => {
      const { comp, svc } = makeComponent(makeModule([
        makeModuleTag(10, tagPurpose1, 3),
        makeModuleTag(11, tagCharacter, 1),
      ]));
      const emitted: TagVoteCount[][] = [];
      svc.loadVotes$.subscribe(v => emitted.push(v));

      comp.ngOnInit();

      expect(emitted.length).toBe(1);
      expect(emitted[0]).toEqual([
        { moduleTagId: 10, count: 3 },
        { moduleTagId: 11, count: 1 },
      ]);
    });

    it('calls loadVotes$.next with empty array when data has no tags', () => {
      const { comp, svc } = makeComponent(makeModule([]));
      const emitted: TagVoteCount[][] = [];
      svc.loadVotes$.subscribe(v => emitted.push(v));

      comp.ngOnInit();

      expect(emitted.length).toBe(1);
      expect(emitted[0]).toEqual([]);
    });
  });
});
