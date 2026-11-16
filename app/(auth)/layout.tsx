import Link from "next/link";
import { ThemeToggle } from "@/components/ui";
import { Wordmark } from "@/components/marketing/wordmark";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-14 items-center justify-between px-4 sm:px-6">
        <Link href="/" className="rounded-sm" aria-label="MarketGym home">
          <Wordmark />
        </Link>
        <ThemeToggle />
      </header>
      <main className="flex flex-1 items-start justify-center px-4 py-10 sm:py-16">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
