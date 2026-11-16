"use client";

import * as React from "react";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { cn } from "@/lib/utils";

const RadioGroup = React.forwardRef<
  React.ComponentRef<typeof RadioGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(({ className, ...props }, ref) => (
  <RadioGroupPrimitive.Root ref={ref} className={cn("grid gap-2", className)} {...props} />
));
RadioGroup.displayName = RadioGroupPrimitive.Root.displayName;

/** The bare radio control. Pair with a Label via htmlFor/id. */
const RadioGroupItem = React.forwardRef<
  React.ComponentRef<typeof RadioGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>
>(({ className, ...props }, ref) => (
  <RadioGroupPrimitive.Item
    ref={ref}
    className={cn(
      "aspect-square size-4 shrink-0 rounded-full border border-line-strong bg-surface-sunken",
      "transition-colors duration-(--duration-fast)",
      "data-[state=checked]:border-accent",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  >
    <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
      <span className="block size-2 rounded-full bg-accent" />
    </RadioGroupPrimitive.Indicator>
  </RadioGroupPrimitive.Item>
));
RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName;

export interface RadioCardProps
  extends Omit<React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>, "title"> {
  title: React.ReactNode;
  description?: React.ReactNode;
}

/**
 * A full-width selectable row (used in onboarding and multiple-choice checks).
 * Whole row is the hit target; the selected row gets an accent border, not a fill.
 */
const RadioCard = React.forwardRef<React.ComponentRef<typeof RadioGroupPrimitive.Item>, RadioCardProps>(
  ({ className, title, description, ...props }, ref) => (
    <RadioGroupPrimitive.Item
      ref={ref}
      className={cn(
        "group flex w-full items-start gap-3 rounded-md border border-line bg-surface p-3 text-left",
        "transition-colors duration-(--duration-fast) hover:border-line-strong",
        "data-[state=checked]:border-accent data-[state=checked]:bg-accent-soft",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <span
        aria-hidden
        className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border border-line-strong bg-surface-sunken group-data-[state=checked]:border-accent"
      >
        <RadioGroupPrimitive.Indicator asChild>
          <span className="block size-2 rounded-full bg-accent" />
        </RadioGroupPrimitive.Indicator>
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-sm font-medium text-fg">{title}</span>
        {description ? <span className="text-sm text-muted">{description}</span> : null}
      </span>
    </RadioGroupPrimitive.Item>
  ),
);
RadioCard.displayName = "RadioCard";

export { RadioGroup, RadioGroupItem, RadioCard };
