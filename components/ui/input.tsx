import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Marks the field as invalid: danger border and aria-invalid. */
  invalid?: boolean;
}

const inputBase = [
  "w-full rounded-md border border-line-strong bg-surface-sunken px-3 text-base text-fg",
  "placeholder:text-subtle",
  "transition-[border-color,background-color] duration-(--duration-fast)",
  "hover:border-line-strong focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
  "disabled:cursor-not-allowed disabled:opacity-50",
  "aria-invalid:border-danger aria-invalid:focus-visible:ring-danger/40",
  "file:border-0 file:bg-transparent file:text-sm file:font-medium",
];

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", invalid, ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      aria-invalid={invalid || props["aria-invalid"] || undefined}
      className={cn(inputBase, "h-10 sm:text-sm", className)}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export { Input, inputBase };
