"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui";
import { cn } from "@/lib/utils";

interface Props {
  /** short explanation shown on hover/focus */
  explain: string;
  children: React.ReactNode;
  className?: string;
}

/** A learning label: dotted underline, explanation on hover and keyboard focus. */
export function Term({ explain, children, className }: Props) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            "cursor-help rounded-sm underline decoration-dotted underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring",
            className,
          )}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-sm leading-snug">{explain}</TooltipContent>
    </Tooltip>
  );
}
