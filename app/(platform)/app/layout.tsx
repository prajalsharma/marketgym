import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { ProfileResponse } from "@/lib/types/api";
import { PlatformShell } from "@/components/platform/shell";
import { load } from "@/lib/client/server-api";
import { isApiClientError } from "@/lib/client/api";
import { isLocalProfile } from "@/lib/client/profile";

export const metadata: Metadata = {
  title: { default: "MarketGym", template: "%s · MarketGym" },
  robots: { index: false, follow: false },
};

export default async function PlatformLayout({ children }: LayoutProps<"/app">) {
  const res = await load<ProfileResponse>("/api/profile");
  if (!res.ok && isApiClientError(res.error) && res.error.code === "unauthenticated") {
    redirect("/login");
  }
  const profile = res.ok ? res.data : null;
  return (
    <PlatformShell profile={profile} localMode={isLocalProfile(profile)}>
      {children}
    </PlatformShell>
  );
}
