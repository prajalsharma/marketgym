import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = {
  title: "Log in · MarketGym",
  description: "Log in to continue your market analysis practice.",
  robots: { index: false },
};

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Log in</h1>
        <p className="mt-1 text-sm text-muted">Pick up where you left off.</p>
      </div>
      <AuthForm mode="login" />
    </div>
  );
}
