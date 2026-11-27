import Link from "next/link";
import type { Profile } from "@/lib/types/learning";
import { ThemeToggle, TooltipProvider } from "@/components/ui";
import { BottomNav, SideNav } from "./nav";
import { SignOutButton } from "./sign-out-button";
import { LogoMark, Wordmark } from "@/components/marketing/wordmark";
import { MotionProvider } from "@/components/shared/motion-provider";
import { CommandMenu, CommandMenuTrigger } from "./command-menu";
import "@/components/shared/motion.css";

interface Props {
  profile: Profile | null;
  /** true when /api/profile reported the local demo learner (no email) */
  localMode: boolean;
  children: React.ReactNode;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : (parts[0] ?? "").slice(0, 2);
  return letters.toUpperCase();
}

/** Left rail on desktop, bottom bar on phones. Header carries mode note, theme, sign-out. */
export function PlatformShell({ profile, localMode, children }: Props) {
  return (
    <MotionProvider>
      <TooltipProvider delayDuration={200}>
        <CommandMenu />
        <div className="flex min-h-dvh flex-col lg:flex-row">
          <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 border-r border-line bg-surface-sunken lg:flex lg:flex-col">
            <div className="flex h-16 items-center px-5">
              <Link
                href="/app"
                className="group inline-flex items-center gap-2.5 rounded-sm text-base font-semibold tracking-tight text-fg"
                aria-label="MarketGym overview"
              >
                <LogoMark
                  size={28}
                  className="shadow-sm transition-transform duration-300 ease-out group-hover:-translate-y-0.5 group-active:scale-95"
                />
                MarketGym
              </Link>
            </div>
            <div className="px-3 pb-4">
              <CommandMenuTrigger />
            </div>
            <div className="flex-1 overflow-y-auto px-3 pb-3 scrollbar-thin">
              <SideNav />
            </div>
            <div className="m-3 space-y-3 rounded-lg border border-line bg-surface p-3 text-xs text-muted shadow-[inset_0_1px_0_rgb(255_255_255/0.04)]">
              {profile || localMode ? (
                <div className="flex items-center gap-2.5">
                  {profile ? (
                    <span
                      className="flex size-8 shrink-0 items-center justify-center rounded-md bg-accent-soft text-xs font-semibold text-accent"
                      aria-hidden="true"
                    >
                      {initials(profile.displayName)}
                    </span>
                  ) : null}
                  <div className="min-w-0 space-y-0.5">
                    {profile ? (
                      <p className="truncate text-sm font-medium text-fg">{profile.displayName}</p>
                    ) : null}
                    {localMode ? <p>Running locally without an account.</p> : null}
                  </div>
                </div>
              ) : null}
              <div className="flex items-center justify-between gap-2">
                <ThemeToggle showLabel />
                {!localMode ? <SignOutButton /> : null}
              </div>
            </div>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col">
            <header className="surface-sticky sticky top-0 z-(--z-sticky) flex h-14 items-center justify-between gap-3 px-4 shadow-[inset_0_1px_0_rgb(255_255_255/0.04)] sm:px-6 lg:hidden">
              <Link
                href="/app"
                className="rounded-sm transition-transform duration-150 ease-out active:scale-[0.98]"
                aria-label="MarketGym overview"
              >
                <Wordmark className="text-base" />
              </Link>
              <div className="flex items-center gap-1">
                {localMode ? (
                  <span className="mr-1 rounded-md border border-line bg-surface px-2 py-1 text-xs text-muted">
                    Local, no account
                  </span>
                ) : null}
                <CommandMenuTrigger compact />
                <ThemeToggle />
                {!localMode ? <SignOutButton compact /> : null}
              </div>
            </header>
            <main className="mx-auto w-full max-w-[var(--content-max)] flex-1 px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-16 lg:pt-10">
              {children}
            </main>
          </div>
          <BottomNav />
        </div>
      </TooltipProvider>
    </MotionProvider>
  );
}
