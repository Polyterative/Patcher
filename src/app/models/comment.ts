import { PublicUser } from "src/app/models/user";


export interface DbComment {
  id: number;
  content: string;
  entityId: number;
  entityType: number;
  profile: PublicUser;
  created: string;
  updated: string;
}

// profiles = 10, modules = 1, racks = 2, patches = 3. These values are stored in the database.
export enum CommentableEntityTypes {
  RESERVED = 0,
  PROFILE  = 10,
  MODULE   = 1,
  RACK     = 2,
  PATCH    = 3
}