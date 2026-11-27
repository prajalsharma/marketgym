"use client";

import { privyEnabled } from "@/lib/client/privy";
import { AuthForm } from "./auth-form";
import { PrivyLogin } from "./privy-login";

interface Props {
  mode: "login" | "signup";
  next: string | null;
}

/** Privy when NEXT_PUBLIC_PRIVY_APP_ID is set; otherwise the existing local / Supabase form, unchanged. */
export function AuthEntry({ mode, next }: Props) {
  if (privyEnabled) return <PrivyLogin next={next} />;
  return <AuthForm mode={mode} />;
}
