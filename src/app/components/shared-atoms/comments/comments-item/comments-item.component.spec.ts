import { of, Subject } from 'rxjs';
import { CommentsItemComponent, defaultCommentViewConfig } from './comments-item.component';
import { DbComment } from 'src/app/models/comment';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeComment(id = 10): DbComment {
  return {
    id,
    content: 'Great patch!',
    entityId: 5,
    entityType: 3,
    profile: { id: 'user1', username: 'alice' } as any,
    created: '2024-01-01T00:00:00Z',
    updated: '2024-01-01T00:00:00Z',
  };
}

function makeSnackBarRef(emitAction = false) {
  return {
    onAction: () => emitAction ? of(undefined) : new Subject<void>().asObservable(),
  };
}

function makeComponent(snackBarEmitsAction = false) {
  const deleteComment$ = new Subject<number>();
  const dataService = { deleteComment$ };
  const userService = {};
  const snackBarRef = makeSnackBarRef(snackBarEmitsAction);
  const snackBar = { open: jasmine.createSpy('open').and.returnValue(snackBarRef) };

  const comp = new CommentsItemComponent(
    dataService as any,
    userService as any,
    snackBar as any
  );
  comp.data = makeComment();
  return { comp, dataService, snackBar, deleteComment$ };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CommentsItemComponent', () => {

  describe('defaultCommentViewConfig', () => {
    it('has showContext=false', () => {
      expect(defaultCommentViewConfig.showContext).toBe(false);
    });

    it('has alwaysDeletable=false', () => {
      expect(defaultCommentViewConfig.alwaysDeletable).toBe(false);
    });
  });

  describe('avatarInitials()', () => {
    it('returns the first two characters uppercased', () => {
      const { comp } = makeComponent();
      expect(comp.avatarInitials('alice')).toBe('AL');
    });

    it('returns a single character for single-char usernames', () => {
      const { comp } = makeComponent();
      expect(comp.avatarInitials('z')).toBe('Z');
    });

    it('returns empty string for empty username', () => {
      const { comp } = makeComponent();
      expect(comp.avatarInitials('')).toBe('');
    });

    it('handles two-character username correctly', () => {
      const { comp } = makeComponent();
      expect(comp.avatarInitials('ab')).toBe('AB');
    });

    it('returns only the first two characters for long usernames', () => {
      const { comp } = makeComponent();
      expect(comp.avatarInitials('John Smith').length).toBe(2);
    });
  });

  describe('avatarColor()', () => {
    it('returns a string in hsl format', () => {
      const { comp } = makeComponent();
      const color = comp.avatarColor('alice');
      expect(color).toMatch(/^hsl\(\d+, 55%, 42%\)$/);
    });

    it('is deterministic — same username produces same color', () => {
      const { comp } = makeComponent();
      expect(comp.avatarColor('alice')).toBe(comp.avatarColor('alice'));
    });

    it('produces different colors for different usernames', () => {
      const { comp } = makeComponent();
      const colors = new Set(['alice', 'bob', 'charlie', 'dave', 'eve'].map(u => comp.avatarColor(u)));
      // At least some variation expected across 5 names
      expect(colors.size).toBeGreaterThan(1);
    });

    it('hue is within 0–359 range', () => {
      const { comp } = makeComponent();
      const color = comp.avatarColor('testuser');
      const hue = parseInt(color.match(/hsl\((\d+),/)![1]);
      expect(hue).toBeGreaterThanOrEqual(0);
      expect(hue).toBeLessThan(360);
    });

    it('returns a color for an empty username without throwing', () => {
      const { comp } = makeComponent();
      expect(() => comp.avatarColor('')).not.toThrow();
    });
  });

  describe('requestDelete()', () => {
    it('opens the snackbar with the correct message and action label', () => {
      const { comp, snackBar } = makeComponent(false);
      comp.requestDelete();
      expect(snackBar.open).toHaveBeenCalledWith('Delete this comment?', 'Delete', { duration: 5000 });
    });

    it('does not emit deleteComment$ if the snackbar action is not taken', () => {
      const { comp, deleteComment$ } = makeComponent(false);
      const emitted: number[] = [];
      deleteComment$.subscribe(id => emitted.push(id));
      comp.requestDelete();
      expect(emitted.length).toBe(0);
    });

    it('emits deleteComment$ with the comment id when the snackbar action is taken', () => {
      const { comp, deleteComment$ } = makeComponent(true);
      const emitted: number[] = [];
      deleteComment$.subscribe(id => emitted.push(id));
      comp.data = makeComment(42);
      comp.requestDelete();
      expect(emitted).toEqual([42]);
    });
  });
});
