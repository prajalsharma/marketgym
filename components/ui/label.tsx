import * as React from "react";
import { cn } from "@/lib/utils";

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  /** Append "(optional)" in muted text. Required fields are the default and are not marked. */
  optional?: boolean;
}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, optional, children, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        "inline-flex items-baseline gap-1.5 text-sm font-medium text-fg peer-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
      {optional ? <span className="text-xs font-normal text-subtle">(optional)</span> : null}
    </label>
  ),
);
Label.displayName = "Label";

export { Label };
