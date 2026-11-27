import Link from "next/link";
import { Button, ThemeToggle } from "@/components/ui";
import { HeaderShell } from "./header-shell";
import { Wordmark } from "./wordmark";

const NAV_LINK =
  "hidden rounded-md px-2.5 py-1.5 text-sm text-muted transition-colors duration-200 hover:bg-surface-raised hover:text-fg md:inline-block";

export function SiteHeader() {
  return (
    <HeaderShell>
      <div className="mx-auto flex h-16 max-w-[var(--content-max)] items-center justify-between px-4 sm:px-6">
        <Link href="/" className="rounded-sm transition-opacity hover:opacity-80" aria-label="MarketGym home">
          <Wordmark className="text-base" />
        </Link>
        <nav aria-label="Site" className="flex items-center gap-1 sm:gap-2">
          <Link href="#how-it-works" className={NAV_LINK}>
            How it works
          </Link>
          <Link href="#data" className={NAV_LINK}>
            Data
          </Link>
          <Link href="#preview" className={NAV_LINK}>
            Try a sample
          </Link>
          <ThemeToggle />
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Log in</Link>
          </Button>
          <Button asChild size="sm" className="transition-transform active:scale-[0.98]">
            <Link href="/signup">Start free</Link>
          </Button>
        </nav>
      </div>
    </HeaderShell>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface-sunken">
      <div className="mx-auto flex max-w-[var(--content-max)] flex-col gap-4 px-4 py-10 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <Wordmark className="text-fg" />
        <p className="max-w-prose text-xs leading-relaxed">
          Market data from SoSoValue, SoDEX and SoDEX Wealth, shown with its source and freshness. MarketGym teaches
          analysis; it does not trade, hold funds, connect a wallet or give investment advice.
        </p>
        <div className="flex gap-4 text-xs">
          <Link href="/login" className="transition-colors hover:text-fg">
            Log in
          </Link>
          <Link href="/signup" className="transition-colors hover:text-fg">
            Sign up
          </Link>
        </div>
      </div>
    </footer>
  );
}
