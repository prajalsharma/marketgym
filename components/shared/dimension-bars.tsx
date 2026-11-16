"use client";

import { useEffect, useState } from "react";
import type { Rubric } from "@/lib/types/curriculum";
import type { RubricScores } from "@/lib/types/learning";
import { RUBRIC_LABEL } from "@/lib/client/labels";
import { cn } from "@/lib/utils";

interface Props {
  scores: RubricScores;
  rubric?: Rubric;
  className?: string;
}

const ORDER: Array<keyof RubricScores> = ["factual", "evidence", "reasoning", "uncertainty"];
const DEFAULT_MAX: Record<keyof RubricScores, number> = {
  factual: 35,
  evidence: 25,
  reasoning: 25,
  uncertainty: 15,
};

/** Four rubric dimensions as labelled bars with points out of max. */
export function DimensionBars({ scores, rubric, className }: Props) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <dl className={cn("space-y-3", className)}>
      {ORDER.map((key) => {
        const max = rubric?.dimensions.find((d) => d.key === key)?.maxPoints ?? DEFAULT_MAX[key];
        const label = rubric?.dimensions.find((d) => d.key === key)?.label ?? RUBRIC_LABEL[key];
        const value = Math.max(0, Math.min(max, scores[key]));
        const share = max > 0 ? value / max : 0;
        return (
          <div key={key}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <dt>{label}</dt>
              <dd className="font-mono tabular-nums text-muted">
                <span className="text-fg">{Math.round(value)}</span> / {max}
              </dd>
            </div>
            <div
              className="mt-1.5 h-2 overflow-hidden rounded-full bg-line"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={max}
              aria-valuenow={Math.round(value)}
              aria-label={label}
            >
              <div
                className={cn(
                  "bar-fill h-full rounded-full",
                  share >= 0.8 ? "bg-success" : share >= 0.5 ? "bg-accent" : "bg-warning",
                )}
                style={{ transform: `scaleX(${ready ? share : 0})` }}
              />
            </div>
          </div>
        );
      })}
    </dl>
  );
}
