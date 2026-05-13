import { Tag } from 'src/app/models/tag';

export interface TagVoteCount {
  moduleTagId: number;
  count: number;
}

/** A locally-created module_tag entry that does not yet exist in server data */
export interface ProposedTag {
  moduleTagId: number;
  tag: Tag;
}
