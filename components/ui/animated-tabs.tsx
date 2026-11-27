"use client";

/**
 * Segmented tabs with a sliding indicator. The indicator is EasyUI's
 * animated-tabs pattern (shared layoutId spring, github.com/Surajmaurya1/easyui,
 * src/components/ui/AnimatedTabs.tsx); keyboard behaviour (arrow keys, roving
 * focus, aria) comes from Radix Tabs, restyled to MarketGym tokens.
 * Use for short, mutually exclusive views: chart ranges, market switchers.
 */
import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { LayoutGroup, motion } from "framer-motion";
import { spring } from "@/lib/client/motion";
import { cn } from "@/lib/utils";

export interface SegmentedTabsProps<T extends string> {
  value: T;
  onValueChange: (v: T) => void;
  items: ReadonlyArray<{ value: T; label: React.ReactNode }>;
  /** accessible name for the tab list */
  label: string;
  size?: "sm" | "md";
  className?: string;
}

export function SegmentedTabs<T extends string>({
  value,
  onValueChange,
  items,
  label,
  size = "sm",
  className,
}: SegmentedTabsProps<T>) {
  const id = React.useId();
  return (
    <TabsPrimitive.Root value={value} onValueChange={(v) => onValueChange(v as T)} activationMode="automatic">
      <LayoutGroup id={id}>
        <TabsPrimitive.List
          aria-label={label}
          className={cn(
            "inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-md border border-line bg-surface-sunken p-0.5 scrollbar-thin",
            className,
          )}
        >
          {items.map((it) => {
            const active = it.value === value;
            return (
              <TabsPrimitive.Trigger
                key={it.value}
                value={it.value}
                className={cn(
                  "relative inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-sm font-medium outline-none",
                  "transition-colors duration-(--duration-fast)",
                  "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
                  size === "sm" ? "h-7 px-2.5 text-xs" : "h-8 px-3 text-sm",
                  active ? "text-fg" : "text-muted hover:text-fg",
                )}
              >
                {active ? (
                  <motion.span
                    layoutId="seg-indicator"
                    transition={spring.morph}
                    className="absolute inset-0 rounded-sm border border-line-strong bg-surface-raised shadow-sm"
                    aria-hidden="true"
                  />
                ) : null}
                <span className="relative">{it.label}</span>
              </TabsPrimitive.Trigger>
            );
          })}
        </TabsPrimitive.List>
      </LayoutGroup>
    </TabsPrimitive.Root>
  );
}
