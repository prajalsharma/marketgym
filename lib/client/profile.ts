import type { Profile } from "@/lib/types/learning";

export const LOCAL_USER_ID = "local-demo-user";

/** Profile may carry an email in Supabase mode; the frozen type does not, so read it loosely. */
export function isLocalProfile(profile: Profile | null): boolean {
  if (!profile) return false;
  const email = (profile as Profile & { email?: string | null }).email;
  if (email === null) return true;
  return profile.id === LOCAL_USER_ID;
}

export function firstName(profile: Profile | null): string {
  const name = profile?.displayName?.trim();
  if (!name) return "there";
  return name.split(/\s+/)[0];
}
