import type { Profile } from "@/lib/types/learning";
import { privyEnabled } from "./privy";

export const LOCAL_USER_ID = "local-demo-user";

/** Profile may carry an email in Supabase mode; the frozen type does not, so read it loosely. */
export function isLocalProfile(profile: Profile | null): boolean {
  if (!profile) return false;
  if (profile.id === LOCAL_USER_ID) return true;
  // Privy accounts may have no email (e.g. never shared), so a null email only means local mode without Privy.
  if (privyEnabled) return false;
  const email = (profile as Profile & { email?: string | null }).email;
  return email === null;
}

export function firstName(profile: Profile | null): string {
  const name = profile?.displayName?.trim();
  if (!name) return "there";
  return name.split(/\s+/)[0];
}
