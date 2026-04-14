export interface PublicUser {
  id: string;
  username: string;
}

export interface PublicProfile extends PublicUser {
  avatarUrl: string | null;
  public: boolean;
  website: string | null;
}
