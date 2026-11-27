"use client";

/**
 * Hero visual built from the real product components (evidence card, score
 * ring, rubric bars) fed with the clearly labelled sample pack. Nothing here is
 * a drawing of the UI; it is the UI, marked "Demo data" and "Sample".
 *
 * Storyboard (ms from mount)
 *      0  hero copy rises (CSS, landing page)
 *    180  evidence frame rises
 *    520  graded result rises over the frame's lower-right corner (clear of the source tag)
 *    600  score rolls up, rubric bars fill one by one
 */
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui";
import { EtfFlowCard } from "@/components/evidence/etf-flow-card";
import { ScoreRing } from "@/components/shared/score-ring";
import { DimensionBars } from "@/components/shared/dimension-bars";
import { SAMPLE_EVALUATION, SAMPLE_PACK } from "./sample-scenario";

const TIMING = { frame: 180, result: 520, score: 600 } as const;

export function HeroPreview() {
  const [scored, setScored] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setScored(true), TIMING.score);
    return () => window.clearTimeout(id);
  }, []);
  const series = SAMPLE_PACK.etfFlows[0];
  const e = SAMPLE_EVALUATION;

  return (
    <div className="relative" aria-label="Sample of a graded scenario" role="group">
      <div
        className="animate-rise-in rounded-lg border border-line bg-surface-sunken p-1.5 shadow-md"
        style={{ animationDelay: `${TIMING.frame}ms`, animationDuration: "700ms" }}
      >
        <div className="rounded-md bg-bg p-3 sm:p-4">
          <p className="mb-3 text-sm text-muted">
            <span className="text-fg">Evidence</span> · BTC spot ETFs, last 12 trading days
          </p>
          <EtfFlowCard series={series} />
        </div>
      </div>

      <div
        className="surface-glass animate-rise-in relative mt-4 rounded-lg border border-learner-line p-4 sm:ml-auto sm:w-[20rem] lg:-mr-6 lg:-mt-14"
        style={{ animationDelay: `${TIMING.result}ms`, animationDuration: "700ms" }}
      >
        <div className="flex items-center gap-4">
          {scored ? <ScoreRing value={e.totalScore} size={76} /> : <div className="size-[76px]" aria-hidden="true" />}
          <div className="min-w-0 space-y-1.5">
            <p className="text-base font-semibold leading-snug">Solid, with gaps</p>
            <Badge tone="warning">Sample</Badge>
          </div>
        </div>
        <div className="mt-4 min-h-[9.5rem]">{scored ? <DimensionBars scores={e.rubricScores} /> : null}</div>
      </div>
    </div>
  );
}
