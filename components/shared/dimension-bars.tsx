"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { Rubric } from "@/lib/types/curriculum";
import type { RubricScores } from "@/lib/types/learning";
import { RUBRIC_LABEL } from "@/lib/client/labels";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { EASE_OUT, TIMING } from "@/lib/client/motion";
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

/** Seconds before the first bar starts, then the gap between bars. */
const FIRST_BAR = 0.35;
const BAR_GAP = 0.16;

/** Four rubric dimensions as labelled bars with points out of max. Bars fill one after another. */
export function DimensionBars({ scores, rubric, className }: Props) {
  const reduce = useReducedMotion() ?? false;

  return (
    <dl className={cn("space-y-3.5", className)}>
      {ORDER.map((key, i) => {
        const max = rubric?.dimensions.find((d) => d.key === key)?.maxPoints ?? DEFAULT_MAX[key];
        const label = rubric?.dimensions.find((d) => d.key === key)?.label ?? RUBRIC_LABEL[key];
        const value = Math.max(0, Math.min(max, scores[key]));
        const share = max > 0 ? value / max : 0;
        const delay = FIRST_BAR + i * BAR_GAP;
        return (
          <motion.div
            key={key}
            initial={reduce ? false : { opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, ease: EASE_OUT, delay: delay - 0.12 }}
          >
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <dt className="font-medium">{label}</dt>
              <dd className="font-mono tabular-nums text-muted">
                <AnimatedNumber value={Math.round(value)} countUp className="text-fg" /> / {max}
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
              <motion.div
                className={cn(
                  "h-full origin-left rounded-full",
                  share >= 0.8 ? "bg-success" : share >= 0.5 ? "bg-accent" : "bg-warning",
                )}
                initial={reduce ? false : { scaleX: 0 }}
                animate={{ scaleX: share }}
                transition={reduce ? { duration: 0 } : { duration: TIMING.barFill, ease: EASE_OUT, delay }}
              />
            </div>
          </motion.div>
        );
      })}
    </dl>
  );
}
