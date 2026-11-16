/**
 * Local mode (Supabase not configured): one implicit learner. No cookies,
 * no sign-up; every request is this user. Clearly labelled in the UI.
 */
export interface AuthUser {
  id: string;
  email: string | null;
}

export const LOCAL_USER_ID = "local-demo-user";

export const LOCAL_USER: AuthUser = Object.freeze({ id: LOCAL_USER_ID, email: null });
