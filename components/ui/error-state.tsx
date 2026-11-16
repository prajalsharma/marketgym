import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

export interface ErrorStateProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** When provided, renders a "Try again" button. */
  retry?: () => void;
  retryLabel?: string;
  /** Technical detail (request id, message) shown small and monospaced. */
  detail?: string;
}

function ErrorState({
  className,
  title,
  description,
  retry,
  retryLabel = "Try again",
  detail,
  ...props
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-start gap-3 rounded-lg border border-danger/40 bg-danger-soft p-5",
        className,
      )}
      {...props}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden />
        <div className="flex max-w-prose flex-col gap-1">
          <p className="text-base font-semibold text-fg">{title}</p>
          {description ? <p className="text-sm text-muted">{description}</p> : null}
          {detail ? (
            <p className="mt-1 break-all font-mono text-xs text-subtle">{detail}</p>
          ) : null}
        </div>
      </div>
      {retry ? (
        <Button variant="secondary" size="sm" onClick={retry} className="ml-8">
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}

export { ErrorState };
