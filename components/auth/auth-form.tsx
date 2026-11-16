"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { Button, Input, Label } from "@/components/ui";
import { apiPost, describeError, isApiClientError } from "@/lib/client/api";

interface Props {
  mode: "login" | "signup";
}

type AuthResponse = { localMode?: boolean; redirectTo?: string } | null;

/**
 * Email + password. In local mode the API answers { localMode: true }; we show a
 * one-line note and go straight to onboarding. A "Continue" path is always visible.
 */
export function AuthForm({ mode }: Props) {
  const router = useRouter();
  const emailId = useId();
  const passwordId = useId();
  const nameId = useId();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localNote, setLocalNote] = useState(false);

  const isSignup = mode === "signup";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const data = await apiPost<AuthResponse>(`/api/auth/${isSignup ? "signup" : "login"}`, {
        email: email.trim(),
        password,
        ...(isSignup && displayName.trim() ? { displayName: displayName.trim() } : {}),
      });
      if (data && data.localMode) {
        setLocalNote(true);
        router.push("/app/onboarding");
        return;
      }
      router.push(data?.redirectTo ?? (isSignup ? "/app/onboarding" : "/app"));
      router.refresh();
    } catch (err) {
      if (isApiClientError(err) && err.code === "not_found") {
        // Auth route not deployed: treat as local mode so the learner can continue.
        setLocalNote(true);
        router.push("/app/onboarding");
        return;
      }
      setError(describeError(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {isSignup ? (
        <div className="space-y-1.5">
          <Label htmlFor={nameId}>Name</Label>
          <Input
            id={nameId}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            autoComplete="name"
            placeholder="What should the coach call you?"
          />
        </div>
      ) : null}
      <div className="space-y-1.5">
        <Label htmlFor={emailId}>Email</Label>
        <Input
          id={emailId}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
          inputMode="email"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={passwordId}>Password</Label>
        <Input
          id={passwordId}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={isSignup ? "new-password" : "current-password"}
          required
          minLength={8}
        />
        {isSignup ? <p className="text-xs text-muted">At least 8 characters.</p> : null}
      </div>

      {error ? (
        <p role="alert" className="rounded-md border border-danger bg-danger-soft p-3 text-sm">
          {error}
        </p>
      ) : null}
      {localNote ? (
        <p className="text-sm text-muted" aria-live="polite">
          Running locally without an account. Taking you to onboarding.
        </p>
      ) : null}

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? (isSignup ? "Creating account…" : "Logging in…") : isSignup ? "Create account" : "Log in"}
      </Button>

      <div className="flex flex-col gap-2 text-sm text-muted">
        <p>
          {isSignup ? "Already have an account?" : "New here?"}{" "}
          <Link href={isSignup ? "/login" : "/signup"} className="text-accent underline-offset-4 hover:underline">
            {isSignup ? "Log in" : "Create one"}
          </Link>
        </p>
        <p>
          Trying it on your own machine?{" "}
          <Link href="/app/onboarding" className="text-accent underline-offset-4 hover:underline">
            Continue without an account
          </Link>
          <span className="block text-xs text-subtle">Works when the app runs in local mode; otherwise you will be asked to log in.</span>
        </p>
      </div>
    </form>
  );
}
