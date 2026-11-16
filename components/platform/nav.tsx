"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, FlaskConical, Home, LineChart, MessageSquare, Rows3 } from "lucide-react";
import { cn } from "@/lib/utils";

export const NAV_ITEMS = [
  { href: "/app", label: "Overview", short: "Home", icon: Home, exact: true },
  { href: "/app/learn", label: "My learning", short: "Learn", icon: BookOpen },
  { href: "/app/coach", label: "AI coach", short: "Coach", icon: MessageSquare },
  { href: "/app/scenario-lab", label: "Scenario lab", short: "Lab", icon: FlaskConical },
  { href: "/app/orderbook-gym", label: "Order book gym", short: "Book", icon: Rows3 },
  { href: "/app/progress", label: "My progress", short: "Progress", icon: LineChart },
] as const;

function isActive(pathname: string, href: string, exact?: boolean): boolean {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Desktop: vertical list in the left rail. */
export function SideNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="flex flex-col gap-0.5">
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href, "exact" in item ? item.exact : false);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-9 items-center gap-2.5 rounded-md px-2.5 text-sm transition-colors duration-150",
              active ? "bg-accent-soft font-medium text-fg" : "text-muted hover:bg-surface-raised hover:text-fg",
            )}
          >
            <Icon className={cn("size-4 shrink-0", active ? "text-accent" : "text-subtle")} aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Phone: fixed bottom bar with five of the six destinations plus progress folded into overview. */
export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/80 lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid grid-cols-6">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href, "exact" in item ? item.exact : false);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] leading-none transition-colors duration-150",
                  active ? "text-accent" : "text-subtle",
                )}
              >
                <Icon className="size-5" aria-hidden="true" />
                <span>{item.short}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
