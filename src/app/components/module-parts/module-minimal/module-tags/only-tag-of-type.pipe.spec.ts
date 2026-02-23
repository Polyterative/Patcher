import {
  Tag,
  TagType
} from 'src/app/models/tag';
import { OnlyTagOfTypePipe } from './only-tag-of-type.pipe';


function makeTagEntry(id: number, type: TagType): {
  tag: Tag
} {
  return {tag: {id, name: `tag-${ id }`, type}};
}

describe('OnlyTagOfTypePipe', () => {
  let pipe: OnlyTagOfTypePipe;
  
  beforeEach(() => {
    pipe = new OnlyTagOfTypePipe();
  });
  
  it('returns only tags matching the requested type', () => {
    const input = [
      makeTagEntry(1, TagType.Purpose),
      makeTagEntry(2, TagType.Nature),
      makeTagEntry(3, TagType.Purpose)
    ];
    const result = pipe.transform(input, TagType.Purpose) as Tag[];
    expect(result.length).toBe(2);
    expect(result.every(t => t.type === TagType.Purpose)).toBeTrue();
  });
  
  it('returns empty array when no tags match the type', () => {
    const input = [makeTagEntry(1, TagType.Nature), makeTagEntry(2, TagType.Character)];
    const result = pipe.transform(input, TagType.Purpose) as Tag[];
    expect(result.length).toBe(0);
  });
  
  it('returns empty array for empty input', () => {
    const result = pipe.transform([], TagType.Nature) as Tag[];
    expect(result.length).toBe(0);
  });
  
  it('returns the tag objects (not the wrapper)', () => {
    const input = [makeTagEntry(7, TagType.Character)];
    const result = pipe.transform(input, TagType.Character) as Tag[];
    expect(result[0].id).toBe(7);
    expect(result[0].name).toBe('tag-7');
  });
});