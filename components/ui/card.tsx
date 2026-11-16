import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Card is a bordered panel. Use it when a region needs a boundary, not as the
 * default container for everything. Nested cards are not allowed.
 *
 * `tone="evidence"` marks market data the learner reads from.
 * `tone="learner"` marks the learner's own working area.
 */
const cardVariants = cva("rounded-lg border text-fg", {
  variants: {
    tone: {
      default: "border-line bg-surface",
      raised: "border-line bg-surface-raised shadow-sm",
      evidence: "border-evidence-line bg-evidence",
      learner: "border-learner-line bg-learner",
      sunken: "border-line bg-surface-sunken",
    },
    padding: {
      none: "",
      sm: "[&>*]:px-4 [&>*]:py-3",
      md: "[&>*]:px-5 [&>*]:py-4",
    },
  },
  defaultVariants: {
    tone: "default",
    padding: "md",
  },
});

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, tone, padding, ...props }, ref) => (
    <div
      ref={ref}
      data-tone={tone ?? "default"}
      className={cn(cardVariants({ tone, padding }), className)}
      {...props}
    />
  ),
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex flex-col gap-1 border-b border-line", className)}
      {...props}
    />
  ),
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn("text-base font-semibold leading-snug text-fg", className)}
      {...props}
    />
  ),
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("text-sm text-muted", className)} {...props} />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn(className)} {...props} />,
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-center gap-3 border-t border-line", className)}
      {...props}
    />
  ),
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, cardVariants };
