import { CommentsItemBlockComponent } from './comments-item-block.component';
import { defaultCommentViewConfig } from 'src/app/components/shared-atoms/comments/comments-item/comments-item.component';

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
});
