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
 *   1400  graded result starts a slow float; the whole preview tilts toward the pointer
 */
import { useEffect, useState } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
import { Badge } from "@/components/ui";
import { EtfFlowCard } from "@/components/evidence/etf-flow-card";
import { ScoreRing } from "@/components/shared/score-ring";
import { DimensionBars } from "@/components/shared/dimension-bars";
import { SAMPLE_EVALUATION, SAMPLE_PACK } from "./sample-scenario";

const TIMING = { frame: 180, result: 520, score: 600 } as const;
const TILT_SPRING = { stiffness: 140, damping: 18, mass: 0.6 } as const;

export function HeroPreview() {
  const [scored, setScored] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setScored(true), TIMING.score);
    return () => window.clearTimeout(id);
  }, []);
  const series = SAMPLE_PACK.etfFlows[0];
  const e = SAMPLE_EVALUATION;

  const reduce = useReducedMotion();
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-4.5, 4.5]), TILT_SPRING);
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [3.5, -3.5]), TILT_SPRING);
  const lift = useSpring(useTransform(px, [-0.5, 0.5], [-8, 8]), TILT_SPRING);

  function onPointerMove(ev: React.PointerEvent<HTMLDivElement>) {
    if (reduce || ev.pointerType !== "mouse") return;
    const r = ev.currentTarget.getBoundingClientRect();
    px.set((ev.clientX - r.left) / r.width - 0.5);
    py.set((ev.clientY - r.top) / r.height - 0.5);
  }
  function onPointerLeave() {
    px.set(0);
    py.set(0);
  }

  return (
    <div
      className="relative [perspective:1400px]"
      aria-label="Sample of a graded scenario"
      role="group"
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
    >
      <motion.div style={{ rotateX, rotateY }} className="will-change-transform">
        <div
          className="animate-rise-in rounded-xl border border-line-strong bg-surface-sunken p-1.5 shadow-md"
          style={{ animationDelay: `${TIMING.frame}ms`, animationDuration: "800ms" }}
        >
          <div className="rounded-lg bg-bg p-3 shadow-[inset_0_1px_0_rgb(255_255_255/0.04)] sm:p-5">
            <p className="mb-3 text-sm text-muted">
              <span className="font-medium text-fg">Evidence</span> · BTC spot ETFs, last 12 trading days
            </p>
            <EtfFlowCard series={series} />
          </div>
        </div>

        <div
          className="animate-rise-in relative mt-4 sm:ml-auto sm:w-[21rem] lg:-mr-8 lg:-mt-16"
          style={{ animationDelay: `${TIMING.result}ms`, animationDuration: "800ms" }}
        >
          <motion.div style={{ x: lift }}>
            <motion.div
              className="surface-glass rounded-xl border border-learner-line p-4 sm:p-5"
              animate={reduce ? undefined : { y: [0, -7, 0] }}
              transition={{ duration: 6.5, ease: "easeInOut", repeat: Infinity, delay: 1.4 }}
            >
              <div className="flex items-center gap-4">
                {scored ? <ScoreRing value={e.totalScore} size={76} /> : <div className="size-[76px]" aria-hidden="true" />}
                <div className="min-w-0 space-y-1.5">
                  <p className="text-base font-semibold leading-snug">Solid, with gaps</p>
                  <Badge tone="warning">Sample</Badge>
                </div>
              </div>
              <div className="mt-4 min-h-[9.5rem]">{scored ? <DimensionBars scores={e.rubricScores} /> : null}</div>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
