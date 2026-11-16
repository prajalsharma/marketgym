import * as React from "react";
import { Check } from "lucide-react";
import type { MasteryStatus } from "@/lib/types/learning";
import { cn } from "@/lib/utils";

export const MASTERY_LABEL: Record<MasteryStatus, string> = {
  "not-started": "Not started",
  learning: "Learning",
  practising: "Practising",
  mastered: "Mastered",
};

const STEP: Record<MasteryStatus, number> = {
  "not-started": 0,
  learning: 1,
  practising: 2,
  mastered: 3,
};

export interface MasteryIndicatorProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: MasteryStatus;
  /** 0..100 mastery score. Hidden when undefined. */
  score?: number;
  /** Hide the word, keep the segments + score (use only where the label is nearby). */
  hideLabel?: boolean;
  size?: "sm" | "md";
}

/**
 * Four statuses, four distinct signals: 0/1/2/3 filled segments, a word, and a
 * check mark on mastered. Colour (accent while in progress, success when
 * mastered) is the fourth signal, never the only one.
 */
const MasteryIndicator = React.forwardRef<HTMLSpanElement, MasteryIndicatorProps>(
  ({ status, score, hideLabel = false, size = "md", className, ...props }, ref) => {
    const filled = STEP[status];
    const mastered = status === "mastered";
    const label = MASTERY_LABEL[status];
    const aria =
      score === undefined ? label : `${label}, score ${Math.round(score)} out of 100`;

    return (
      <span
        ref={ref}
        role="img"
        aria-label={aria}
        data-status={status}
        className={cn(
          "inline-flex items-center gap-2",
          size === "sm" ? "text-xs" : "text-sm",
          className,
        )}
        {...props}
      >
        <span aria-hidden className="inline-flex items-center gap-0.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={cn(
                "block rounded-[2px]",
                size === "sm" ? "h-1.5 w-3" : "h-2 w-4",
                i < filled
                  ? mastered
                    ? "bg-success"
                    : "bg-accent"
                  : "border border-line-strong bg-transparent",
              )}
            />
          ))}
        </span>
        {mastered ? (
          <Check aria-hidden className={cn("text-success", size === "sm" ? "size-3" : "size-4")} />
        ) : null}
        {hideLabel ? null : (
          <span className={cn("font-medium", mastered ? "text-success" : "text-fg")}>{label}</span>
        )}
        {score !== undefined ? (
          <span className="tabular text-muted">{Math.round(score)}</span>
        ) : null}
      </span>
    );
  },
);
MasteryIndicator.displayName = "MasteryIndicator";

export { MasteryIndicator };
