import { PublicUser } from "src/app/models/user";


export interface DbComment {
  id: number;
  content: string;
  entityId: number;
  entityType: number;
  profile: PublicUser;
  created: string;
  updated: string;
  deletedAt: string;
}