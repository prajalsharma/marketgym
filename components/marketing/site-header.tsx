import Link from "next/link";
import { Button, ThemeToggle } from "@/components/ui";
import { Wordmark } from "./wordmark";

export function SiteHeader() {
  return (
    <header className="surface-sticky sticky top-0 z-(--z-sticky)">
      <div className="mx-auto flex h-14 max-w-[var(--content-max)] items-center justify-between px-4 sm:px-6">
        <Link href="/" className="rounded-sm" aria-label="MarketGym home">
          <Wordmark />
        </Link>
        <nav aria-label="Site" className="flex items-center gap-1 sm:gap-2">
          <Link
            href="#how-it-works"
            className="hidden rounded-sm px-2 py-1 text-sm text-muted hover:text-fg sm:inline-block"
          >
            How it works
          </Link>
          <Link href="#preview" className="hidden rounded-sm px-2 py-1 text-sm text-muted hover:text-fg sm:inline-block">
            Try a sample
          </Link>
          <ThemeToggle />
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Log in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/signup">Start free</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-[var(--content-max)] flex-col gap-3 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <Wordmark className="text-fg" />
        <p className="max-w-prose text-xs">
          Market data from SoSoValue, SoDEX and SoDEX Wealth, shown with its source and freshness. MarketGym teaches
          analysis; it does not trade, hold funds, connect a wallet or give investment advice.
        </p>
        <div className="flex gap-4 text-xs">
          <Link href="/login" className="hover:text-fg">
            Log in
          </Link>
          <Link href="/signup" className="hover:text-fg">
            Sign up
          </Link>
        </div>
      </div>
    </footer>
  );
}
