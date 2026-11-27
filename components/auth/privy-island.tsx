"use client";

/**
 * Privy client island. Load it with next/dynamic({ ssr: false }) and only when
 * NEXT_PUBLIC_PRIVY_APP_ID is set. It reports state upward through a callback
 * kept in a ref, and publishes only when ready / authenticated / user id change.
 * (Publishing on every render caused an infinite update loop in a previous project.)
 */
import { useEffect, useRef, useState, type RefObject } from "react";
import { PrivyProvider, usePrivy } from "@privy-io/react-auth";
import { PRIVY_APP_ID, PRIVY_CONFIG } from "@/lib/client/privy";

export interface PrivyBridgeState {
  ready: boolean;
  authenticated: boolean;
  userId: string | null;
}

/** Stable for the island's lifetime; always calls Privy's latest functions. */
export interface PrivyActions {
  login: () => void;
  logout: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
}

export type PrivyStateListener = (state: PrivyBridgeState, actions: PrivyActions) => void;

export default function PrivyIsland({ onState }: { onState: PrivyStateListener }) {
  const listener = useRef<PrivyStateListener>(onState);
  useEffect(() => {
    listener.current = onState;
  }, [onState]);

  return (
    <PrivyProvider appId={PRIVY_APP_ID} config={PRIVY_CONFIG}>
      <Bridge listener={listener} />
    </PrivyProvider>
  );
}

function Bridge({ listener }: { listener: RefObject<PrivyStateListener> }) {
  const { ready, authenticated, user, login, logout, getAccessToken } = usePrivy();
  const latest = useRef({ login, logout, getAccessToken });
  useEffect(() => {
    latest.current = { login, logout, getAccessToken };
  });

  const [actions] = useState<PrivyActions>(() => ({
    login: () => latest.current.login(),
    logout: () => latest.current.logout(),
    getAccessToken: () => latest.current.getAccessToken(),
  }));

  const userId = user?.id ?? null;
  useEffect(() => {
    listener.current({ ready, authenticated, userId }, actions);
  }, [ready, authenticated, userId, actions, listener]);

  return null;
}
