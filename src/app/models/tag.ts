export enum TagType {
  Purpose = 0, Nature = 1, Character = 2,
}

export interface Tag {
  id: number;
  name: string;
  type: TagType;
}