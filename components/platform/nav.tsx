"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  BookOpen,
  Briefcase,
  FlaskConical,
  Home,
  Landmark,
  LineChart,
  MessageSquare,
  MoreHorizontal,
  Rows3,
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui";
import { spring } from "@/lib/client/motion";
import { cn } from "@/lib/utils";

export const NAV_ITEMS = [
  { href: "/app", label: "Overview", short: "Home", icon: Home, exact: true },
  { href: "/app/learn", label: "My learning", short: "Learn", icon: BookOpen },
  { href: "/app/coach", label: "AI coach", short: "Coach", icon: MessageSquare },
  { href: "/app/scenario-lab", label: "Scenario lab", short: "Lab", icon: FlaskConical },
  { href: "/app/orderbook-gym", label: "Order book gym", short: "Book", icon: Rows3 },
  { href: "/app/wealth", label: "Wealth lab", short: "Wealth", icon: Landmark },
  { href: "/app/portfolio", label: "Practice portfolio", short: "Portfolio", icon: Briefcase },
  { href: "/app/progress", label: "My progress", short: "Progress", icon: LineChart },
] as const;

type NavItem = (typeof NAV_ITEMS)[number];

/** Phone bottom bar keeps four destinations; the rest sit behind "More". */
const BOTTOM_HREFS: ReadonlyArray<string> = ["/app", "/app/learn", "/app/scenario-lab", "/app/orderbook-gym"];

function isActive(pathname: string, item: NavItem): boolean {
  if ("exact" in item && item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/** Desktop: vertical list in the left rail. */
export function SideNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="flex flex-col gap-0.5">
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative flex h-9 items-center gap-2.5 rounded-md px-2.5 text-sm transition-colors duration-150",
              active ? "font-medium text-fg" : "text-muted hover:bg-surface-raised hover:text-fg",
            )}
          >
            {active ? (
              <motion.span
                layoutId="sidenav-active"
                transition={spring.morph}
                className="absolute inset-0 rounded-md bg-accent-soft"
                aria-hidden="true"
              />
            ) : null}
            <Icon
              className={cn(
                "relative size-4 shrink-0 transition-transform duration-200 ease-out group-hover:translate-x-0.5",
                active ? "text-accent" : "text-subtle",
              )}
              aria-hidden="true"
            />
            <span className="relative">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

const tabClass = "flex min-h-14 w-full flex-col items-center justify-center gap-1 text-xs leading-none transition-colors duration-150";

/** Phone and tablet: fixed bottom bar with four destinations and a "More" sheet for the other four. */
export function BottomNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const primary = NAV_ITEMS.filter((i) => BOTTOM_HREFS.includes(i.href));
  const overflow = NAV_ITEMS.filter((i) => !BOTTOM_HREFS.includes(i.href));
  const overflowActive = overflow.some((i) => isActive(pathname, i));

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-(--z-sticky) border-t border-line bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/80 lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid grid-cols-5">
        {primary.map((item) => {
          const active = isActive(pathname, item);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(tabClass, "relative active:scale-95", active ? "text-accent" : "text-subtle")}
              >
                {active ? (
                  <motion.span
                    layoutId="bottomnav-active"
                    transition={spring.morph}
                    className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-accent"
                    aria-hidden="true"
                  />
                ) : null}
                <Icon className="size-5" aria-hidden="true" />
                <span>{item.short}</span>
              </Link>
            </li>
          );
        })}
        <li>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <button type="button" className={cn(tabClass, overflowActive ? "text-accent" : "text-subtle")}>
                <MoreHorizontal className="size-5" aria-hidden="true" />
                <span>More</span>
              </button>
            </DialogTrigger>
            <DialogContent sheetOnMobile>
              <DialogTitle>More</DialogTitle>
              <DialogDescription className="sr-only">The rest of MarketGym</DialogDescription>
              <ul className="mt-3 flex flex-col gap-0.5">
                {overflow.map((item) => {
                  const active = isActive(pathname, item);
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex h-11 items-center gap-3 rounded-md px-3 text-base transition-colors duration-150",
                          active ? "bg-accent-soft font-medium text-fg" : "text-muted hover:bg-surface-raised hover:text-fg",
                        )}
                      >
                        <Icon className={cn("size-5 shrink-0", active ? "text-accent" : "text-subtle")} aria-hidden="true" />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </DialogContent>
          </Dialog>
        </li>
      </ul>
    </nav>
  );
}
