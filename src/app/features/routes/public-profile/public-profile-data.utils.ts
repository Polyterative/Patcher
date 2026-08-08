import { PublicProfile } from 'src/app/models/user';

export function mapProfile(rawProfile: Record<string, unknown> | null | undefined): PublicProfile | null {
  if (!rawProfile?.id || !rawProfile?.username) {
    return null;
  }

  return {
    id: rawProfile.id as string,
    username: rawProfile.username as string,
    public: !!rawProfile.public,
    website: (rawProfile.website as string | null) ?? null,
    avatarUrl: (rawProfile.avatar_url as string | null) ?? null,
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
