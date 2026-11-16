"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui";
import { apiPost } from "@/lib/client/api";

export function SignOutButton({ compact }: { compact?: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  async function signOut() {
    setPending(true);
    try {
      await apiPost("/api/auth/logout", {});
    } catch {
      /* cookie may already be gone; continue to login either way */
    }
    router.push("/login");
    router.refresh();
  }
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={signOut}
      disabled={pending}
      aria-label={compact ? "Sign out" : undefined}
    >
      <LogOut className="size-4" aria-hidden="true" />
      {compact ? null : pending ? "Signing out…" : "Sign out"}
    </Button>
  );
}
