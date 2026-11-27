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
  ChevronRight,
  MoreHorizontal,
  Rows3,
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui";
import { EASE_OUT, TIMING, spring } from "@/lib/client/motion";
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
    <nav aria-label="Main" className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative flex h-10 items-center gap-3 rounded-md px-3 text-sm",
              "transition-[color,background-color,transform] duration-150 ease-out active:scale-[0.98]",
              active ? "font-medium text-fg" : "text-muted hover:bg-surface-raised/70 hover:text-fg",
            )}
          >
            {active ? (
              <motion.span
                layoutId="sidenav-active"
                transition={spring.morph}
                className="absolute inset-0 rounded-md border border-line bg-surface-raised shadow-[inset_0_1px_0_rgb(255_255_255/0.04)]"
                aria-hidden="true"
              >
                <span className="absolute inset-y-2.5 left-0 w-[3px] -translate-x-px rounded-r-sm bg-accent" />
              </motion.span>
            ) : null}
            <Icon
              className={cn(
                "relative size-[18px] shrink-0 transition-[color,transform] duration-200 ease-out",
                active ? "text-accent" : "text-subtle group-hover:translate-x-0.5 group-hover:text-fg",
              )}
              aria-hidden="true"
            />
            <span className="relative flex-1 truncate">{item.label}</span>
            <ChevronRight
              className={cn(
                "relative size-3.5 shrink-0 text-subtle transition-[opacity,transform] duration-200 ease-out",
                active
                  ? "opacity-0"
                  : "-translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-100",
              )}
              aria-hidden="true"
            />
          </Link>
        );
      })}
    </nav>
  );
}

const tabClass =
  "relative flex min-h-16 w-full flex-col items-center justify-center gap-1 text-xs leading-none transition-[color,transform] duration-150 ease-out active:scale-95";

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
      className="surface-glass fixed inset-x-0 bottom-0 z-(--z-sticky) border-t border-line lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto grid max-w-xl grid-cols-5 px-1">
        {primary.map((item) => {
          const active = isActive(pathname, item);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(tabClass, active ? "font-medium text-fg" : "text-subtle hover:text-muted")}
              >
                <span className="relative flex h-8 w-14 items-center justify-center">
                  {active ? (
                    <motion.span
                      layoutId="bottomnav-active"
                      transition={spring.morph}
                      className="absolute inset-0 rounded-lg bg-accent-soft"
                      aria-hidden="true"
                    />
                  ) : null}
                  <Icon className={cn("relative size-5", active ? "text-accent" : undefined)} aria-hidden="true" />
                </span>
                <span>{item.short}</span>
              </Link>
            </li>
          );
        })}
        <li>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <button
                type="button"
                className={cn(tabClass, overflowActive ? "font-medium text-fg" : "text-subtle hover:text-muted")}
              >
                <span className="relative flex h-8 w-14 items-center justify-center">
                  {overflowActive ? (
                    <motion.span
                      layoutId="bottomnav-active"
                      transition={spring.morph}
                      className="absolute inset-0 rounded-lg bg-accent-soft"
                      aria-hidden="true"
                    />
                  ) : null}
                  <MoreHorizontal
                    className={cn("relative size-5", overflowActive ? "text-accent" : undefined)}
                    aria-hidden="true"
                  />
                </span>
                <span>More</span>
              </button>
            </DialogTrigger>
            <DialogContent sheetOnMobile>
              <DialogTitle className="text-lg font-semibold tracking-tight">More</DialogTitle>
              <DialogDescription className="sr-only">The rest of MarketGym</DialogDescription>
              <ul className="flex flex-col gap-1.5">
                {overflow.map((item, i) => {
                  const active = isActive(pathname, item);
                  const Icon = item.icon;
                  return (
                    <motion.li
                      key={item.href}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: TIMING.pageRise, ease: EASE_OUT, delay: 0.06 + i * TIMING.stagger }}
                    >
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "group flex h-14 items-center gap-3 rounded-lg border px-3 text-base",
                          "transition-[color,background-color,border-color,transform] duration-150 ease-out active:scale-[0.98]",
                          active
                            ? "border-line-strong bg-surface-raised font-medium text-fg shadow-[inset_0_1px_0_rgb(255_255_255/0.04)]"
                            : "border-transparent text-muted hover:border-line hover:bg-surface-raised hover:text-fg",
                        )}
                      >
                        <span
                          className={cn(
                            "flex size-9 shrink-0 items-center justify-center rounded-md transition-colors duration-150",
                            active ? "bg-accent-soft text-accent" : "bg-surface-sunken text-subtle group-hover:text-fg",
                          )}
                        >
                          <Icon className="size-5" aria-hidden="true" />
                        </span>
                        <span className="flex-1 truncate">{item.label}</span>
                        <ChevronRight
                          className="size-4 shrink-0 text-subtle transition-transform duration-200 ease-out group-hover:translate-x-0.5"
                          aria-hidden="true"
                        />
                      </Link>
                    </motion.li>
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
