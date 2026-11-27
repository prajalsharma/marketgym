"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Check, RotateCcw } from "lucide-react";
import type { KnowledgeCheck as KnowledgeCheckType, Skill } from "@/lib/types/curriculum";
import type { MasteryRecord, Review } from "@/lib/types/learning";
import type { ReviewSubmitResponse } from "@/lib/types/api";
import { Button, MasteryIndicator } from "@/components/ui";
import { KnowledgeCheck } from "@/components/learn/knowledge-check";
import { apiPost } from "@/lib/client/api";
import { formatRelative } from "@/lib/client/format";
import { EASE_OUT, TIMING, spring } from "@/lib/client/motion";
import { cn } from "@/lib/utils";

interface Props {
  review: Review;
  skill: Skill;
  check: KnowledgeCheckType;
  previousMastery: MasteryRecord | null;
}

/** One retention check for a scheduled review; shows the result and the mastery change. */
export function ReviewFlow({ review, skill, check, previousMastery }: Props) {
  const reduce = useReducedMotion();
  const [result, setResult] = useState<ReviewSubmitResponse | null>(null);

  const passed = result?.review.result === "passed";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <motion.header
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduce ? { duration: 0 } : { duration: TIMING.pageRise, ease: EASE_OUT }}
        className="space-y-2"
      >
        <p className="flex items-center gap-1.5 text-sm text-muted">
          <RotateCcw className="size-3.5 text-accent" aria-hidden="true" />
          Retention review · scheduled {formatRelative(review.scheduledAt)}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-fg text-balance sm:text-3xl">{skill.name}</h1>
        <p className="max-w-prose text-sm leading-relaxed text-muted sm:text-base">{skill.description}</p>
        {previousMastery ? (
          <div className="pt-1">
            <MasteryIndicator status={previousMastery.masteryStatus} score={previousMastery.masteryScore} size="sm" />
          </div>
        ) : null}
      </motion.header>

      <motion.div
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduce ? { duration: 0 } : { duration: TIMING.pageRise, ease: EASE_OUT, delay: TIMING.stagger * 2 }}
      >
        <KnowledgeCheck
          check={check}
          title="Answer without looking anything up"
          onSubmit={async (optionId) => {
            const res = await apiPost<ReviewSubmitResponse>("/api/learning/review", {
              reviewId: review.id,
              knowledgeCheckId: check.id,
              optionId,
            });
            setResult(res);
            return { correct: res.correct, explanation: res.explanation };
          }}
        />
      </motion.div>

      <AnimatePresence initial={false}>
        {result ? (
          <motion.div
            key="outcome"
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduce ? { duration: 0 } : spring.gentle}
            className={cn(
              "space-y-5 rounded-lg border bg-surface p-5 shadow-[inset_0_1px_0_rgb(255_255_255/0.04)]",
              passed ? "border-success/50" : "border-warning/50",
            )}
          >
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full",
                  passed ? "bg-success-soft text-success" : "bg-warning-soft text-warning",
                )}
                aria-hidden="true"
              >
                {passed ? <Check className="size-4" /> : <RotateCcw className="size-4" />}
              </span>
              <p className="text-lg font-semibold leading-snug text-fg">
                {result.review.result === "passed" ? "Review passed." : "Review not passed. It will come back sooner."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-md border border-line bg-surface-sunken px-4 py-3 text-sm">
              <div>
                <p className="mb-1 text-xs text-muted">Before</p>
                {previousMastery ? (
                  <MasteryIndicator status={previousMastery.masteryStatus} score={previousMastery.masteryScore} size="sm" />
                ) : (
                  <p className="text-muted">No record</p>
                )}
              </div>
              <ArrowRight className="size-4 text-subtle" aria-hidden="true" />
              <div>
                <p className="mb-1 text-xs text-muted">After</p>
                <MasteryIndicator status={result.mastery.masteryStatus} score={result.mastery.masteryScore} size="sm" />
              </div>
              {result.mastery.nextReviewAt ? (
                <p className="text-xs text-muted sm:ml-auto">Next review {formatRelative(result.mastery.nextReviewAt)}</p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href="/app">Back to overview</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href={`/app/coach?skill=${encodeURIComponent(skill.id)}`}>Go over this with the coach</Link>
              </Button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
