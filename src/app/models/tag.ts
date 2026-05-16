export enum TagType {
  Purpose = 0, Nature = 1, Character = 2,
}

export interface Tag {
  id: number;
  name: string;
  type: TagType;
}

export interface TagSuggestionGroup {
  label: string;
  tags: Tag[];
}

export const TAG_TYPE_LABELS: Record<TagType, string> = {
  [TagType.Purpose]: 'Purpose',
  [TagType.Nature]: 'Nature',
  [TagType.Character]: 'Character'
};
