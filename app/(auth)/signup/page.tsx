import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = {
  title: "Sign up · MarketGym",
  description: "Create a free account. A short diagnostic sets your starting point.",
};

export default function SignupPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Create your account</h1>
        <p className="mt-1 text-sm text-muted">
          Free. Five short steps and a seven-question diagnostic set your starting point.
        </p>
      </div>
      <AuthForm mode="signup" />
    </div>
  );
}
