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

  it('data input can be assigned', () => {
    comp.data = [{id: 1, content: 'hello'} as any];
    expect(comp.data[0].id).toBe(1);
  });

  it('viewConfig can be overridden', () => {
    const custom: any = {showAuthor: false};
    comp.viewConfig = custom;
    expect(comp.viewConfig).toBe(custom);
  });
});
