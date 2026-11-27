"use client";

import Link from "next/link";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { ArrowRight, Check, Minus } from "lucide-react";
import type { Evaluation, NextMission } from "@/lib/types/learning";
import type { Rubric } from "@/lib/types/curriculum";
import { Badge, Button } from "@/components/ui";
import { ScoreRing } from "@/components/shared/score-ring";
import { DimensionBars } from "@/components/shared/dimension-bars";
import { humanise } from "@/lib/client/format";
import { EASE_OUT } from "@/lib/client/motion";

/** Sections arrive one after another: verdict, rubric, then each feedback block. */
const SECTIONS: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.14, delayChildren: 0.05 } },
};
const SECTION: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_OUT, staggerChildren: 0.05, delayChildren: 0.1 } },
};
const ROW: Variants = {
  hidden: { opacity: 0, x: -6 },
  show: { opacity: 1, x: 0, transition: { duration: 0.32, ease: EASE_OUT } },
};

export interface MisconceptionLookup {
  [id: string]: { label: string; correction: string };
}

interface Props {
  evaluation: Evaluation;
  rubric?: Rubric;
  hintsUsed: number;
  nextMission?: NextMission | null;
  misconceptions?: MisconceptionLookup;
  skillNames?: Record<string, string>;
  /** when set, "Next challenge" is replaced with this link (landing preview) */
  ctaOverride?: { href: string; label: string };
}

export function EvaluationPanel({
  evaluation,
  rubric,
  hintsUsed,
  nextMission,
  misconceptions = {},
  skillNames = {},
  ctaOverride,
}: Props) {
  const e = evaluation;
  const reduce = useReducedMotion() ?? false;
  return (
    <motion.div
      className="space-y-6"
      aria-live="polite"
      variants={SECTIONS}
      initial={reduce ? false : "hidden"}
      animate="show"
    >
      <motion.div
        variants={SECTION}
        className="space-y-4 rounded-lg border border-line bg-surface p-4 shadow-sm inset-shadow-[0_1px_0_rgb(255_255_255/0.04)] sm:p-5"
      >
        <div className="flex items-center gap-5">
          <ScoreRing value={e.totalScore} size={120} />
          <div className="min-w-0 space-y-2">
            <h3 className="text-xl font-semibold leading-snug tracking-tight text-balance">
              {e.totalScore >= 80 ? "Strong answer" : e.totalScore >= 60 ? "Solid, with gaps" : "Keep working on this"}
            </h3>
            <Badge tone={e.evaluatorMode === "llm" ? "info" : "neutral"}>
              {e.evaluatorMode === "llm" ? "Graded with AI + rules" : "Graded by rules only"}
            </Badge>
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-sm leading-relaxed">{e.explanation}</p>
          {hintsUsed > 0 ? (
            <p className="text-xs text-muted">
              You used {hintsUsed} hint{hintsUsed === 1 ? "" : "s"}. Hints lower the score a little so that unaided answers count for more.
            </p>
          ) : null}
          {e.evaluatorMode === "rules" ? (
            <p className="text-xs text-muted">
              Rules-only grading checks key points, cited evidence and hedging language. It cannot judge nuance, so a careful answer may score lower than it deserves.
            </p>
          ) : null}
        </div>
      </motion.div>

      <motion.div variants={SECTION}>
        <DimensionBars scores={e.rubricScores} rubric={rubric} />
      </motion.div>

      <motion.div variants={SECTION} className="grid gap-5 md:grid-cols-2">
        <ListBlock
          title="What you got right"
          items={e.correctReasoning}
          empty="Nothing matched the expected reasoning yet."
          icon={<Check className="size-4 text-success" aria-hidden="true" />}
        />
        <ListBlock
          title="Evidence you did not use"
          items={e.missingEvidence}
          empty="You covered the evidence that mattered."
          icon={<Minus className="size-4 text-warning" aria-hidden="true" />}
        />
      </motion.div>

      {e.misconceptionIds.length > 0 ? (
        <motion.div variants={SECTION}>
          <h4 className="text-sm font-semibold">Ideas to unlearn</h4>
          <ul className="mt-2 space-y-2">
            {e.misconceptionIds.map((id) => {
              const m = misconceptions[id];
              return (
                <motion.li key={id} variants={ROW} className="rounded-md border border-line bg-surface p-3 text-sm">
                  <p className="font-medium">{m?.label ?? humanise(id)}</p>
                  {m?.correction ? <p className="mt-1 leading-relaxed text-muted">{m.correction}</p> : null}
                </motion.li>
              );
            })}
          </ul>
        </motion.div>
      ) : null}

      {e.followUp ? (
        <motion.div variants={SECTION} className="rounded-lg border border-learner-line bg-learner-soft p-4 text-sm">
          <p className="font-medium">Think about this next</p>
          <p className="mt-1 leading-relaxed">{e.followUp}</p>
        </motion.div>
      ) : null}

      {e.recommendedReviewSkillIds.length > 0 ? (
        <motion.div variants={SECTION} className="text-sm">
          <span className="text-muted">Worth reviewing: </span>
          {e.recommendedReviewSkillIds.map((id, i) => (
            <span key={id}>
              {i > 0 ? ", " : ""}
              <Link href={`/app/coach?skill=${encodeURIComponent(id)}`} className="text-accent underline-offset-4 hover:underline">
                {skillNames[id] ?? humanise(id)}
              </Link>
            </span>
          ))}
        </motion.div>
      ) : null}

      {ctaOverride ? (
        <motion.div variants={SECTION}>
          <Button asChild size="lg">
            <Link href={ctaOverride.href}>
              {ctaOverride.label}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        </motion.div>
      ) : nextMission ? (
        <motion.div
          variants={SECTION}
          className="flex flex-col gap-3 rounded-lg border border-line-strong bg-surface-raised p-4 shadow-[inset_0_1px_0_rgb(255_255_255/0.04)] sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="text-sm font-medium">Next: {nextMission.title}</p>
            <p className="text-xs text-muted">{nextMission.reason}</p>
          </div>
          <Button asChild>
            <Link href={nextMission.href}>
              Next challenge
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        </motion.div>
      ) : null}
    </motion.div>
  );
}

function ListBlock({
  title,
  items,
  empty,
  icon,
}: {
  title: string;
  items: string[];
  empty: string;
  icon: React.ReactNode;
}) {
  return (
    <div>
      <h4 className="text-sm font-semibold">{title}</h4>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-muted">{empty}</p>
      ) : (
        <ul className="mt-2 space-y-1.5 text-sm">
          {items.map((item, i) => (
            <motion.li key={i} variants={ROW} className="flex gap-2 leading-snug">
              <span className="mt-0.5 shrink-0">{icon}</span>
              <span>{item}</span>
            </motion.li>
          ))}
        </ul>
      )}
    </div>
  );
}
