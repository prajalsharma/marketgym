import type { Metadata } from "next";
import { AuthEntry } from "@/components/auth/auth-entry";
import { safeNext } from "@/lib/client/privy";

export const metadata: Metadata = {
  title: "Sign up · MarketGym",
  description: "Create a free account. A short diagnostic sets your starting point.",
};

export default async function SignupPage(props: PageProps<"/signup">) {
  const sp = await props.searchParams;
  const next = safeNext(typeof sp.next === "string" ? sp.next : null);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Create your account</h1>
        <p className="mt-1 text-sm text-muted">
          Free. Five short steps and a seven-question diagnostic set your starting point.
        </p>
      </div>
      <AuthEntry mode="signup" next={next} />
    </div>
  );
}
