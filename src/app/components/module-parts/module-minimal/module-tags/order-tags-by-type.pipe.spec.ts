import {
  Tag,
  TagType
} from 'src/app/models/tag';
import { OrderTagsByTypePipe } from './order-tags-by-type.pipe';


function makeTagEntry(id: number, type: TagType): {
  tag: Tag
} {
  return {tag: {id, name: `tag-${ id }`, type}};
}

describe('OrderTagsByTypePipe', () => {
  let pipe: OrderTagsByTypePipe;
  
  beforeEach(() => {
    pipe = new OrderTagsByTypePipe();
  });
  
  it('sorts tags by display order', () => {
    const input = [
      makeTagEntry(1, TagType.Character),
      makeTagEntry(2, TagType.Source),
      makeTagEntry(3, TagType.Nature)
    ];
    const result = pipe.transform(input) as {
      tag: Tag
    }[];
    expect(result[0].tag.type).toBe(TagType.Source);
    expect(result[1].tag.type).toBe(TagType.Nature);
    expect(result[2].tag.type).toBe(TagType.Character);
  });
  
  it('returns an empty array unchanged', () => {
    expect(pipe.transform([]) as any[]).toEqual([]);
  });
  
  it('returns a single-element array unchanged', () => {
    const input = [makeTagEntry(1, TagType.Nature)];
    expect(pipe.transform(input) as any).toEqual(input);
  });
  
  it('preserves all elements after sorting', () => {
    const input = [
      makeTagEntry(10, TagType.Character),
      makeTagEntry(20, TagType.Source),
      makeTagEntry(30, TagType.Nature),
      makeTagEntry(40, TagType.Source)
    ];
    const result = pipe.transform(input) as {
      tag: Tag
    }[];
    expect(result.length).toBe(4);
    expect(result[0].tag.type).toBe(TagType.Source);
    expect(result[1].tag.type).toBe(TagType.Source);
    expect(result[2].tag.type).toBe(TagType.Nature);
    expect(result[result.length - 1].tag.type).toBe(TagType.Character);
  });

  it('all-same-type array stays in original order', () => {
    const input = [makeTagEntry(1, TagType.Nature), makeTagEntry(2, TagType.Nature)];
    const result = pipe.transform(input) as {tag: Tag}[];
    expect(result.map(x => x.tag.id)).toEqual([1, 2]);
  });
});