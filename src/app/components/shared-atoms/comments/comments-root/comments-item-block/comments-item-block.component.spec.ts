import { CommentsItemBlockComponent } from './comments-item-block.component';
import {
  CommentViewConfig,
  defaultCommentViewConfig
} from 'src/app/components/shared-atoms/comments/comments-item/comments-item.component';
import { CommentableEntityTypes, DbComment } from 'src/app/models/comment';

function makeComment(id = 1): DbComment {
  return {
    id,
    content: 'hello',
    entityId: 5,
    entityType: CommentableEntityTypes.PATCH,
    profile: { id: 'user-1', username: 'alice' },
    created: '2024-01-01T00:00:00Z',
    updated: '2024-01-01T00:00:00Z',
  };
}

describe('CommentsItemBlockComponent', () => {
  let comp: CommentsItemBlockComponent;

  beforeEach(() => {
    comp = new CommentsItemBlockComponent();
  });

  it('creates without error', () => {
    expect(comp).toBeTruthy();
  });

  it('viewConfig defaults to defaultCommentViewConfig', () => {
    expect(comp.viewConfig).toEqual(defaultCommentViewConfig);
  });

  it('data input can be assigned', () => {
    comp.data = [makeComment()];
    expect(comp.data[0].id).toBe(1);
  });

  it('viewConfig can be overridden', () => {
    const custom: CommentViewConfig = {
      showContext: true,
      alwaysDeletable: true,
    };
    comp.viewConfig = custom;
    expect(comp.viewConfig).toBe(custom);
  });
});
