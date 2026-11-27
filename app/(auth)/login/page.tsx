import type { Metadata } from "next";
import { AuthEntry } from "@/components/auth/auth-entry";
import { safeNext } from "@/lib/client/privy";

export const metadata: Metadata = {
  title: "Log in · MarketGym",
  description: "Log in to continue your market analysis practice.",
  robots: { index: false },
};

export default async function LoginPage(props: PageProps<"/login">) {
  const sp = await props.searchParams;
  const next = safeNext(typeof sp.next === "string" ? sp.next : null);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Log in</h1>
        <p className="mt-1 text-sm text-muted">Pick up where you left off.</p>
      </div>
      <AuthEntry mode="login" next={next} />
    </div>
  );
}
