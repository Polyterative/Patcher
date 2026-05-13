import { PublicProfile } from 'src/app/models/user';

export function mapProfile(rawProfile: any): PublicProfile | null {
  if (!rawProfile?.id || !rawProfile?.username) {
    return null;
  }

  return {
    id: rawProfile.id,
    username: rawProfile.username,
    public: !!rawProfile.public,
    website: rawProfile.website ?? null,
    avatarUrl: rawProfile.avatar_url ?? null,
  };
}

export function toLimitedProfile(profile: PublicProfile): PublicProfile {
  return {
    id: profile.id,
    username: profile.username,
    public: profile.public,
    website: null,
    avatarUrl: null,
  };
}
