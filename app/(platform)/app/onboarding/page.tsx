import type { Metadata } from "next";
import type { ProfileResponse } from "@/lib/types/api";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { load } from "@/lib/client/server-api";

export const metadata: Metadata = { title: "Get started" };

export default async function OnboardingPage() {
  const res = await load<ProfileResponse>("/api/profile");
  return <OnboardingFlow profile={res.ok ? res.data : null} />;
}
