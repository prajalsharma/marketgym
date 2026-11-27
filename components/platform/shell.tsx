import Link from "next/link";
import type { Profile } from "@/lib/types/learning";
import { ThemeToggle, TooltipProvider } from "@/components/ui";
import { BottomNav, SideNav } from "./nav";
import { SignOutButton } from "./sign-out-button";
import { Wordmark } from "@/components/marketing/wordmark";
import { MotionProvider } from "@/components/shared/motion-provider";
import { CommandMenu, CommandMenuTrigger } from "./command-menu";
import "@/components/shared/motion.css";

interface Props {
  profile: Profile | null;
  /** true when /api/profile reported the local demo learner (no email) */
  localMode: boolean;
  children: React.ReactNode;
}

/** Left rail on desktop, bottom bar on phones. Header carries mode note, theme, sign-out. */
export function PlatformShell({ profile, localMode, children }: Props) {
  return (
    <MotionProvider>
      <TooltipProvider delayDuration={200}>
        <CommandMenu />
        <div className="flex min-h-dvh flex-col lg:flex-row">
          <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 border-r border-line bg-surface-sunken lg:flex lg:flex-col">
            <div className="flex h-14 items-center px-4">
              <Link
                href="/app"
                className="rounded-sm"
                aria-label="MarketGym overview"
              >
                <Wordmark />
              </Link>
            </div>
            <div className="px-3 pb-3 pt-1">
              <CommandMenuTrigger />
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-1 scrollbar-thin">
              <SideNav />
            </div>
            <div className="space-y-2 border-t border-line px-4 py-3 text-xs text-muted">
              {profile ? (
                <p className="truncate text-fg">{profile.displayName}</p>
              ) : null}
              {localMode ? <p>Running locally without an account.</p> : null}
              <div className="flex items-center justify-between gap-2">
                <ThemeToggle showLabel />
                {!localMode ? <SignOutButton /> : null}
              </div>
            </div>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col">
            <header className="surface-sticky sticky top-0 z-(--z-sticky) flex h-14 items-center justify-between gap-3 px-4 lg:hidden">
              <Link
                href="/app"
                className="rounded-sm"
                aria-label="MarketGym overview"
              >
                <Wordmark />
              </Link>
              <div className="flex items-center gap-1">
                {localMode ? (
                  <span className="mr-1 text-xs text-muted">
                    Local, no account
                  </span>
                ) : null}
                <CommandMenuTrigger compact />
                <ThemeToggle />
                {!localMode ? <SignOutButton compact /> : null}
              </div>
            </header>
            <main className="mx-auto w-full max-w-[var(--content-max)] flex-1 px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pb-12 lg:pt-8">
              {children}
            </main>
          </div>
          <BottomNav />
        </div>
      </TooltipProvider>
    </MotionProvider>
  );
}
