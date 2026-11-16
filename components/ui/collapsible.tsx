"use client";

import * as React from "react";
import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const Collapsible = CollapsiblePrimitive.Root;
const CollapsibleTrigger = CollapsiblePrimitive.Trigger;

const CollapsibleContent = React.forwardRef<
  React.ComponentRef<typeof CollapsiblePrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.Content>
>(({ className, ...props }, ref) => (
  <CollapsiblePrimitive.Content
    ref={ref}
    className={cn("data-[state=open]:animate-fade-in", className)}
    {...props}
  />
));
CollapsibleContent.displayName = CollapsiblePrimitive.Content.displayName;

/**
 * A styled trigger row: chevron rotates when open. Use for hint drawers,
 * "show evidence detail", and lesson sections.
 */
const CollapsibleRow = React.forwardRef<
  React.ComponentRef<typeof CollapsiblePrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <CollapsiblePrimitive.Trigger
    ref={ref}
    className={cn(
      "group flex w-full items-center gap-2 rounded-sm py-2 text-left text-sm font-medium text-fg",
      "transition-colors duration-(--duration-fast) hover:text-accent",
      className,
    )}
    {...props}
  >
    <ChevronRight
      aria-hidden
      className="size-4 shrink-0 text-muted transition-transform duration-(--duration-fast) group-data-[state=open]:rotate-90"
    />
    {children}
  </CollapsiblePrimitive.Trigger>
));
CollapsibleRow.displayName = "CollapsibleRow";

export { Collapsible, CollapsibleTrigger, CollapsibleContent, CollapsibleRow };
