"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { apiPost, describeError } from "@/lib/client/api";
import type { PrivyActions, PrivyBridgeState, PrivyStateListener } from "./privy-island";

const PrivyIsland = dynamic(() => import("./privy-island"), { ssr: false });

interface Props {
  /** sanitised same-origin path to return to after sign-in */
  next: string | null;
}

interface Failure {
  userId: string;
  message: string;
}

const INITIAL: PrivyBridgeState = { ready: false, authenticated: false, userId: null };

/**
 * One button: "Continue with email or Google". Once Privy says the person is
 * authenticated, swap Privy's access token for a MarketGym session cookie, then go on.
 */
export function PrivyLogin({ next }: Props) {
  const router = useRouter();
  const [state, setState] = useState<PrivyBridgeState>(INITIAL);
  const [failure, setFailure] = useState<Failure | null>(null);
  const actionsRef = useRef<PrivyActions | null>(null);
  const exchangedFor = useRef<string | null>(null);

  const onState = useCallback<PrivyStateListener>((s, actions) => {
    actionsRef.current = actions;
    setState((prev) =>
      prev.ready === s.ready && prev.authenticated === s.authenticated && prev.userId === s.userId ? prev : s,
    );
  }, []);

  const exchange = useCallback(
    async (userId: string) => {
      const actions = actionsRef.current;
      if (!actions) return;
      try {
        const token = await actions.getAccessToken();
        if (!token) throw new Error("Sign-in did not finish. Try again.");
        const data = await apiPost<{ userId: string; isNew: boolean }>("/api/auth/privy", { accessToken: token });
        router.push(data.isNew ? "/app/onboarding" : (next ?? "/app"));
        router.refresh();
      } catch (err) {
        setFailure({ userId, message: describeError(err) });
      }
    },
    [next, router],
  );

  useEffect(() => {
    const { ready, authenticated, userId } = state;
    if (!ready || !authenticated || !userId) return;
    if (exchangedFor.current === userId) return;
    exchangedFor.current = userId;
    void exchange(userId);
  }, [state, exchange]);

  const failed = failure !== null && failure.userId === state.userId;
  const signingIn = state.ready && state.authenticated && !failed;

  function retry() {
    if (!state.userId) return;
    setFailure(null);
    void exchange(state.userId);
  }

  async function switchAccount() {
    setFailure(null);
    exchangedFor.current = null;
    await actionsRef.current?.logout();
  }

  return (
    <div className="space-y-5">
      <PrivyIsland onState={onState} />
      <Button
        type="button"
        size="lg"
        className="w-full transition-[background-color,border-color,color,opacity,scale] active:scale-[0.98]"
        onClick={() => actionsRef.current?.login()}
        disabled={!state.ready || signingIn}
        loading={signingIn}
      >
        {!state.ready ? "Loading sign-in…" : signingIn ? "Signing you in…" : "Continue with email or Google"}
      </Button>
      {failed ? (
        <div role="alert" className="animate-rise-in space-y-3 rounded-lg border border-danger bg-danger-soft p-3 text-sm">
          <p>{failure.message}</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={retry}>
              Try again
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={switchAccount}>
              Use a different account
            </Button>
          </div>
        </div>
      ) : null}
      <p className="border-t border-line pt-5 text-sm leading-relaxed text-muted">
        New or returning, the same button works. Sign-in is handled by Privy. No wallet is created, and MarketGym never
        trades or holds funds.
      </p>
    </div>
  );
}
