"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui";
import { apiPost } from "@/lib/client/api";
import { privyEnabled } from "@/lib/client/privy";
import type { PrivyStateListener } from "@/components/auth/privy-island";

const PrivyIsland = dynamic(() => import("@/components/auth/privy-island"), { ssr: false });

/** Give Privy this long to load and log out before leaving anyway; our own session is already cleared. */
const PRIVY_LOGOUT_TIMEOUT_MS = 5000;

export function SignOutButton({ compact }: { compact?: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  /** Privy is mounted only while signing out, so platform pages do not load it otherwise. */
  const [privyMounted, setPrivyMounted] = useState(false);
  const left = useRef(false);
  const loggingOut = useRef(false);

  const leave = useCallback(() => {
    if (left.current) return;
    left.current = true;
    router.push("/login");
    router.refresh();
  }, [router]);

  const onPrivyState = useCallback<PrivyStateListener>(
    (state, actions) => {
      if (!state.ready || loggingOut.current) return;
      loggingOut.current = true;
      if (!state.authenticated) {
        leave();
        return;
      }
      actions.logout().catch(() => undefined).finally(leave);
    },
    [leave],
  );

  async function signOut() {
    setPending(true);
    try {
      await apiPost("/api/auth/logout", {});
    } catch {
      /* cookie may already be gone; continue to login either way */
    }
    if (privyEnabled) {
      setPrivyMounted(true);
      window.setTimeout(leave, PRIVY_LOGOUT_TIMEOUT_MS);
      return;
    }
    leave();
  }

  return (
    <>
      {privyMounted ? <PrivyIsland onState={onPrivyState} /> : null}
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
    </>
  );
}
