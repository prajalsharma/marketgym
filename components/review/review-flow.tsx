"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import type { KnowledgeCheck as KnowledgeCheckType, Skill } from "@/lib/types/curriculum";
import type { MasteryRecord, Review } from "@/lib/types/learning";
import type { ReviewSubmitResponse } from "@/lib/types/api";
import { Button, MasteryIndicator } from "@/components/ui";
import { KnowledgeCheck } from "@/components/learn/knowledge-check";
import { apiPost } from "@/lib/client/api";
import { formatRelative } from "@/lib/client/format";

interface Props {
  review: Review;
  skill: Skill;
  check: KnowledgeCheckType;
  previousMastery: MasteryRecord | null;
}

/** One retention check for a scheduled review; shows the result and the mastery change. */
export function ReviewFlow({ review, skill, check, previousMastery }: Props) {
  const [result, setResult] = useState<ReviewSubmitResponse | null>(null);

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <p className="text-xs text-muted">Retention review · scheduled {formatRelative(review.scheduledAt)}</p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">{skill.name}</h1>
        <p className="mt-1 text-sm text-muted">{skill.description}</p>
        {previousMastery ? (
          <div className="mt-3">
            <MasteryIndicator status={previousMastery.masteryStatus} score={previousMastery.masteryScore} size="sm" />
          </div>
        ) : null}
      </div>

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

      {result ? (
        <div className="eval-reveal space-y-4 rounded-lg border border-line bg-surface p-4">
          <p className="text-sm font-medium">{result.review.result === "passed" ? "Review passed." : "Review not passed. It will come back sooner."}</p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <div>
              <p className="text-xs text-muted">Before</p>
              {previousMastery ? (
                <MasteryIndicator status={previousMastery.masteryStatus} score={previousMastery.masteryScore} size="sm" />
              ) : (
                <p className="text-muted">No record</p>
              )}
            </div>
            <ArrowRight className="size-4 text-subtle" aria-hidden="true" />
            <div>
              <p className="text-xs text-muted">After</p>
              <MasteryIndicator status={result.mastery.masteryStatus} score={result.mastery.masteryScore} size="sm" />
            </div>
            {result.mastery.nextReviewAt ? (
              <p className="text-xs text-muted">Next review {formatRelative(result.mastery.nextReviewAt)}</p>
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
        </div>
      ) : null}
    </div>
  );
}
